# Solutions

Worked answers for the code-heavy weeks. **Every file here has been run against the course data**, and the numbers quoted in the lessons come from these files.

Try each exercise yourself first. Open these when you're stuck, or to compare approaches afterwards.

| Folder | Weeks | Files |
|---|---|---|
| `phase-2-sql/` | 10–14 | one `.sql` file per week. Open them in DB Browser against `data/line_d.db`, or run `python solutions/phase-2-sql/run.py solutions/phase-2-sql/w13_window_reliability.sql` |
| `phase-4-production/` | 25–31 | OEE and loss SQL, linking Redzone-style stops to work orders, and CMMS migration checks. Run them like the Phase 2 files. |
| `phase-5-python/` | 34–42 | core Python and pandas examples, `weekly_pm_report.py` (the Phase 5 build) and `vibration_trend.py` |
| `phase-6-reliability/` | 43–50 | statistics, SPC and reliability scripts, and `weibull_study.py` (the Phase 6 build) |
| `phase-7-ml/` | 51–61 | supervised ML, unsupervised learning, signals and RUL scripts, and `anomaly_detector.py` (the Phase 7 build) |

Python scripts need the course virtual environment (Week 33):

```powershell
.\.venv\Scripts\Activate.ps1
python solutions\phase-5-python\weekly_pm_report.py --report-date 2026-06-28
python solutions\phase-6-reliability\weibull_study.py
python solutions\phase-7-ml\anomaly_detector.py --threshold 6
```

Scripts that write charts or reports put them in a `reports/` folder under wherever you run them from. That folder is git-ignored.
