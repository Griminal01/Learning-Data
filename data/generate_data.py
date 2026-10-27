"""
Synthetic practice data for the Line D data skills course.

Simulates two years (1 Jul 2024 - 30 Jun 2026) of maintenance on a fictional
seven-zone cereal line: ~300 assets, PM schedules, PM/reactive/corrective work
orders, downtime events, plus vibration data for Phases 4-6.

Failures follow a Weibull renewal process per asset type, completed PMs reset or
reduce asset age, and late or missed PMs therefore cause more breakdowns, so the
patterns you find in later phases are real, not random noise.

Standard library only, so it runs on any Python 3.9+:
    python generate_data.py
Same seed = same data every time, so lesson answers match your results.
"""

import csv
import math
import os
import random
import sqlite3
from datetime import date, datetime, timedelta

SEED = 42
START = date(2024, 7, 1)
END = date(2026, 6, 30)
OUT = os.path.dirname(os.path.abspath(__file__))

ZONES = [
    ("COK", "Cooking"),
    ("DRY", "Drying"),
    ("FLK", "Flaking"),
    ("FRM", "Forming"),
    ("BAK", "Baking"),
    ("PPK", "Primary Packing"),
    ("EOL", "End of Line"),
]

# Chance a PM is done on or before its due date, per zone. Packing is weaker on
# purpose so the data has a story to find.
ZONE_ON_TIME = {"COK": 0.88, "DRY": 0.86, "FLK": 0.84, "FRM": 0.82, "BAK": 0.87, "PPK": 0.66, "EOL": 0.74}

# Each asset type has competing failure modes, each with its own Weibull shape
# (beta), characteristic life (eta, days) and mean repair time (hours). The asset
# fails on whichever mode runs out first; repairing it renews that mode only.
#   beta < 1  infant mortality / random-ish electronics
#   beta ~ 1  random
#   beta > 1  wear-out (the only modes time-based replacement can help)
# PM entries: (description, frequency days, task type, effect, target modes)
#   replace  renews the target modes
#   lube     takes 40% of the age off the target modes
#   inspect  may catch any wear-out mode close to failure -> planned corrective job
#   none     no effect on failures (compliance/calibration tasks)
M = lambda code, beta, eta, mttr: (code, beta, eta, mttr)
TYPES = {
    "MTR": ("Drive motor", [M("Electrical - motor", 0.9, 1500, 3.0), M("Mechanical - bearing", 2.2, 500, 2.5)],
            [("Motor visual inspection & temperature check", 28, "Inspection", "inspect", []),
             ("Grease motor bearings", 91, "Lubrication", "lube", ["Mechanical - bearing"])]),
    "GBX": ("Gearbox", [M("Mechanical - gears", 2.8, 900, 6.0), M("Mechanical - bearing", 2.4, 600, 4.0), M("Lubrication", 1.0, 1200, 2.0)],
            [("Check gearbox oil level & leaks", 28, "Inspection", "inspect", []),
             ("Gearbox oil change", 182, "Lubrication", "lube", ["Mechanical - gears", "Mechanical - bearing"])]),
    "CNV": ("Conveyor", [M("Mechanical - belt/chain", 2.6, 200, 1.5), M("Mechanical - bearing", 2.0, 400, 1.5), M("Electrical - sensor", 0.9, 500, 0.7)],
            [("Conveyor belt tension & tracking check", 14, "Inspection", "inspect", []),
             ("Replace conveyor belt", 182, "Replacement", "replace", ["Mechanical - belt/chain"])]),
    "PMP": ("Pump", [M("Mechanical - seal", 2.5, 300, 3.0), M("Mechanical - bearing", 2.0, 600, 3.0), M("Electrical - motor", 0.9, 1500, 3.0)],
            [("Pump seal & vibration check", 28, "Inspection", "inspect", []),
             ("Replace pump mechanical seal", 365, "Replacement", "replace", ["Mechanical - seal"])]),
    "FAN": ("Fan", [M("Mechanical - bearing", 2.6, 350, 3.0), M("Mechanical - imbalance", 1.5, 600, 2.0), M("Electrical - motor", 0.9, 1500, 3.0)],
            [("Fan bearing vibration reading", 28, "Condition Monitoring", "inspect", []),
             ("Grease fan bearings", 91, "Lubrication", "lube", ["Mechanical - bearing"])]),
    "BRN": ("Burner", [M("Combustion - ignition", 1.0, 250, 2.0), M("Electrical - sensor", 0.9, 500, 1.5), M("Control - flame safeguard", 0.8, 900, 3.0)],
            [("Burner ignition & flame check", 28, "Inspection", "inspect", [])]),
    "SNS": ("Sensor / transmitter", [M("Electrical - sensor", 0.9, 400, 1.0), M("Control - PLC/IO", 0.8, 900, 1.5)],
            [("Calibrate transmitter", 182, "Inspection", "none", [])]),
    "SRV": ("Servo drive", [M("Electrical - drive fault", 1.0, 450, 2.0), M("Mechanical - cooling fan", 2.0, 600, 1.0)],
            [("Servo drive fan & fault log check", 91, "Inspection", "inspect", [])]),
    "ROL": ("Flaking roll", [M("Mechanical - bearing", 3.0, 260, 6.0), M("Mechanical - roll wear", 3.5, 140, 5.0)],
            [("Flaking roll gap & bearing temperature check", 14, "Inspection", "inspect", []),
             ("Regrind / swap flaking roll", 120, "Replacement", "replace", ["Mechanical - roll wear"])]),
    "HPU": ("Hydraulic power unit", [M("Hydraulic leak", 1.6, 300, 2.0), M("Mechanical - pump", 2.2, 700, 4.0)],
            [("HPU oil level, filter & leak check", 28, "Inspection", "inspect", []),
             ("Change HPU filter", 182, "Replacement", "replace", ["Mechanical - pump"])]),
    "PNU": ("Pneumatic cylinder", [M("Pneumatic leak", 1.8, 250, 0.7), M("Mechanical - seal", 2.0, 400, 0.8)],
            [("Pneumatic leak check", 28, "Inspection", "inspect", [])]),
    "VAC": ("Vacuum pump", [M("Mechanical - vanes", 3.0, 300, 2.5), M("Mechanical - bearing", 2.0, 500, 2.5)],
            [("Vacuum pump filter & vane check", 56, "Inspection", "inspect", []),
             ("Replace vacuum pump vanes", 240, "Replacement", "replace", ["Mechanical - vanes"])]),
    # The flow wrapper jaw interval (182 d) is deliberately far too long for a
    # mode with beta 3 / eta 75 d: the Phase 5 Weibull study should find this.
    "FWR": ("Flow wrapper", [M("Mechanical - jaws", 3.0, 75, 1.2), M("Electrical - sensor", 0.9, 150, 0.8),
                             M("Operational - jam", 1.0, 60, 0.5), M("Electrical - drive fault", 1.0, 400, 2.0)],
            [("Flow wrapper jaw & knife inspection", 7, "Inspection", "inspect", []),
             ("Replace sealing jaws", 182, "Replacement", "replace", ["Mechanical - jaws"])]),
    "CTN": ("Carton erector", [M("Mechanical - suction cups", 2.5, 120, 0.8), M("Pneumatic leak", 1.8, 250, 0.7), M("Operational - jam", 1.0, 90, 0.5)],
            [("Carton erector suction cup & glue check", 7, "Inspection", "inspect", []),
             ("Replace suction cups", 91, "Replacement", "replace", ["Mechanical - suction cups"])]),
    "CHK": ("Checkweigher", [M("Electrical - load cell", 0.9, 500, 1.0), M("Control - PLC/IO", 0.8, 900, 1.0)],
            [("Checkweigher calibration check", 7, "Inspection", "none", [])]),
    "MDT": ("Metal detector", [M("Electrical - sensor", 0.9, 700, 1.0)],
            [("Metal detector test-piece verification", 1, "Inspection", "none", [])]),
    "CSP": ("Case packer", [M("Mechanical - grippers", 2.4, 160, 1.5), M("Pneumatic leak", 1.8, 250, 0.7),
                            M("Operational - jam", 1.0, 80, 0.5), M("Electrical - sensor", 0.9, 300, 0.7)],
            [("Case packer gripper & guide inspection", 14, "Inspection", "inspect", []),
             ("Case packer overhaul", 365, "Replacement", "replace", ["Mechanical - grippers"])]),
    "PAL": ("Palletiser", [M("Mechanical - chain", 2.8, 300, 3.0), M("Electrical - sensor", 0.9, 250, 1.0), M("Control - PLC/IO", 0.8, 600, 2.0)],
            [("Palletiser chain & safety circuit check", 14, "Inspection", "inspect", []),
             ("Replace palletiser lift chain", 365, "Replacement", "replace", ["Mechanical - chain"])]),
    "STW": ("Stretch wrapper", [M("Mechanical - film carriage", 1.8, 250, 1.2), M("Electrical - sensor", 0.9, 300, 0.8)],
            [("Stretch wrapper film carriage check", 28, "Inspection", "inspect", [])]),
    "LPA": ("Label printer applicator", [M("Electrical - printhead", 2.0, 120, 0.8), M("Operational - jam", 1.0, 100, 0.5)],
            [("Clean printhead & check applicator", 7, "Inspection", "none", [])]),
    "RVL": ("Rotary valve", [M("Mechanical - rotor wear", 3.0, 450, 2.0), M("Mechanical - bearing", 2.0, 600, 2.0)],
            [("Rotary valve clearance check", 56, "Inspection", "inspect", [])]),
}
# Extra mode for recently installed kit: classic infant mortality
INSTALL_DEFECT = M("Installation defect", 0.5, 400, 2.5)

# How many of each type sit in each zone (about 300 in total).
ZONE_MIX = {
    "COK": {"MTR": 10, "GBX": 6, "CNV": 10, "PMP": 8, "SNS": 7, "PNU": 2},
    "DRY": {"MTR": 8, "FAN": 10, "BRN": 4, "CNV": 8, "SNS": 8, "RVL": 5},
    "FLK": {"MTR": 8, "ROL": 10, "HPU": 4, "CNV": 8, "GBX": 6, "SNS": 6},
    "FRM": {"MTR": 6, "SRV": 10, "CNV": 10, "VAC": 4, "PNU": 10, "SNS": 4},
    "BAK": {"MTR": 6, "BRN": 8, "FAN": 8, "CNV": 6, "GBX": 4, "SNS": 10},
    "PPK": {"FWR": 6, "CTN": 3, "CHK": 3, "MDT": 3, "CNV": 12, "SRV": 10, "PNU": 6},
    "EOL": {"CSP": 3, "PAL": 2, "STW": 2, "LPA": 3, "CNV": 14, "MTR": 6, "PNU": 5},
}

CRITICALITY_WEIGHTS = {"A": 0.25, "B": 0.45, "C": 0.30}
MANUFACTURERS = ["Northgate", "Brightwell", "Kestrel Drives", "Halden", "Ostberg", "Marlow Pack", "Ridgeline"]
TECHS = [f"T{n:02d}" for n in range(1, 13)]
SHIFTS = ["A", "B", "C", "D"]
MINOR_STOP_CAUSES = {
    "pack": ["Jam / blockage", "Sensor misread", "Film / carton misfeed", "Guard door opened"],
    "process": ["Product build-up", "Blockage", "Sensor misread", "Guard door opened"],
}


def iso(d):
    return d.isoformat() if d else ""


def daterange(a, b):
    for n in range((b - a).days + 1):
        yield a + timedelta(days=n)


def weibull(rng, eta, beta):
    return rng.weibullvariate(eta, beta)


def build_assets(rng):
    assets = []
    for zcode, zname in ZONES:
        n = 0
        for tcode, count in ZONE_MIX[zcode].items():
            tname = TYPES[tcode][0]
            for i in range(count):
                n += 1
                crit = rng.choices(list(CRITICALITY_WEIGHTS), weights=CRITICALITY_WEIGHTS.values())[0]
                # A handful of recently installed assets show infant mortality
                new_install = rng.random() < 0.06
                install = (START + timedelta(days=rng.randint(30, 300))) if new_install else date(rng.randint(2008, 2022), rng.randint(1, 12), 1)
                assets.append({
                    "asset_id": f"LD-{zcode}-{n:03d}",
                    "asset_name": f"{zname} {tname} {i + 1}",
                    "zone_code": zcode,
                    "zone": zname,
                    "asset_type": tname,
                    "type_code": tcode,
                    "criticality": crit,
                    "manufacturer": rng.choice(MANUFACTURERS),
                    "install_date": install,
                    "_new": new_install,
                })
    return assets


def build_pm_tasks(assets, rng):
    tasks = []
    n = 0
    for a in assets:
        for desc, freq, ttype, effect, targets in TYPES[a["type_code"]][2]:
            # Daily tasks are operator checks, keep them off the maintenance schedule
            if freq == 1:
                continue
            n += 1
            tasks.append({
                "pm_id": f"PM-{n:05d}",
                "asset_id": a["asset_id"],
                "task_description": desc,
                "task_type": ttype,
                "frequency_days": freq,
                "est_minutes": {"Inspection": 30, "Lubrication": 45, "Condition Monitoring": 20, "Replacement": 180}[ttype],
                "_effect": effect,
                "_targets": targets,
                # Spread first due dates so the schedule isn't lumpy
                "_first_due": START + timedelta(days=rng.randint(0, freq - 1)),
            })
    return tasks


def simulate(assets, tasks, rng):
    """Day-by-day simulation per asset. Returns (work_orders, downtime_events)."""
    tasks_by_asset = {}
    for t in tasks:
        tasks_by_asset.setdefault(t["asset_id"], []).append(t)

    wos, dts = [], []
    for a in assets:
        tname, modes, _ = TYPES[a["type_code"]]
        modes = list(modes) + ([INSTALL_DEFECT] if a["_new"] else [])
        start_day = max(START, a["install_date"])
        # Per-mode state: [age, life]. Old kit starts part-way through its life.
        state = {}
        for code, beta, eta, _ in modes:
            age = 0.0 if a["_new"] else rng.uniform(0, eta * 0.8)
            life = age + weibull(rng, eta, beta) if beta < 1.05 else weibull(rng, eta, beta)
            while life <= age:
                life = weibull(rng, eta, beta)
            state[code] = [age, life]
        spec = {m[0]: m for m in modes}

        def renew(code):
            _, beta, eta, _ = spec[code]
            state[code] = [0.0, weibull(rng, eta, beta)]

        # Build the PM due dates and decide when each one actually gets done.
        pm_events = {}  # completion day -> list of (task, wo)
        for t in tasks_by_asset.get(a["asset_id"], []):
            due = t["_first_due"]
            while due < start_day:
                due += timedelta(days=t["frequency_days"])
            while due <= END:
                r = rng.random()
                on_time_p = ZONE_ON_TIME[a["zone_code"]]
                if r < on_time_p:
                    done = due - timedelta(days=rng.randint(0, min(3, t["frequency_days"] // 3)))
                    status = "Completed"
                elif r < 0.95:
                    late_cap = max(2, min(45, t["frequency_days"]))
                    done = due + timedelta(days=rng.randint(1, late_cap))
                    status = "Completed"
                else:
                    done = None
                    status = "Cancelled"
                if done and done > END:
                    done, status = None, "Open"
                wo = {
                    "asset_id": a["asset_id"], "pm_id": t["pm_id"], "wo_type": "PM", "priority": 3,
                    "description": t["task_description"], "failure_code": "",
                    "raised": datetime.combine(max(START, due - timedelta(days=min(7, t["frequency_days"]))), datetime.min.time()) + timedelta(hours=6),
                    "due_date": due, "completed_date": done, "status": status,
                    "labour_hours": round(t["est_minutes"] / 60 * rng.uniform(0.7, 1.5), 2) if done else 0.0,
                    "technician": rng.choice(TECHS) if done else "", "shift": rng.choice(SHIFTS) if done else "",
                }
                wos.append(wo)
                if done:
                    pm_events.setdefault(done, []).append((t, wo))
                due += timedelta(days=t["frequency_days"])

        prio = {"A": 1, "B": 2, "C": 3}[a["criticality"]]
        for day in daterange(start_day, END):
            for st in state.values():
                st[0] += 1
            for t, _wo in pm_events.get(day, []):
                eff = t["_effect"]
                if eff == "replace":
                    for code in t["_targets"]:
                        renew(code)
                elif eff == "lube":
                    for code in t["_targets"]:
                        state[code][0] *= 0.6
                elif eff == "inspect":
                    for code, (age, life) in list(state.items()):
                        if spec[code][1] > 1.4 and age > 0.85 * life and rng.random() < 0.35:
                            # Inspection caught it: planned corrective job instead of a breakdown
                            hrs = round(rng.lognormvariate(math.log(spec[code][3] * 0.8), 0.4), 2)
                            cdate = min(END, day + timedelta(days=rng.randint(1, 10)))
                            wos.append({
                                "asset_id": a["asset_id"], "pm_id": t["pm_id"], "wo_type": "Corrective", "priority": 2,
                                "description": f"Found on PM: {code.split(' - ')[-1]} - planned repair",
                                "failure_code": code,
                                "raised": datetime.combine(day, datetime.min.time()) + timedelta(hours=rng.randint(7, 20)),
                                "due_date": cdate, "completed_date": cdate, "status": "Completed", "labour_hours": hrs,
                                "technician": rng.choice(TECHS), "shift": rng.choice(SHIFTS),
                            })
                            renew(code)
            for code, (age, life) in list(state.items()):
                if age < life:
                    continue
                when = datetime.combine(day, datetime.min.time()) + timedelta(minutes=rng.randint(0, 1439))
                hrs = round(rng.lognormvariate(math.log(spec[code][3]), 0.6), 2)
                wo = {
                    "asset_id": a["asset_id"], "pm_id": "", "wo_type": "Reactive", "priority": prio,
                    "description": f"Breakdown: {code.split(' - ')[-1]}", "failure_code": code,
                    "raised": when, "due_date": None, "completed_date": (when + timedelta(hours=hrs)).date(),
                    "status": "Completed", "labour_hours": round(hrs * rng.uniform(1.0, 1.6), 2),
                    "technician": rng.choice(TECHS), "shift": rng.choice(SHIFTS),
                }
                if wo["completed_date"] > END:
                    wo["completed_date"], wo["status"] = None, "Open"
                wos.append(wo)
                stops_line = {"A": 1.0, "B": 0.75, "C": 0.3}[a["criticality"]]
                if rng.random() < stops_line:
                    dur = max(5, round(hrs * 60 * rng.uniform(0.8, 1.3)))
                    dts.append({"asset_id": a["asset_id"], "wo": wo, "start": when, "duration_min": dur,
                                "category": "Breakdown", "cause": code})
                renew(code)

    # Minor stops: short, frequent, no work order raised (operators clear them)
    by_zone = {}
    for a in assets:
        by_zone.setdefault(a["zone_code"], []).append(a)
    rates = {"COK": 0.3, "DRY": 0.2, "FLK": 0.5, "FRM": 1.2, "BAK": 0.3, "PPK": 3.0, "EOL": 2.0}
    for day in daterange(START, END):
        for z, rate in rates.items():
            k = sum(1 for _ in range(6) if rng.random() < rate / 6)
            for _ in range(k):
                a = rng.choice(by_zone[z])
                when = datetime.combine(day, datetime.min.time()) + timedelta(minutes=rng.randint(0, 1439))
                dts.append({"asset_id": a["asset_id"], "wo": None, "start": when,
                            "duration_min": rng.randint(2, 15), "category": "Minor stop",
                            "cause": rng.choice(MINOR_STOP_CAUSES["pack" if z in ("PPK", "EOL") else "process"])})

    wos.sort(key=lambda w: (w["raised"], w["asset_id"]))
    for i, w in enumerate(wos, start=1):
        w["wo_id"] = f"WO-{100000 + i}"
    dts.sort(key=lambda d: d["start"])
    for i, d in enumerate(dts, start=1):
        d["event_id"] = f"DT-{i:06d}"
    return wos, dts


def write_csv(path, rows, fields):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for r in rows:
            w.writerow({k: r.get(k, "") for k in fields})


def wo_row(w):
    return {
        "wo_id": w["wo_id"], "asset_id": w["asset_id"], "pm_id": w["pm_id"], "wo_type": w["wo_type"],
        "priority": w["priority"], "description": w["description"], "failure_code": w["failure_code"],
        "raised_datetime": w["raised"].strftime("%Y-%m-%d %H:%M"), "due_date": iso(w["due_date"]),
        "completed_date": iso(w["completed_date"]), "status": w["status"],
        "labour_hours": w["labour_hours"], "technician": w["technician"], "shift": w["shift"],
    }


def dt_row(d):
    end = d["start"] + timedelta(minutes=d["duration_min"])
    return {
        "event_id": d["event_id"], "asset_id": d["asset_id"], "wo_id": d["wo"]["wo_id"] if d["wo"] else "",
        "start_datetime": d["start"].strftime("%Y-%m-%d %H:%M"), "end_datetime": end.strftime("%Y-%m-%d %H:%M"),
        "duration_min": d["duration_min"], "category": d["category"], "cause": d["cause"],
    }


ASSET_F = ["asset_id", "asset_name", "zone_code", "zone", "asset_type", "criticality", "manufacturer", "install_date"]
PM_F = ["pm_id", "asset_id", "task_description", "task_type", "frequency_days", "est_minutes"]
WO_F = ["wo_id", "asset_id", "pm_id", "wo_type", "priority", "description", "failure_code", "raised_datetime",
        "due_date", "completed_date", "status", "labour_hours", "technician", "shift"]
DT_F = ["event_id", "asset_id", "wo_id", "start_datetime", "end_datetime", "duration_min", "category", "cause"]
EXPORT_F = ["WO Number", "Asset", "Asset Description", "Zone", "Criticality", "WO Type", "PM Ref", "Description",
            "Failure Code", "Raised", "Due", "Completed", "Status", "Labour Hrs", "Downtime Mins", "Technician"]


def export_row(w, asset, dt_mins):
    """Flattened 'CMMS export' layout, the kind of file you'd get out of a maintenance system."""
    fmt = lambda d: d.strftime("%d/%m/%Y") if d else ""
    return {
        "WO Number": w["wo_id"], "Asset": w["asset_id"], "Asset Description": asset["asset_name"],
        "Zone": asset["zone"], "Criticality": asset["criticality"], "WO Type": w["wo_type"], "PM Ref": w["pm_id"],
        "Description": w["description"], "Failure Code": w["failure_code"],
        "Raised": w["raised"].strftime("%d/%m/%Y %H:%M"), "Due": fmt(w["due_date"]), "Completed": fmt(w["completed_date"]),
        "Status": w["status"], "Labour Hrs": w["labour_hours"], "Downtime Mins": dt_mins.get(w["wo_id"], 0),
        "Technician": w["technician"],
    }


def dirty_export(rows, rng):
    """Break a clean export the way real exports get broken."""
    zone_variants = {"Primary Packing": ["Primary Packing", "primary packing", "Prim Pack", "Primary Packing "],
                     "End of Line": ["End of Line", "EOL", "end of line"]}
    out = []
    for r in rows:
        r = dict(r)
        x = rng.random()
        if x < 0.06:
            r["Asset"] = r["Asset"].lower()
        elif x < 0.10:
            r["Asset"] = " " + r["Asset"] + " "
        elif x < 0.13:
            r["Asset"] = r["Asset"].replace("-", "")
        elif x < 0.15:
            r["Asset"] = r["Asset"].replace("-", " ")
        if r["Zone"] in zone_variants and rng.random() < 0.3:
            r["Zone"] = rng.choice(zone_variants[r["Zone"]])
        if rng.random() < 0.08:
            r["Labour Hrs"] = f"{r['Labour Hrs']}h"
        if r["Status"] == "Completed" and rng.random() < 0.03:
            r["Completed"] = ""
        if rng.random() < 0.02:
            r["Labour Hrs"] = ""
        out.append(r)
        if rng.random() < 0.03:
            out.append(dict(r))  # duplicate row
    return out


def build_sqlite(path, assets, tasks, wos, dts):
    if os.path.exists(path):
        os.remove(path)
    con = sqlite3.connect(path)
    con.executescript("""
    CREATE TABLE zones (zone_code TEXT PRIMARY KEY, zone TEXT NOT NULL);
    CREATE TABLE assets (
        asset_id TEXT PRIMARY KEY, asset_name TEXT NOT NULL, zone_code TEXT NOT NULL REFERENCES zones(zone_code),
        asset_type TEXT, criticality TEXT CHECK (criticality IN ('A','B','C')), manufacturer TEXT, install_date TEXT);
    CREATE TABLE pm_tasks (
        pm_id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES assets(asset_id), task_description TEXT,
        task_type TEXT, frequency_days INTEGER, est_minutes INTEGER);
    CREATE TABLE work_orders (
        wo_id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES assets(asset_id), pm_id TEXT REFERENCES pm_tasks(pm_id),
        wo_type TEXT, priority INTEGER, description TEXT, failure_code TEXT, raised_datetime TEXT, due_date TEXT,
        completed_date TEXT, status TEXT, labour_hours REAL, technician TEXT, shift TEXT);
    CREATE TABLE downtime_events (
        event_id TEXT PRIMARY KEY, asset_id TEXT NOT NULL REFERENCES assets(asset_id), wo_id TEXT REFERENCES work_orders(wo_id),
        start_datetime TEXT, end_datetime TEXT, duration_min INTEGER, category TEXT, cause TEXT);
    """)
    none = lambda v: v if v not in ("", None) else None
    con.executemany("INSERT INTO zones VALUES (?,?)", ZONES)
    con.executemany("INSERT INTO assets VALUES (?,?,?,?,?,?,?)",
                    [(a["asset_id"], a["asset_name"], a["zone_code"], a["asset_type"], a["criticality"], a["manufacturer"], iso(a["install_date"])) for a in assets])
    con.executemany("INSERT INTO pm_tasks VALUES (?,?,?,?,?,?)",
                    [(t["pm_id"], t["asset_id"], t["task_description"], t["task_type"], t["frequency_days"], t["est_minutes"]) for t in tasks])
    con.executemany("INSERT INTO work_orders VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
                    [tuple(none(v) for v in wo_row(w).values()) for w in wos])
    con.executemany("INSERT INTO downtime_events VALUES (?,?,?,?,?,?,?,?)",
                    [tuple(none(v) for v in dt_row(d).values()) for d in dts])
    con.commit()
    con.close()


# ---------------------------------------------------------------- vibration data

def bearing_life(rng, n_days_max=420):
    """One bearing's daily condition-monitoring readings from install to failure."""
    life = int(rng.uniform(150, n_days_max))
    onset = int(life * rng.uniform(0.55, 0.8))  # defect initiates (the 'P' on the P-F curve)
    base_rms = rng.uniform(1.0, 1.8)
    rows = []
    for d in range(life):
        if d < onset:
            sev = 0.0
        else:
            x = (d - onset) / (life - onset)
            sev = x ** 2.2
        rms = base_rms * (1 + 3.5 * sev) + rng.gauss(0, 0.08)
        kurt = 3.0 + 6.0 * (sev ** 0.6 if sev > 0 else 0) * (1.2 if sev < 0.6 else 0.7) + rng.gauss(0, 0.25)
        peak = rms * (3.0 + 0.8 * (kurt - 3)) + rng.gauss(0, 0.2)
        temp = 38 + 14 * sev + rng.gauss(0, 0.8)
        rows.append((d, round(rms, 3), round(peak, 3), round(peak / rms, 3), round(kurt, 3), round(temp, 2), life - d - 1))
    return rows


def waveform(rng, fs=5120, seconds=1.0, shaft_hz=24.6, fault=0.0):
    """Acceleration waveform: shaft 1x + noise, plus outer-race impacts at BPFO when faulty."""
    bpfo = shaft_hz * 3.585  # 6205 bearing outer race defect frequency
    n = int(fs * seconds)
    res_hz, decay = 1200.0, 400.0
    out = []
    impact_times = [k / bpfo for k in range(int(seconds * bpfo) + 1)]
    for i in range(n):
        t = i / fs
        v = 0.3 * math.sin(2 * math.pi * shaft_hz * t) + 0.08 * math.sin(2 * math.pi * 2 * shaft_hz * t) + rng.gauss(0, 0.12)
        if fault > 0:
            # last impact before t
            k = int(t * bpfo)
            dt = t - impact_times[k]
            v += fault * math.exp(-decay * dt) * math.sin(2 * math.pi * res_hz * dt)
        out.append(round(v, 5))
    return out


def build_vibration(rng):
    vib = os.path.join(OUT, "vibration")
    os.makedirs(vib, exist_ok=True)
    # Trend file: six fan bearings over one year, two of which degrade and fail
    start = date(2025, 7, 1)
    rows = []
    for b in range(1, 7):
        failing = b in (2, 5)
        if failing:
            life = bearing_life(rng, 360)
            pad = 365 - len(life)
            readings = [(d, *r[1:6]) for d, r in enumerate(life)]
            fail_day = len(life) - 1
        else:
            readings, fail_day = [], None
            base = rng.uniform(1.0, 1.6)
            for d in range(365):
                rms = base + 0.0004 * d + rng.gauss(0, 0.08)
                kurt = 3.0 + rng.gauss(0, 0.25)
                peak = rms * 3.0 + rng.gauss(0, 0.2)
                readings.append((d, round(rms, 3), round(peak, 3), round(peak / rms, 3), round(kurt, 3), round(38 + rng.gauss(0, 0.8), 2)))
        for d, rms, peak, crest, kurt, temp in readings:
            rows.append({"date": iso(start + timedelta(days=d)), "bearing_id": f"DRY-FAN-B{b}",
                         "rms_velocity_mm_s": rms, "peak_accel_g": peak, "crest_factor": crest,
                         "kurtosis": kurt, "temp_c": temp,
                         "status": "Failed" if (fail_day is not None and d == fail_day) else "Running"})
    write_csv(os.path.join(vib, "bearing_trend.csv"), rows,
              ["date", "bearing_id", "rms_velocity_mm_s", "peak_accel_g", "crest_factor", "kurtosis", "temp_c", "status"])

    # Waveform snapshots for FFT work
    wf = os.path.join(vib, "waveforms")
    os.makedirs(wf, exist_ok=True)
    for name, fault in [("healthy", 0.0), ("early_fault", 0.6), ("late_fault", 1.8)]:
        sig = waveform(rng, fault=fault)
        write_csv(os.path.join(wf, f"fan_bearing_{name}.csv"),
                  [{"time_s": round(i / 5120, 6), "accel_g": v} for i, v in enumerate(sig)], ["time_s", "accel_g"])

    # Run-to-failure fleet for machine learning (Phase 6)
    ml = os.path.join(OUT, "ml")
    os.makedirs(ml, exist_ok=True)
    rows = []
    for b in range(1, 61):
        for d, rms, peak, crest, kurt, temp, rul in bearing_life(rng):
            rows.append({"bearing_id": f"B{b:03d}", "day": d, "rms_velocity_mm_s": rms, "peak_accel_g": peak,
                         "crest_factor": crest, "kurtosis": kurt, "temp_c": temp, "rul_days": rul,
                         "fail_within_14d": 1 if rul < 14 else 0})
    write_csv(os.path.join(ml, "bearing_fleet.csv"), rows,
              ["bearing_id", "day", "rms_velocity_mm_s", "peak_accel_g", "crest_factor", "kurtosis", "temp_c", "rul_days", "fail_within_14d"])


def main():
    rng = random.Random(SEED)
    assets = build_assets(rng)
    tasks = build_pm_tasks(assets, rng)
    wos, dts = simulate(assets, tasks, rng)
    amap = {a["asset_id"]: a for a in assets}

    csv_dir = os.path.join(OUT, "csv")
    write_csv(os.path.join(csv_dir, "zones.csv"), [{"zone_code": c, "zone": n} for c, n in ZONES], ["zone_code", "zone"])
    write_csv(os.path.join(csv_dir, "assets.csv"), [{**a, "install_date": iso(a["install_date"])} for a in assets], ASSET_F)
    write_csv(os.path.join(csv_dir, "pm_tasks.csv"), tasks, PM_F)
    write_csv(os.path.join(csv_dir, "work_orders.csv"), [wo_row(w) for w in wos], WO_F)
    write_csv(os.path.join(csv_dir, "downtime_events.csv"), [dt_row(d) for d in dts], DT_F)

    # Monthly flattened exports (for Power Query 'From Folder')
    dt_mins = {}
    for d in dts:
        if d["wo"]:
            dt_mins[d["wo"]["wo_id"]] = dt_mins.get(d["wo"]["wo_id"], 0) + d["duration_min"]
    months = {}
    for w in wos:
        months.setdefault(w["raised"].strftime("%Y-%m"), []).append(export_row(w, amap[w["asset_id"]], dt_mins))
    exp_dir = os.path.join(OUT, "exports", "work_orders")
    os.makedirs(exp_dir, exist_ok=True)
    for f in os.listdir(exp_dir):
        os.remove(os.path.join(exp_dir, f))
    for m, rows in months.items():
        write_csv(os.path.join(exp_dir, f"WO_Export_{m}.csv"), rows, EXPORT_F)

    # Messy version of Q1 2026 for data cleaning practice
    q1 = [r for m in ("2026-01", "2026-02", "2026-03") for r in months.get(m, [])]
    write_csv(os.path.join(OUT, "dirty", "wo_export_q1_2026_dirty.csv"), dirty_export(q1, rng), EXPORT_F)

    # Small, friendly file for week 1: two weeks of shift downtime
    log = []
    for d in dts:
        if date(2026, 6, 1) <= d["start"].date() <= date(2026, 6, 14) and True:
            a = amap[d["asset_id"]]
            hr = d["start"].hour
            log.append({"Date": d["start"].strftime("%d/%m/%Y"), "Start Time": d["start"].strftime("%H:%M"),
                        "Shift": "Days" if 6 <= hr < 18 else "Nights", "Zone": a["zone"], "Asset": a["asset_id"],
                        "Asset Description": a["asset_name"], "Category": d["category"], "Cause": d["cause"],
                        "Minutes": d["duration_min"]})
    write_csv(os.path.join(OUT, "week01", "shift_downtime_log.csv"), log,
              ["Date", "Start Time", "Shift", "Zone", "Asset", "Asset Description", "Category", "Cause", "Minutes"])

    build_sqlite(os.path.join(OUT, "line_d.db"), assets, tasks, wos, dts)
    build_vibration(rng)

    print(f"assets={len(assets)} pm_tasks={len(tasks)} work_orders={len(wos)} downtime_events={len(dts)} week01_rows={len(log)}")


if __name__ == "__main__":
    main()
