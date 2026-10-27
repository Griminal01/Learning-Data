"""
Vibration trend analysis: Phase 4, week 33.

Trends overall RMS velocity for six fan bearings, applies alert/alarm limits,
and works out how much warning each alarm gave before failure (the P-F interval
you actually got). Same code is meant to point at real condition-monitoring
exports later: only load_readings() should need changing.

Usage:
    python vibration_trend.py
    python vibration_trend.py --csv path/to/export.csv --alert 2.8 --alarm 4.5
"""
import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
DEFAULT_CSV = REPO / "data" / "vibration" / "bearing_trend.csv"


def load_readings(path: Path) -> pd.DataFrame:
    df = pd.read_csv(path, parse_dates=["date"])
    return df.sort_values(["bearing_id", "date"])


def add_trend_features(df: pd.DataFrame) -> pd.DataFrame:
    g = df.groupby("bearing_id")["rms_velocity_mm_s"]
    df["rms_7d"] = g.transform(lambda s: s.rolling(7, min_periods=1).mean())
    # Baseline = median of the first 30 days; a common way to judge "change from normal"
    df["baseline"] = g.transform(lambda s: s.iloc[:30].median())
    df["x_baseline"] = df["rms_7d"] / df["baseline"]
    return df


def first_crossing(df, column, limit):
    hit = df[df[column] >= limit].groupby("bearing_id")["date"].min()
    return hit.rename(f"first_{column}_{limit}")


def summarise(df, alert, alarm):
    fail = df[df["status"] == "Failed"].set_index("bearing_id")["date"].rename("failed_on")
    out = pd.concat([
        df.groupby("bearing_id")["baseline"].first().round(2),
        df.groupby("bearing_id")["rms_velocity_mm_s"].max().rename("max_rms").round(2),
        first_crossing(df, "rms_7d", alert).rename("alert_on"),
        first_crossing(df, "rms_7d", alarm).rename("alarm_on"),
        first_crossing(df, "x_baseline", 2.0).rename("2x_baseline_on"),
        fail,
    ], axis=1)
    for col in ("alert_on", "alarm_on", "2x_baseline_on"):
        out[f"warning_days_{col.replace('_on', '')}"] = (out["failed_on"] - out[col]).dt.days
    return out


def plot(df, alert, alarm, path):
    fig, ax = plt.subplots(figsize=(9, 4.5))
    for bid, g in df.groupby("bearing_id"):
        failed = (g["status"] == "Failed").any()
        ax.plot(g["date"], g["rms_7d"], linewidth=2 if failed else 1,
                color="#C62828" if failed else "#9E9E9E", label=bid if failed else None)
    ax.axhline(alert, color="#F9A825", linestyle="--", linewidth=1)
    ax.axhline(alarm, color="#C62828", linestyle="--", linewidth=1)
    ax.text(df["date"].min(), alert, f" alert {alert} mm/s", va="bottom", color="#F9A825")
    ax.text(df["date"].min(), alarm, f" alarm {alarm} mm/s", va="bottom", color="#C62828")
    ax.set_ylabel("RMS velocity, 7-day mean (mm/s)")
    ax.set_title("Two of six dryer fan bearings degraded to failure; grey = healthy", loc="left")
    ax.legend(frameon=False)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--csv", type=Path, default=DEFAULT_CSV)
    p.add_argument("--alert", type=float, default=2.8, help="alert limit, mm/s RMS")
    p.add_argument("--alarm", type=float, default=4.5, help="alarm limit, mm/s RMS")
    p.add_argument("--out", type=Path, default=Path("reports"))
    a = p.parse_args()

    df = add_trend_features(load_readings(a.csv))
    summary = summarise(df, a.alert, a.alarm)
    a.out.mkdir(parents=True, exist_ok=True)
    plot(df, a.alert, a.alarm, a.out / "bearing_trend.png")
    with pd.option_context("display.width", 160, "display.max_columns", 20):
        print(summary)
    print(f"Chart written to {a.out / 'bearing_trend.png'}")


if __name__ == "__main__":
    main()
