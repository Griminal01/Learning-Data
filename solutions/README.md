# Solutions

Worked answers for the code-heavy weeks. **Every file here has been run against the course data**, and the numbers quoted in the lessons come from these files.

Try each exercise yourself first. Open these when you're stuck, or to compare approaches afterwards.

| Folder | Weeks | Files |
|---|---|---|
| `phase-2-sql/` | 10–14 | one `.sql` file per week. Open them in DB Browser against `data/line_d.db`, or run `python solutions/phase-2-sql/run.py solutions/phase-2-sql/w13_window_reliability.sql` |
| `phase-4-python/` | 26–34 | core Python and pandas examples, `weekly_pm_report.py` (the Phase 4 build) and `vibration_trend.py` |
| `phase-5-reliability/` | 35–42 | statistics, SPC and reliability scripts, and `weibull_study.py` (the Phase 5 build) |
| `phase-6-ml/` | 43–53 | supervised ML, unsupervised learning, signals and RUL scripts, and `anomaly_detector.py` (the Phase 6 build) |

Python scripts need the course virtual environment (Week 25):

```powershell
.\.venv\Scripts\Activate.ps1
python solutions\phase-4-python\weekly_pm_report.py --report-date 2026-06-28
python solutions\phase-5-reliability\weibull_study.py
python solutions\phase-6-ml\anomaly_detector.py --threshold 6
```

Scripts that write charts or reports put them in a `reports/` folder under wherever you run them from. That folder is git-ignored.
