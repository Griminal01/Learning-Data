"""
Bearing anomaly detector: Phase 7 build.

Learns each bearing's own "normal" from its first N readings, scores every new
reading by how far it has drifted (robust z-score across several features), and
raises an alarm only when the score stays high for several readings in a row.

Evaluated two ways:
  * on the 60-bearing run-to-failure fleet: did it alarm before failure, how
    early, and how often did it alarm far too early (false alarms)?
  * on the 6-bearing site trend file: alarms on the failed bearings, none on
    the healthy ones?

Point it at real condition-monitoring exports by changing load_*() only.

Usage:
    python anomaly_detector.py
    python anomaly_detector.py --threshold 4 --persist 3 --baseline-days 30
"""
import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

DATA = Path(__file__).resolve().parents[2] / "data"
FEATURES = ["rms_velocity_mm_s", "kurtosis", "crest_factor", "temp_c"]


def load_fleet():
    df = pd.read_csv(DATA / "ml" / "bearing_fleet.csv")
    return df.rename(columns={"day": "t"}).sort_values(["bearing_id", "t"])


def load_site_trend():
    df = pd.read_csv(DATA / "vibration" / "bearing_trend.csv", parse_dates=["date"]).sort_values(["bearing_id", "date"])
    df["t"] = df.groupby("bearing_id").cumcount()
    return df


def score(df, baseline_days):
    """Robust z-score of each feature against that bearing's own baseline; returns the max across features."""
    out = []
    for _, g in df.groupby("bearing_id", sort=False):
        base = g[g["t"] < baseline_days][FEATURES]
        med = base.median()
        mad = (base - med).abs().median() * 1.4826  # MAD scaled to behave like a standard deviation
        z = ((g[FEATURES] - med) / mad.replace(0, np.nan)).abs()
        smoothed = z.rolling(3, min_periods=1).median()  # knocks out single-reading spikes
        out.append(smoothed.max(axis=1))
    return pd.concat(out).reindex(df.index)


def alarms(df, threshold, persist):
    over = df["score"] >= threshold
    run = over.groupby(df["bearing_id"]).transform(lambda s: s.rolling(persist, min_periods=persist).sum())
    return run >= persist


def evaluate_fleet(df, too_early_days):
    rows = []
    for bid, g in df.groupby("bearing_id"):
        life = g["t"].max()
        a = g[g["alarm"]]
        first = a["t"].min() if len(a) else np.nan
        lead = life - first if len(a) else np.nan
        rows.append({"bearing_id": bid, "life_days": life, "first_alarm_day": first, "lead_days": lead,
                     "false_alarm": bool(len(a)) and lead > too_early_days})
    return pd.DataFrame(rows)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--baseline-days", type=int, default=30)
    ap.add_argument("--threshold", type=float, default=6.0, help="robust z-score that counts as abnormal")
    ap.add_argument("--persist", type=int, default=3, help="consecutive abnormal readings needed to alarm")
    ap.add_argument("--too-early", type=int, default=150, help="an alarm more than this many days before failure counts as false")
    ap.add_argument("--out", type=Path, default=Path("reports"))
    a = ap.parse_args()

    fleet = load_fleet()
    fleet["score"] = score(fleet, a.baseline_days)
    fleet["alarm"] = alarms(fleet, a.threshold, a.persist)
    res = evaluate_fleet(fleet, a.too_early)
    detected = res["lead_days"].notna() & ~res["false_alarm"]
    print(f"Fleet: {len(res)} bearings run to failure")
    print(f"  detected before failure : {detected.sum()} ({detected.mean():.0%})")
    print(f"  false (too early) alarms: {res['false_alarm'].sum()}")
    print(f"  missed entirely         : {res['lead_days'].isna().sum()}")
    print(f"  warning time (days)     : median {res.loc[detected, 'lead_days'].median():.0f}, "
          f"min {res.loc[detected, 'lead_days'].min():.0f}, max {res.loc[detected, 'lead_days'].max():.0f}")

    site = load_site_trend()
    site["score"] = score(site, a.baseline_days)
    site["alarm"] = alarms(site, a.threshold, a.persist)
    first = site[site["alarm"]].groupby("bearing_id")["date"].min()
    failed = site[site["status"] == "Failed"].set_index("bearing_id")["date"]
    summary = pd.DataFrame({"first_alarm": first, "failed": failed}).reindex(sorted(site["bearing_id"].unique()))
    summary["warning_days"] = (summary["failed"] - summary["first_alarm"]).dt.days
    print("\nSite trend file:")
    print(summary.to_string())

    a.out.mkdir(parents=True, exist_ok=True)
    fig, ax = plt.subplots(figsize=(9, 4))
    for bid, g in site.groupby("bearing_id"):
        failed_b = (g["status"] == "Failed").any()
        ax.plot(g["date"], g["score"], color="#C62828" if failed_b else "#9E9E9E", linewidth=2 if failed_b else 1,
                label=bid if failed_b else None)
    ax.axhline(a.threshold, color="#212121", linestyle="--", linewidth=1)
    ax.set_yscale("log")
    ax.set_ylim(0.3, None)
    ax.set_ylabel("anomaly score (robust z)")
    ax.set_title("Anomaly score: failing bearings break away months before failure", loc="left")
    ax.legend(frameon=False)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(a.out / "anomaly_score.png", dpi=150)
    print(f"\nChart written to {a.out / 'anomaly_score.png'}")


if __name__ == "__main__":
    main()
