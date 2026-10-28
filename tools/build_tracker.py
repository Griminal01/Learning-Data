"""
Rebuild the course data inside index.html from the lesson files.

Run after editing any lesson's title or "Tick off" list:
    python tools/build_tracker.py
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
INDEX = ROOT / "index.html"
START, END = "/*COURSE_DATA_START*/", "/*COURSE_DATA_END*/"

PHASES = [
    {"id": 0, "name": "Foundations", "short": "Excel basics",
     "done_when": "You built the two-week downtime summary with SUMIFS formulas that reconcile to 124 events / 1,931 minutes, plus a decluttered chart."},
    {"id": 1, "name": "Advanced Excel & Power Query", "short": "Excel & PQ",
     "done_when": "You drop a new export into the folder, press Refresh All, and every table and chart updates with zero manual edits."},
    {"id": 2, "name": "Data modelling & SQL", "short": "SQL",
     "done_when": "You can answer 'which 10 assets lost the most hours to reactive work last quarter, and were their PMs on time?' in one query."},
    {"id": 3, "name": "Power BI", "short": "Power BI",
     "done_when": "The Model Line team could use the dashboard in a weekly review without you explaining it."},
    {"id": 4, "name": "Production data: OEE, Redzone & Tableau", "short": "OEE & Tableau",
     "done_when": "You can rebuild line OEE from raw shift data to match the dashboard, and show in Tableau what share of lost time is maintenance-related and which assets drive it."},
    {"id": 5, "name": "Python for data", "short": "Python",
     "done_when": "A task that took you an hour a week in Excel now runs from a single command."},
    {"id": 6, "name": "Statistics & reliability analytics", "short": "Reliability",
     "done_when": "You can defend a PM interval change with numbers in front of an engineering manager."},
    {"id": 7, "name": "Machine learning & condition monitoring", "short": "ML & CM",
     "done_when": "You can explain to a non-specialist why your model's alerts are worth acting on, and how many false alarms to expect."},
]


def parse_lesson(path: Path):
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    m = re.match(r"# Week (\d+): (.+)", lines[0])
    week, title = int(m.group(1)), m.group(2).strip()
    phase = int(re.match(r"\*\*Phase (\d+)", lines[2]).group(1))
    ticks, in_tick = [], False
    for line in lines:
        if line.startswith("## "):
            in_tick = line.strip() == "## Tick off"
            continue
        if in_tick and line.startswith("- [ ] "):
            ticks.append(re.sub(r"\*\*(.+?)\*\*", r"\1", line[6:].strip()))
    return {"week": week, "phase": phase, "title": title,
            "path": path.relative_to(ROOT).as_posix(), "ticks": ticks}


def main():
    weeks = sorted((parse_lesson(p) for p in (ROOT / "course").glob("phase-*/week-*.md")), key=lambda w: w["week"])
    assert [w["week"] for w in weeks] == list(range(1, len(weeks) + 1)), "week numbers must run 1..N with no gaps"
    data = json.dumps({"phases": PHASES, "weeks": weeks}, ensure_ascii=False, separators=(",", ":"))
    html = INDEX.read_text(encoding="utf-8")
    a, b = html.index(START) + len(START), html.index(END)
    INDEX.write_text(html[:a] + data + html[b:], encoding="utf-8")
    print(f"index.html updated: {len(weeks)} weeks, {sum(len(w['ticks']) for w in weeks)} tick items")


if __name__ == "__main__":
    main()
