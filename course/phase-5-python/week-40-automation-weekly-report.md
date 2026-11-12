# Week 40: Automation, the weekly PM report script

**Phase 5 · Python for data** · Mon 2 Aug – Sun 8 Aug 2027 · about 5 hours

This is the payoff week of Phase 5. You'll build a script that reads every CMMS export in a folder and writes a finished **Excel PM report with charts**, from one command. Then you'll schedule it to run on its own.

**By Sunday you'll be able to:**

- structure a script into small functions with a `main()`
- take command-line options with `argparse`
- write formatted multi-sheet Excel files with `xlsxwriter`, including images
- schedule a script with Windows Task Scheduler

**Reference solution:** [`solutions/phase-5-python/weekly_pm_report.py`](../../solutions/phase-5-python/weekly_pm_report.py). Try building your own first, and peek only when stuck.

---

## Session 1 (1.5 h): Design, then the data functions

### Do it

1. **Write the spec first**, as a docstring at the top of `my_work\pm_report.py`. Start with the *Input:* a folder of `WO_Export_*.csv` files, and a report date (the last day of the week).
2. Add the *Output:* `PM_Report_YYYY-MM-DD.xlsx` with sheets **Summary** (KPIs + 2 charts), **Compliance by Zone** (13 weeks), **Overdue PMs**, and **Top 10 Downtime** (13 weeks).
3. Add the *Definitions:* on time = completed ≤ due. Overdue = PM, status Open, due before the report date.
4. Write and test each function in a notebook, then move it into the script:

   ```python
   def load_exports(folder):          # -> one DataFrame, dates parsed, duplicates removed
   def pm_compliance(pm, start, end, by=None)
   def build_report(df, report_date)  # -> summary, by_zone, overdue, top10, weekly
   ```

5. **Test against known answers.** For report date 28 June 2026:

   | KPI | Expected |
   |---|---|
   | Files loaded / work orders | 24 / 11,902 |
   | PM compliance this week | 80.2 % (96 due) |
   | PM compliance 13 weeks | 79.8 % (1,314 due) |
   | Worst zone (13 wks) | Primary Packing 63.8 % |
   | Overdue PMs | 14 |
   | Reactive jobs, 13 weeks | 121 |
   | Top downtime asset (13 wks) | LD-FLK-010, 9.6 h |

### Why it works

Small functions that each do **one** thing can be tested on their own, and you can check each against a number you already trust (from SQL or Power BI). When the report is wrong, you'll know which function to look at.

---

## Session 2 (1.5 h): Charts and Excel output

### Do it

1. Write `chart_compliance(by_zone, path)` and `chart_weekly(weekly, path)` with matplotlib (from Week 39), saving PNGs. Use `matplotlib.use("Agg")` at the top so it works without a screen, which matters for scheduled runs.
2. Write the Excel file:

   ```python
   with pd.ExcelWriter(out_file, engine="xlsxwriter", date_format="dd/mm/yyyy") as xw:
       summary.to_excel(xw, sheet_name="Summary", index=False, startrow=1)
       ws = xw.sheets["Summary"]
       ws.insert_image("D2", "compliance_by_zone.png", {"x_scale": 0.75, "y_scale": 0.75})
       by_zone.to_excel(xw, sheet_name="Compliance by Zone", index=False)
       ...
   ```

3. Add formatting: a bold coloured header row, column widths, `freeze_panes(1, 0)`, `autofilter`, and a `0.0%` format for compliance.
4. **Command-line options**:

   ```python
   import argparse
   from datetime import date
   p = argparse.ArgumentParser(description="Build the weekly PM report.")
   p.add_argument("--folder", type=Path, default=DEFAULT_FOLDER)
   p.add_argument("--report-date", type=date.fromisoformat, default=date(2026, 6, 28))
   p.add_argument("--out", type=Path, default=Path("reports"))
   args = p.parse_args()
   ```

   Run it: `python my_work\pm_report.py --report-date 2026-06-21`. Run `python my_work\pm_report.py --help` and argparse writes the help text for you.

---

## Weekend (2 h): Make it run itself

1. **A batch file** `run_pm_report.bat` in the repo root:

   ```bat
   @echo off
   cd /d "%~dp0"
   call .venv\Scripts\activate.bat
   python my_work\pm_report.py --out reports >> reports\log.txt 2>&1
   ```

2. **Task Scheduler**: Start → *Task Scheduler* → Create Basic Task → "Weekly PM report" → Weekly, Monday 06:00 → *Start a program* → browse to `run_pm_report.bat`. Right-click the task → **Run** to test it now.
3. Check `reports\log.txt` and the new `.xlsx`.
4. **Make the script robust**: what happens if the folder is empty? If one export has a missing column? Add a clear error message for each (`raise SystemExit("…")`) rather than a 40-line traceback.
5. Time how long the Excel version of this report would take you by hand. Write that number in your portfolio README. That's the "hours saved" claim.

> **At work:** never point a script at live systems or schedule anything on a work PC without permission. Build the habit at home, then propose it.

---

## Watch

- **Corey Schafer**: *"Corey Schafer Python argparse"* (or the official argparse tutorial, search *"argparse tutorial python docs"*).
- **Automate the Boring Stuff**: chapter 13 (Excel) and chapter 17 (scheduling).
- **xlsxwriter docs**: search *"xlsxwriter working with pandas"*.

---

## Check yourself

1. Why does the script use `matplotlib.use("Agg")`?
2. Why should the report date be an argument, not `date.today()`?
3. Your scheduled task "runs" but no report appears. What do you check?
4. How do you stop the same work order appearing twice if an export is accidentally copied into the folder twice?

<details>
<summary><strong>Answers</strong></summary>

1. `Agg` draws charts to files without opening a window. Scheduled tasks often run with no desktop session, and a GUI backend would fail.
2. So you can re-run any past week, and test against known answers. The default can still be "last Sunday" in real use: `date.today() - timedelta(days=date.today().weekday() + 1)`.
3. The log file (that's why output is redirected with `>> log.txt 2>&1`), the task's *Start in* folder, whether the venv path is right, and the task's *Last Run Result* code.
4. `df.drop_duplicates(subset="WO Number", keep="last")` after loading. The reference script does this.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1's spec and the three data functions tested against the expected-values table, Session 2 steps 1, 2 and 4 (charts with `Agg`, the multi-sheet Excel with images, argparse), and weekend steps 1 to 4 (batch file, Task Scheduler, log, a clear error on an empty folder). Week 42's done-when runs this script, so give it two sittings if you need them.
- **On your phone (10 min a day):** Watch the Corey Schafer argparse video, read *Automate the Boring Stuff* chapters 13 and 17 and the "Why it works" note on small testable functions, and answer Check yourself in your head. On the bus, estimate how long this report would take you by hand in Excel for weekend step 5.
- **Safe to skip this week:** Session 2 step 3 (bold header, column widths, freeze panes, autofilter) is cosmetic and can wait, along with the xlsxwriter docs.

---

## Tick off

- [ ] Spec written before code
- [ ] Each function tested against the expected-values table
- [ ] Formatted Excel output with charts embedded
- [ ] argparse options and `--help`
- [ ] Runs from Task Scheduler via a batch file, with a log
