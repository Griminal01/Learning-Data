# Data Skills Course: Reliability & Industrial Analytics

A 62-week, hands-on course that goes from Excel basics to machine learning, built around one goal: **turning maintenance and production data into better PM decisions.** It covers the tools a food manufacturing site actually runs on: Excel, SQL, Power BI, **Redzone OEE data in Tableau**, the CMMS (**Mainsaver**, moving to **Ultimo**), Python and reliability statistics. Every phase ends with something you could use on a real production line, so the learning pays off as you go, not just at the end.

Everything runs on a realistic **synthetic** data set for a fictional 7-zone cereal line ("Line D"): 292 assets, two years of PMs, breakdowns and downtime, Redzone-style shift and stop records, a CMMS migration example, plus vibration data. It's safe to use at home and safe to show in a public portfolio.

**Start:** Monday 2 November 2026 · **Pace:** about 5 hours a week · **Level:** complete beginner → reliability analyst

---

## Quick start

1. **Get the files.** Click the green **Code** button → **Download ZIP** and unzip it to `Documents\Learning-Data`. (From Week 33 you'll switch to `git clone`.)
2. **Open the tracker.** Double-click `index.html` to open **Data Skills Studio** in Edge. It tracks your ticks, done-when tests and weekly hours, and generates fresh practice data. (Or host it on GitHub Pages; see below.)
3. **Open Week 1:** [`course/phase-0-foundations/week-01-excel-basics.md`](course/phase-0-foundations/week-01-excel-basics.md), or click *Open Week 1* in the tracker.

The full dated schedule is in **[`course/README.md`](course/README.md)**.

---

## The seven phases (plus foundations)

| Phase | Weeks | You'll learn | You'll build | Done when… |
|---|---|---|---|---|
| **0 Foundations** | 1–2 | Excel from zero: formulas, references, SUMIFS, charts | a shift downtime summary | totals reconcile, with a clean chart |
| **1 Excel & Power Query** | 3–8 | Tables, XLOOKUP, dynamic arrays, LAMBDA, pivots, Power Query, Power Pivot | **PM compliance workbook** | a new export + Refresh All updates everything |
| **2 SQL & data modelling** | 9–14 | star schemas, keys, SELECT → JOIN → GROUP BY → CTE → window functions, data quality | **mini CMMS database** | top-10 reactive-loss assets *and* their PM compliance in one query |
| **3 Power BI** | 15–24 | modelling, DAX (CALCULATE, time intelligence), visuals, drill-through, RLS | **Line D maintenance dashboard** | the team could use it without you explaining it |
| **4 OEE, Redzone & Tableau** | 25–32 | OEE and the six big losses, operator-coded downtime, Tableau (calcs, LOD, dashboards, downloads), linking stops to work orders, Mainsaver → Ultimo | **OEE & maintenance impact dashboard** | OEE reconciles to the dashboard, and you show the maintenance share of lost time by asset |
| **5 Python** | 33–42 | Python, pandas, time series, plotting, automation, vibration trending | **automated weekly PM report** | an hour of Excel becomes one command |
| **6 Statistics & reliability** | 43–50 | distributions, tests, regression, SPC, MTBF/MTTR, **Weibull**, RCM, FMEA | **Weibull PM interval study** | you can defend a PM interval change with numbers |
| **7 ML & condition monitoring** | 51–62 | scikit-learn, precision/recall, forests, boosting, anomaly detection, FFT, RUL | **bearing anomaly detector** | you can explain why its alerts are worth acting on, and the false alarm rate |

**How each week works**

- **Session 1 and Session 2** (weekday evenings, 1.5 h each): *Do it* first, then *Why it works*.
- **Weekend** (2 h): practice or the phase build.
- **Watch**: the best free videos for the topic, *after* you've tried it.
- **Check yourself**: questions, with answers hidden in a collapsed section.
- **Tick off**: the same items appear in the tracker app.

---

## What's in this repo

```
course/            62 weekly lessons, one folder per phase, plus the dated schedule
data/              the practice data set (CSV, SQLite, exports, production, migration, vibration) and its generator
  README.md        data dictionary: every table and column explained
solutions/         worked SQL, Python, reliability and ML solutions (all tested against the data)
portfolio/         how to package each phase build for a public GitHub portfolio
my_work/           your own files go here
index.html         Data Skills Studio, the tracker app
tools/             build script that syncs the tracker with the lessons
requirements.txt   Python libraries for Phases 5-7
```

---

## Ground rules

- **Learn on your home PC.** Work laptops are often locked down. Check with IT before installing anything at work, especially Power BI Desktop.
- **Never take work data home** (CMMS exports, Redzone/Tableau downloads, condition-monitoring data, historian data) without written permission. Use the synthetic data here until you have it.
- **Never open work data in Tableau Public.** It publishes everything to a public website. Use it only with this course's synthetic data.
- **Never connect to a production PLC.** The PLC stretch in Week 42 is for authorised bench or training rigs only.
- **Don't move on until you pass each done-when test.**

---

## Tools you'll need

All free, except Microsoft 365, which you already have.

| Tool | Phase | Get it |
|---|---|---|
| Excel (Microsoft 365) | 0–1 | already installed |
| DB Browser for SQLite | 2 | [sqlitebrowser.org](https://sqlitebrowser.org/dl/) |
| Power BI Desktop | 3 | Microsoft Store |
| Tableau Public | 4 | [public.tableau.com](https://public.tableau.com) (or a Tableau for Students licence via your college, if eligible) |
| Python 3, VS Code, Git | 5–7 | [python.org](https://www.python.org/downloads/), [code.visualstudio.com](https://code.visualstudio.com), [git-scm.com](https://git-scm.com) |

The main free learning resources used throughout are Microsoft Learn (PL-300 path), ExcelJet, Leila Gharani, SQLBolt, Mode SQL Tutorial, SQLBI, Guy in a Cube, Tableau's free training videos, Andy Kriebel, Kaggle Learn, Corey Schafer, *Python for Data Analysis* (free online), *Automate the Boring Stuff* (free online), StatQuest, Khan Academy, the `reliability` library docs, and Andrew Ng's ML Specialization (free to audit).

**Certifications:** **PL-300** (Power BI Data Analyst) at the end of Phase 3 is the one worth paying for. **CMRP** is a reliability credential for later. Ask whether your training budget will cover either.

---

## Hosting the tracker on GitHub Pages

1. Push this repo to GitHub.
2. Go to **Settings → Pages → Build and deployment**: Source = *Deploy from a branch*, Branch = your default branch, folder = `/ (root)` → Save.
3. After a minute, the tracker is live at `https://<your-username>.github.io/<repo-name>/`.

Your progress is stored in the browser you use (localStorage), so use the same browser each time, and use **Settings → Export progress** for backups.

If you edit a lesson's title or its *Tick off* list, run `python tools/build_tracker.py` to update the app.

---

## Regenerating the data

```powershell
python data\generate_data.py
```

It uses only the Python standard library. Same seed, same data, so lesson answers always match. See [`data/README.md`](data/README.md) for what's in each file and how the simulation works.
