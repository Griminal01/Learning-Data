"""Weeks 46-47: SPC control charts, capability, reliability metrics."""
from pathlib import Path
import numpy as np
import pandas as pd

DATA = Path(__file__).resolve().parents[2] / "data"
wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["raised_datetime"])
dt = pd.read_csv(DATA / "csv" / "downtime_events.csv", parse_dates=["start_datetime"])
assets = pd.read_csv(DATA / "csv" / "assets.csv")

print("== Week 46: c-chart, weekly reactive jobs (whole line)")
r = wo[wo["wo_type"] == "Reactive"].set_index("raised_datetime")
weekly = r["wo_id"].resample("W-SUN").count()
weekly = weekly[(weekly.index > "2024-07-01") & (weekly.index <= "2026-06-28")]
cbar = weekly.mean()
ucl, lcl = cbar + 3 * np.sqrt(cbar), max(0, cbar - 3 * np.sqrt(cbar))
print("weeks", len(weekly), "cbar", round(cbar, 2), "UCL", round(ucl, 2), "LCL", round(lcl, 2))
print("points above UCL", weekly[weekly > ucl].to_dict())
# run rule: 8 in a row same side of centre
side = np.sign(weekly - cbar)
run = (side.groupby((side != side.shift()).cumsum()).transform("size"))
print("longest run same side", run.max())

print("== I-MR chart, PPK minor stop minutes per week")
ms = dt[(dt["category"] == "Minor stop")].merge(assets, on="asset_id")
ppk = ms[ms["zone_code"] == "PPK"].set_index("start_datetime")["duration_min"].resample("W-SUN").sum()
ppk = ppk[(ppk.index > "2024-07-01") & (ppk.index <= "2026-06-28")]
mr = ppk.diff().abs()
xbar, mrbar = ppk.mean(), mr.mean()
print("xbar", round(xbar, 1), "MRbar", round(mrbar, 1), "UCL", round(xbar + 2.66 * mrbar, 1), "LCL", round(xbar - 2.66 * mrbar, 1),
      "MR UCL", round(3.267 * mrbar, 1))
print("out", ppk[(ppk > xbar + 2.66 * mrbar) | (ppk < xbar - 2.66 * mrbar)].to_dict())

print("== Capability: simulated 500 g pack weights, LSL 495 USL 515")
rng = np.random.default_rng(7)
w = rng.normal(503.0, 2.4, 250).round(1)
mu, sd = w.mean(), w.std(ddof=1)
cp = (515 - 495) / (6 * sd); cpk = min(515 - mu, mu - 495) / (3 * sd)
print("mean", round(mu, 2), "sd", round(sd, 2), "Cp", round(cp, 2), "Cpk", round(cpk, 2), "below LSL", (w < 495).sum())

print("== Week 47: reliability metrics")
hours = 17520
bd = dt[dt["category"] == "Breakdown"]
fw = assets[assets["asset_type"] == "Flow wrapper"]["asset_id"]
f = r[r["asset_id"].isin(fw)]
mtbf = hours * len(fw) / len(f)
mttr = bd[bd["asset_id"].isin(fw)]["duration_min"].mean() / 60
A = mtbf / (mtbf + mttr)
print("flow wrappers", len(fw), "failures", len(f), "MTBF h", round(mtbf), "MTTR h", round(mttr, 2), "A", round(A, 5), "lambda/h", f"{1 / mtbf:.5f}")
print("R(168h) exponential", round(np.exp(-168 / mtbf), 3))
print("6 in series", round(A ** 6, 4))
# Line-level: ppk assets series availability
per = []
for aid in assets[assets["zone_code"] == "PPK"]["asset_id"]:
    n = (r["asset_id"] == aid).sum()
    dmin = bd[bd["asset_id"] == aid]["duration_min"].sum() / 60
    per.append(1 - dmin / hours)
print("PPK series availability from downtime", round(np.prod(per), 4), "zone downtime hrs", round(bd.merge(assets)[lambda x: x.zone_code == 'PPK'].duration_min.sum() / 60, 1))
print("2 pumps in parallel each 0.98", round(1 - (1 - 0.98) ** 2, 4))
