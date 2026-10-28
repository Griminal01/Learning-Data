"""Weeks 36-38: pandas. Run: python w36_w38_pandas.py"""
from pathlib import Path
import pandas as pd

DATA = Path(__file__).resolve().parents[2] / "data"

# --- Week 36: read, inspect, select, filter, sort ---
wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["raised_datetime", "due_date", "completed_date"])
assets = pd.read_csv(DATA / "csv" / "assets.csv", parse_dates=["install_date"])
print(wo.shape)
print(wo.dtypes)
reactive = wo[wo["wo_type"] == "Reactive"]
print("Reactive:", len(reactive))
big = wo[(wo["wo_type"] == "Reactive") & (wo["labour_hours"] > 6)].sort_values("labour_hours", ascending=False)
print(big[["wo_id", "asset_id", "description", "labour_hours"]].head())

# --- Week 37: clean, merge, groupby, pivot ---
dirty = pd.read_csv(DATA / "dirty" / "wo_export_q1_2026_dirty.csv", dtype=str, keep_default_na=False)
clean = dirty.drop_duplicates().copy()
clean["Asset"] = (clean["Asset"].str.strip().str.upper().str.replace(" ", "-", regex=False)
                  .str.replace(r"^LD-?([A-Z]{3})-?(\d{3})$", r"LD-\1-\2", regex=True))
clean["Labour Hrs"] = pd.to_numeric(clean["Labour Hrs"].str.replace("h", "", regex=False), errors="coerce")
clean = clean.merge(assets[["asset_id", "zone"]], left_on="Asset", right_on="asset_id", how="left", validate="many_to_one")
print("Rows:", len(clean), "Unmatched assets:", clean["asset_id"].isna().sum(), "Labour:", round(clean["Labour Hrs"].sum(), 2))

wo = wo.merge(assets[["asset_id", "zone", "asset_type", "criticality"]], on="asset_id", how="left", validate="many_to_one")
by_zone = (wo[wo["wo_type"] == "Reactive"]
           .groupby("zone")
           .agg(jobs=("wo_id", "count"), labour_hrs=("labour_hours", "sum"), failing_assets=("asset_id", "nunique"))
           .sort_values("jobs", ascending=False))
by_zone["jobs_per_failing_asset"] = (by_zone["jobs"] / by_zone["failing_assets"]).round(2)
print(by_zone.round(1))

pm = wo[wo["wo_type"] == "PM"].copy()
pm["on_time"] = pm["completed_date"].le(pm["due_date"])
pm["due_month"] = pm["due_date"].dt.to_period("M")
pivot = pm[pm["due_date"] >= "2026-01-01"].pivot_table(index="zone", columns="due_month", values="on_time", aggfunc="mean")
print((pivot * 100).round(0))

# --- Week 38: time series ---
dt = pd.read_csv(DATA / "csv" / "downtime_events.csv", parse_dates=["start_datetime", "end_datetime"])
bd = dt[dt["category"] == "Breakdown"].set_index("start_datetime").sort_index()
weekly = bd["duration_min"].resample("W-SUN").sum() / 60
print("Weeks:", len(weekly), "Worst week:", weekly.idxmax().date(), round(weekly.max(), 1), "h")
rolling = weekly.rolling(13).sum()
print("Rolling 13w at 28 Jun 2026:", round(rolling.loc["2026-06-28"], 1))
monthly = bd["duration_min"].resample("MS").sum() / 60
print(monthly.tail(6).round(1))
yoy = monthly.pct_change(12) * 100
print("June 2026 vs June 2025 %:", round(yoy.loc["2026-06-01"], 1))
dt["hour"] = dt["start_datetime"].dt.hour
print(dt[dt["category"] == "Minor stop"].groupby("hour").size().idxmax(), "is the busiest hour for minor stops")
