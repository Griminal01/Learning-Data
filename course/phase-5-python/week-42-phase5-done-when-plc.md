# Week 42: Phase 5 done-when, portfolio, and the PLC stretch

**Phase 5 · Python for data** · Mon 16 Aug – Sun 22 Aug 2027 · about 5 hours

> **Done when:** a task that took you an hour a week in Excel now runs from a **single command**.

This week you finish and prove that, package two portfolio projects, and (as a stretch) read live tags from a PLC with Python.

---

## Session 1 (1.5 h): Done-when test

### Do it

1. Close everything. Open a **fresh** terminal in the repo.
2. Run your report with one command:

   ```powershell
   .\.venv\Scripts\Activate.ps1
   python my_work\pm_report.py --report-date 2026-06-28
   ```

3. Open the Excel file. Check every KPI against the Week 40 expected-values table.
4. Run it for **three different weeks** (`--report-date 2026-06-14`, `2026-05-31`, `2026-03-29`). Each run should work with no edits to the code.
5. Time it. Compare that with your estimate of doing the same report by hand in Excel.
6. If all of that holds: **Phase 5 passed.** 🎉

### Code quality pass

- Every function has a docstring.
- There are no hard-coded paths except defaults built from `Path(__file__)`.
- The script fails with a clear message (not a traceback) on an empty folder.
- Run `pip install ruff` then `ruff check my_work`, and fix what it reports. *Linting* is how professionals keep code tidy.

---

## Session 2 (1.5 h): Portfolio

Create two folders in your portfolio repo:

**`05-automated-pm-report/`**
- `pm_report.py`, `requirements.txt`, `run_pm_report.bat`
- `sample_output/`: one generated Excel report and the PNG charts
- `README.md`: the problem (*"a weekly PM report took ~1 h of copy-paste"*), what it does, how to run it, the KPI definitions, and the time saved

**`06-vibration-trend/`**
- `vibration_trend.py` and the trend chart
- `README.md`: the P-F story in plain English. *"Two bearings failed. An alert at 2.8 mm/s gave 30 and 64 days' warning. With monthly routes, B5 could have been missed, which supports continuous monitoring on critical fans."*

A good README has a **screenshot at the top**. People decide in five seconds whether to keep reading.

---

## Weekend stretch (2 h): Reading PLC tags with pycomm3

You work with Allen-Bradley kit, so this is the bridge between your two worlds. [`pycomm3`](https://github.com/ottowayi/pycomm3) is an open-source Python library that talks EtherNet/IP to Logix controllers (ControlLogix, CompactLogix) and, through `SLCDriver`, to SLC 500 and MicroLogix.

> ⚠️ **Safety and permission first.** Only ever connect to a **training rig or bench PLC** you're authorised to use, on an isolated network. **Never** connect to a production controller without written permission from the controls/automation owner. Even read-only traffic can affect a busy controller or network. **Never write tags** to anything but a bench rig.

### If you have access to a bench CompactLogix/ControlLogix

```python
from pycomm3 import LogixDriver

with LogixDriver("192.168.1.10") as plc:        # the bench PLC's IP (and /slot if needed)
    print(plc.info)                               # controller name, revision
    print(plc.read("Motor1_Running"))             # one tag
    print(plc.read("Motor1_Current", "Line_Speed"))
    tags = plc.get_tag_list()                     # browse the controller's tags
```

Then log a tag every 5 seconds to CSV for 10 minutes, and plot it with your Week 39 code. Notice what you've built: a tiny **historian**. Real ones (FactoryTalk Historian, AVEVA PI) do the same at scale, and they're where real process data lives for Phases 6 and 7.

### If you don't have a rig

- Read the pycomm3 docs and examples. Note how `read()` returns a `Tag` object with `.value` and `.error`.
- Write the logging loop anyway, against a **fake** reader:
  ```python
  import random, time
  def read_tag(name):
      return 20 + random.gauss(0, 0.5)
  ```
  When you get rig access, you swap one function. (It's the same "separate I/O from logic" idea as Week 41.)
- Ask at work whether there's a training panel you could use under supervision.

---

## Watch

- **pycomm3 docs**: search *"pycomm3 documentation LogixDriver"*.
- **Ruff**: search *"ruff python linter"* and skim the quick start.
- Search *"what is a process historian"* for a short explainer. It's worth understanding before Phase 6.

---

## Check yourself: Phase 5 review

1. Write a pandas pipeline from memory: read `work_orders.csv`, keep Reactive, merge zone, and count jobs per zone, sorted.
2. What does `validate="many_to_one"` do in a merge?
3. Explain `resample` vs `groupby` for time data.
4. What are the three parts of a scheduled-script setup on Windows?
5. Why should a production PLC never be your test target?

<details>
<summary><strong>Answers</strong></summary>

1. ```python
   (pd.read_csv("work_orders.csv")
      .query("wo_type == 'Reactive'")
      .merge(pd.read_csv("assets.csv")[["asset_id", "zone"]], on="asset_id", validate="many_to_one")
      .groupby("zone").size().sort_values(ascending=False))
   ```
2. It checks that each key on the right appears only once, and raises an error instead of silently duplicating rows.
3. `resample` buckets by regular time periods using a DatetimeIndex, and keeps empty periods. `groupby` groups by whatever values exist, so empty periods disappear.
4. The script (with argparse defaults), a batch file that activates the venv and logs output, and a Task Scheduler trigger.
5. Safety, production risk, and company policy: extra network and CPU load, the chance of a bad write, and it's someone else's system. Only use authorised bench equipment.

</details>

---

## Tick off

- [ ] **Done-when passed**: one command, three weeks, all KPIs correct
- [ ] Ruff clean, docstrings, clear errors
- [ ] Portfolio folders 04 and 05 with READMEs and screenshots
- [ ] pycomm3 stretch attempted (rig) or simulated (no rig)
