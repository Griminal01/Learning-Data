"""Weeks 34-35: core Python with maintenance examples. Run: python w34_w35_core_python.py"""
import csv
from pathlib import Path

DATA = Path(__file__).resolve().parents[2] / "data"

# --- Week 34: variables, lists, dicts, loops, if ---
downtime_mins = [12, 45, 3, 180, 7, 22, 60]
print("Total:", sum(downtime_mins), "Longest:", max(downtime_mins), "Events:", len(downtime_mins))

long_stops = [m for m in downtime_mins if m >= 30]
print("Long stops:", long_stops)

pm_frequency = {"Grease motor bearings": 91, "Conveyor belt tension & tracking check": 14, "Replace sealing jaws": 182}
for task, days in pm_frequency.items():
    label = "weekly-ish" if days <= 14 else "monthly+" if days <= 91 else "6-monthly+"
    print(f"{task:45} every {days:>3} days  ({label})")


# --- Week 35: functions, files, errors ---
def mtbf_hours(operating_hours, failures):
    """Mean time between failures. Returns None when there were no failures."""
    if failures == 0:
        return None
    return operating_hours / failures


def availability(mtbf, mttr):
    return mtbf / (mtbf + mttr)


print("MTBF LD-PPK-005:", round(mtbf_hours(17520, 37)), "h")
print("Availability:", f"{availability(474, 0.76):.2%}")
print("No failures:", mtbf_hours(17520, 0))


def read_breakdowns(path):
    """Count reactive work orders per asset from the work_orders CSV."""
    counts = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row["wo_type"] == "Reactive":
                counts[row["asset_id"]] = counts.get(row["asset_id"], 0) + 1
    return counts


counts = read_breakdowns(DATA / "csv" / "work_orders.csv")
worst = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:5]
print("Worst 5:", worst)

for raw in ["1.5", "2h", "", "0.75"]:
    try:
        print(raw, "->", float(raw))
    except ValueError:
        print(raw, "-> not a number, skipped")
