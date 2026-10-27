"""
Weekly PM report: Phase 4 build.

Reads every CMMS work order export in a folder, works out PM compliance,
overdue PMs, reactive work and the top downtime assets, and writes a formatted
Excel report with charts. No clicking.

Usage:
    python weekly_pm_report.py
    python weekly_pm_report.py --report-date 2026-06-28 --out reports
    python weekly_pm_report.py --folder "C:/path/to/exports" --report-date 2026-06-28
"""
import argparse
from datetime import date, timedelta
from pathlib import Path

import matplotlib
matplotlib.use("Agg")  # draw charts to files, no window
import matplotlib.pyplot as plt
import pandas as pd

REPO = Path(__file__).resolve().parents[2]
DEFAULT_FOLDER = REPO / "data" / "exports" / "work_orders"
TARGET = 0.90


def load_exports(folder: Path) -> pd.DataFrame:
    files = sorted(folder.glob("WO_Export_*.csv"))
    if not files:
        raise SystemExit(f"No WO_Export_*.csv files found in {folder}")
    df = pd.concat((pd.read_csv(f).assign(source_file=f.name) for f in files), ignore_index=True)
    df["Raised"] = pd.to_datetime(df["Raised"], format="%d/%m/%Y %H:%M")
    for col in ("Due", "Completed"):
        df[col] = pd.to_datetime(df[col], format="%d/%m/%Y")
    df = df.drop_duplicates(subset="WO Number", keep="last")
    print(f"Loaded {len(files)} files, {len(df):,} work orders")
    return df


def pm_compliance(pm: pd.DataFrame, start, end, by=None):
    """Share of PMs due in [start, end] completed on or before their due date."""
    window = pm[pm["Due"].between(start, end)].copy()
    window["On Time"] = window["Completed"].le(window["Due"])
    if by is None:
        return window["On Time"].mean(), len(window)
    return (window.groupby(by)
            .agg(PMs_Due=("WO Number", "count"), On_Time=("On Time", "sum"))
            .assign(Compliance=lambda t: t["On_Time"] / t["PMs_Due"])
            .sort_values("Compliance"))


def build_report(df: pd.DataFrame, report_date: date):
    rd = pd.Timestamp(report_date)
    week_start = rd - timedelta(days=6)
    r13_start = rd - timedelta(days=90)

    pm = df[df["WO Type"] == "PM"]
    reactive = df[df["WO Type"] == "Reactive"]

    week_pct, week_n = pm_compliance(pm, week_start, rd)
    r13_pct, r13_n = pm_compliance(pm, r13_start, rd)
    by_zone = pm_compliance(pm, r13_start, rd, by="Zone")

    overdue = (pm[pm["Completed"].isna() & (pm["Status"] == "Open") & (pm["Due"] < rd)]
               .assign(**{"Days Overdue": lambda t: (rd - t["Due"]).dt.days})
               .sort_values("Days Overdue", ascending=False)
               [["WO Number", "Asset", "Asset Description", "Zone", "Description", "Due", "Days Overdue"]])

    r13_reactive = reactive[reactive["Raised"].between(r13_start, rd + timedelta(days=1))]
    top10 = (r13_reactive.groupby(["Asset", "Asset Description", "Zone"], as_index=False)
             .agg(Breakdowns=("WO Number", "count"), Downtime_Hrs=("Downtime Mins", lambda s: s.sum() / 60),
                  Labour_Hrs=("Labour Hrs", "sum"))
             .sort_values("Downtime_Hrs", ascending=False)
             .head(10))

    weekly = (df.set_index("Raised")
              .groupby("WO Type")["WO Number"].resample("W-SUN").count()
              .unstack(0).fillna(0))
    weekly = weekly[weekly.index <= rd].tail(13)

    summary = pd.DataFrame({
        "KPI": ["Report date", "PM compliance (this week)", "PMs due (this week)",
                "PM compliance (13 weeks)", "PMs due (13 weeks)", "Overdue PMs", "Reactive jobs (this week)",
                "Reactive jobs (13 weeks)"],
        "Value": [rd.strftime("%d/%m/%Y"), week_pct, week_n, r13_pct, r13_n, len(overdue),
                  int(reactive["Raised"].between(week_start, rd + timedelta(days=1)).sum()), len(r13_reactive)],
    })
    return summary, by_zone.reset_index(), overdue, top10, weekly


def chart_compliance(by_zone, path):
    fig, ax = plt.subplots(figsize=(7, 3.5))
    colours = ["#C62828" if v < TARGET else "#2E7D32" for v in by_zone["Compliance"]]
    ax.barh(by_zone["Zone"], by_zone["Compliance"] * 100, color=colours)
    ax.axvline(TARGET * 100, color="#212121", linestyle="--", linewidth=1)
    ax.set_xlim(0, 100)
    ax.set_xlabel("PM compliance %, last 13 weeks")
    worst = by_zone.iloc[0]
    ax.set_title(f"Lowest: {worst['Zone']} ({worst['Compliance']:.0%}) vs {TARGET:.0%} target", loc="left")
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def chart_weekly(weekly, path):
    fig, ax = plt.subplots(figsize=(7, 3.5))
    if "Reactive" in weekly:
        ax.plot(weekly.index, weekly["Reactive"], marker="o", color="#C62828", label="Reactive")
    if "Corrective" in weekly:
        ax.plot(weekly.index, weekly["Corrective"], marker="o", color="#1F4E79", label="Corrective")
    ax.set_title("Reactive and corrective jobs per week (last 13 weeks)", loc="left")
    ax.legend(frameon=False)
    for s in ("top", "right"):
        ax.spines[s].set_visible(False)
    fig.autofmt_xdate()
    fig.tight_layout()
    fig.savefig(path, dpi=150)
    plt.close(fig)


def write_excel(out_file: Path, summary, by_zone, overdue, top10, charts):
    with pd.ExcelWriter(out_file, engine="xlsxwriter", datetime_format="dd/mm/yyyy", date_format="dd/mm/yyyy") as xw:
        wb = xw.book
        pct = wb.add_format({"num_format": "0.0%"})
        hdr = wb.add_format({"bold": True, "bg_color": "#1F4E79", "font_color": "white"})

        summary.to_excel(xw, sheet_name="Summary", index=False, startrow=1)
        ws = xw.sheets["Summary"]
        ws.write(0, 0, "Weekly PM Report: Line D", wb.add_format({"bold": True, "font_size": 14}))
        for r, v in enumerate(summary["Value"], start=2):
            if isinstance(v, float):
                ws.write_number(r, 1, v, pct)
        ws.set_column(0, 0, 30)
        ws.set_column(1, 1, 14)
        ws.insert_image("D2", str(charts[0]), {"x_scale": 0.75, "y_scale": 0.75})
        ws.insert_image("D22", str(charts[1]), {"x_scale": 0.75, "y_scale": 0.75})

        for name, frame in (("Compliance by Zone", by_zone), ("Overdue PMs", overdue), ("Top 10 Downtime", top10)):
            frame.to_excel(xw, sheet_name=name, index=False)
            sh = xw.sheets[name]
            for c, col in enumerate(frame.columns):
                sh.write(0, c, col, hdr)
                width = max(12, min(45, int(frame[col].astype(str).str.len().max() if len(frame) else 12) + 2))
                sh.set_column(c, c, width, pct if col == "Compliance" else None)
            sh.freeze_panes(1, 0)
            sh.autofilter(0, 0, max(len(frame), 1), len(frame.columns) - 1)


def main():
    p = argparse.ArgumentParser(description="Build the weekly PM report from CMMS exports.")
    p.add_argument("--folder", type=Path, default=DEFAULT_FOLDER, help="folder of WO_Export_*.csv files")
    p.add_argument("--report-date", type=date.fromisoformat, default=date(2026, 6, 28),
                   help="last day of the report week, YYYY-MM-DD (default: 2026-06-28, the last full week in the practice data)")
    p.add_argument("--out", type=Path, default=Path("reports"), help="output folder")
    args = p.parse_args()

    df = load_exports(args.folder)
    summary, by_zone, overdue, top10, weekly = build_report(df, args.report_date)

    args.out.mkdir(parents=True, exist_ok=True)
    charts = [args.out / "compliance_by_zone.png", args.out / "weekly_reactive.png"]
    chart_compliance(by_zone, charts[0])
    chart_weekly(weekly, charts[1])
    out_file = args.out / f"PM_Report_{args.report_date:%Y-%m-%d}.xlsx"
    write_excel(out_file, summary, by_zone, overdue, top10, charts)

    print(summary.to_string(index=False))
    print(f"Written {out_file}")


if __name__ == "__main__":
    main()
