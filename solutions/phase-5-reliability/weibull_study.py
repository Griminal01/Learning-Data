"""
Weibull PM interval study: Phase 5 build (weeks 40-42).

Builds life data for one failure mode (time from each renewal to the next
failure, with PM replacements and planned repairs as suspensions), fits a
2-parameter Weibull, and works out a cost-optimal replacement interval.

Usage:
    python weibull_study.py
    python weibull_study.py --asset-type "Flow wrapper" --mode "Mechanical - jaws" --pm-prefix "Replace sealing jaws"
"""
import argparse
from pathlib import Path

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from reliability.Fitters import Fit_Weibull_2P
from reliability.Repairable_systems import optimal_replacement_time

DATA = Path(__file__).resolve().parents[2] / "data"
START, END = pd.Timestamp("2024-07-01"), pd.Timestamp("2026-06-30")


def life_data(asset_type, mode, pm_prefix):
    """Return (failures, suspensions) in days for one failure mode."""
    wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["raised_datetime", "completed_date"])
    assets = pd.read_csv(DATA / "csv" / "assets.csv")
    wo = wo.merge(assets[["asset_id", "asset_type"]], on="asset_id")
    wo = wo[wo["asset_type"] == asset_type]

    events = []
    # Breakdowns of this mode end a life as a FAILURE
    f = wo[(wo["wo_type"] == "Reactive") & (wo["failure_code"] == mode)]
    events += [(a, t.normalize(), "F") for a, t in zip(f["asset_id"], f["raised_datetime"])]
    # Planned repairs of this mode (found on inspection) and PM replacements end a life as a SUSPENSION
    c = wo[(wo["wo_type"] == "Corrective") & (wo["failure_code"] == mode)]
    events += [(a, t.normalize(), "S") for a, t in zip(c["asset_id"], c["raised_datetime"])]
    p = wo[(wo["wo_type"] == "PM") & wo["description"].str.startswith(pm_prefix) & wo["completed_date"].notna()]
    events += [(a, t, "S") for a, t in zip(p["asset_id"], p["completed_date"])]

    ev = pd.DataFrame(events, columns=["asset_id", "date", "kind"]).sort_values(["asset_id", "date"])
    failures, suspensions = [], []
    for _, g in ev.groupby("asset_id"):
        prev = None  # the first life started before the data window: its true age is unknown, so skip it
        for date, kind in zip(g["date"], g["kind"]):
            if prev is not None:
                days = (date - prev).days
                if days > 0:
                    (failures if kind == "F" else suspensions).append(days)
            prev = date
        suspensions.append((END - prev).days)  # still running at the end of the data
    return np.array(failures, float), np.array([s for s in suspensions if s > 0], float)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--asset-type", default="Flow wrapper")
    ap.add_argument("--mode", default="Mechanical - jaws")
    ap.add_argument("--pm-prefix", default="Replace sealing jaws")
    ap.add_argument("--current-interval", type=float, default=182, help="current PM interval, days")
    ap.add_argument("--cost-pm", type=float, default=400, help="planned replacement cost, £ (parts + labour)")
    ap.add_argument("--cost-cm", type=float, default=2900, help="breakdown cost, £ (parts + labour + lost production)")
    ap.add_argument("--out", type=Path, default=Path("reports"))
    a = ap.parse_args()

    failures, suspensions = life_data(a.asset_type, a.mode, a.pm_prefix)
    print(f"{a.asset_type} / {a.mode}: {len(failures)} failures, {len(suspensions)} suspensions")
    fit = Fit_Weibull_2P(failures=failures, right_censored=suspensions, show_probability_plot=False, print_results=False)
    eta, beta = fit.alpha, fit.beta
    print(f"eta (characteristic life) = {eta:.1f} days  [{fit.alpha_lower:.1f}-{fit.alpha_upper:.1f}]")
    print(f"beta (shape)              = {beta:.2f}  [{fit.beta_lower:.2f}-{fit.beta_upper:.2f}]")

    dist = fit.distribution
    b10 = dist.inverse_SF(0.90)
    r_current = dist.SF(a.current_interval)
    print(f"B10 life = {b10:.0f} days (10 % fail by then)")
    print(f"Chance of surviving the current {a.current_interval:.0f}-day interval without failing: {r_current:.1%}")
    print(f"Mean life = {dist.mean:.0f} days")

    ort = optimal_replacement_time(cost_PM=a.cost_pm, cost_CM=a.cost_cm, weibull_alpha=eta, weibull_beta=beta,
                                   q=0, show_time_plot=False, show_ratio_plot=False, print_results=False)
    t_opt = float(ort.ORT)
    print(f"Optimal replacement interval = {t_opt:.0f} days (cost ratio CM/PM = {a.cost_cm / a.cost_pm:.1f})")

    def R(t):
        """Weibull reliability: chance of surviving to age t."""
        return np.exp(-(np.asarray(t) / eta) ** beta)

    def cost_rate(t):
        # Age replacement: expected cost per cycle / expected cycle length
        xs = np.linspace(0, t, 2000)
        return (a.cost_pm * R(t) + a.cost_cm * (1 - R(t))) / np.trapezoid(R(xs), xs)

    for t in (a.current_interval, t_opt):
        print(f"  cost per day replacing every {t:5.0f} d: £{cost_rate(t):.2f}")
    run_to_failure = a.cost_cm / dist.mean
    print(f"  run-to-failure cost per day:      £{run_to_failure:.2f}")

    a.out.mkdir(parents=True, exist_ok=True)
    ts = np.linspace(max(5.0, eta * 0.1), max(a.current_interval, eta * 2.5), 200)
    fig, ax = plt.subplots(figsize=(7, 4))
    ax.plot(ts, [cost_rate(t) for t in ts], color="#1F4E79")
    ax.axhline(run_to_failure, color="#9E9E9E", linestyle="--", label="run to failure")
    ax.scatter([t_opt], [cost_rate(t_opt)], color="#2E7D32", zorder=3, label=f"optimum {t_opt:.0f} d")
    ax.scatter([a.current_interval], [cost_rate(a.current_interval)], color="#C62828", zorder=3,
               label=f"current {a.current_interval:.0f} d")
    ax.set_xlabel("Planned replacement interval (days)")
    ax.set_ylabel("Cost per day (£)")
    ax.set_title(f"{a.mode}: replacing every {t_opt:.0f} days minimises cost", loc="left")
    ax.legend(frameon=False)
    ax.spines[["top", "right"]].set_visible(False)
    fig.tight_layout()
    fig.savefig(a.out / "cost_vs_interval.png", dpi=150)
    plt.close(fig)

    fig = plt.figure()
    Fit_Weibull_2P(failures=failures, right_censored=suspensions, show_probability_plot=True, print_results=False)
    plt.title(f"Weibull probability plot: {a.mode}, beta = {beta:.2f}")
    plt.savefig(a.out / "weibull_probability_plot.png", dpi=150, bbox_inches="tight")
    plt.close("all")
    print(f"Plots written to {a.out}")


if __name__ == "__main__":
    main()
