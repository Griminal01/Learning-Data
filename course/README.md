# Course schedule

62 weeks, about 5 hours a week, starting **Monday 2 November 2026**. Each week is one lesson file, with two 1.5-hour weekday sessions and a 2-hour weekend block.

**Rules of the course**

- Each phase ends with a **done when** test. Don't move on until you pass it. (The tracker app locks the next phase until you tick it.)
- Each lesson is **hands-on first**: do the task, *then* read why it works, *then* watch the videos.
- Answers are hidden in a collapsed **Answers** section at the end of every lesson. Try first.
- Fallen behind? That's normal. Move the start date in the tracker's Settings and every date shifts. Don't skip a done-when test to catch up.
- Every fourth week, take 15 minutes to review: are you on pace, and is the build on track?

| Phase | Weeks | Focus |
|---|---|---|
| 0 | 1–2 | Foundations |
| 1 | 3–8 | Advanced Excel & Power Query |
| 2 | 9–14 | Data modelling & SQL |
| 3 | 15–24 | Power BI |
| 4 | 25–32 | Production data: OEE, Redzone & Tableau |
| 5 | 33–42 | Python for data |
| 6 | 43–50 | Statistics & reliability analytics |
| 7 | 51–62 | Machine learning & condition monitoring |


### Phase 0: Foundations

**Done when:** You built the two-week downtime summary with SUMIFS formulas that reconcile to 124 events / 1,931 minutes, plus a decluttered chart.

| Week | Dates | Lesson |
|---|---|---|
| 1 | 02 Nov 2026 – 08 Nov | [Excel basics, your first look at downtime data](phase-0-foundations/week-01-excel-basics.md) |
| 2 | 09 Nov 2026 – 15 Nov | [Summarising and charting](phase-0-foundations/week-02-excel-summaries-charts.md) |

### Phase 1: Advanced Excel & Power Query

**Done when:** You drop a new export into the folder, press Refresh All, and every table and chart updates with zero manual edits.

| Week | Dates | Lesson |
|---|---|---|
| 3 | 16 Nov 2026 – 22 Nov | [Structured Tables and XLOOKUP](phase-1-excel-power-query/week-03-tables-xlookup.md) |
| 4 | 23 Nov 2026 – 29 Nov | [Cleaning messy data and formula-based conditional formatting](phase-1-excel-power-query/week-04-cleaning-conditional-formatting.md) |
| 5 | 30 Nov 2026 – 06 Dec | [Dynamic arrays, LET and LAMBDA](phase-1-excel-power-query/week-05-dynamic-arrays-lambda.md) |
| 6 | 07 Dec 2026 – 13 Dec | [PivotTables, PivotCharts, slicers and a downtime Pareto](phase-1-excel-power-query/week-06-pivottables-pareto.md) |
| 7 | 14 Dec 2026 – 20 Dec | [Power Query, import, clean and combine automatically](phase-1-excel-power-query/week-07-power-query.md) |
| 8 | 21 Dec 2026 – 27 Dec | [Power Pivot, first DAX, and the Phase 1 build](phase-1-excel-power-query/week-08-power-pivot-phase1-build.md) |

### Phase 2: Data modelling & SQL

**Done when:** You can answer 'which 10 assets lost the most hours to reactive work last quarter, and were their PMs on time?' in one query.

| Week | Dates | Lesson |
|---|---|---|
| 9 | 28 Dec 2026 – 03 Jan | [Data modelling, how a CMMS stores its data](phase-2-sql/week-09-data-modelling.md) |
| 10 | 04 Jan 2027 – 10 Jan | [SQL core, SELECT, WHERE and ORDER BY](phase-2-sql/week-10-sql-select-where.md) |
| 11 | 11 Jan 2027 – 17 Jan | [JOINs, GROUP BY and HAVING](phase-2-sql/week-11-joins-groupby.md) |
| 12 | 18 Jan 2027 – 24 Jan | [CASE, CTEs and dates](phase-2-sql/week-12-case-cte-dates.md) |
| 13 | 25 Jan 2027 – 31 Jan | [Window functions, MTBF and MTTR](phase-2-sql/week-13-window-functions-mtbf.md) |
| 14 | 01 Feb 2027 – 07 Feb | [Data quality, and the Phase 2 build](phase-2-sql/week-14-data-quality-phase2-build.md) |

### Phase 3: Power BI

**Done when:** The Model Line team could use the dashboard in a weekly review without you explaining it.

| Week | Dates | Lesson |
|---|---|---|
| 15 | 08 Feb 2027 – 14 Feb | [Power BI Desktop and getting data in](phase-3-power-bi/week-15-power-bi-desktop-get-data.md) |
| 16 | 15 Feb 2027 – 21 Feb | [Modelling, star schema, relationships and the date table](phase-3-power-bi/week-16-modelling-star-schema.md) |
| 17 | 22 Feb 2027 – 28 Feb | [DAX 1, measures vs calculated columns](phase-3-power-bi/week-17-dax-measures-basics.md) |
| 18 | 01 Mar 2027 – 07 Mar | [DAX 2, CALCULATE and filter context](phase-3-power-bi/week-18-calculate-filter-context.md) |
| 19 | 08 Mar 2027 – 14 Mar | [DAX 3, time intelligence, variables and USERELATIONSHIP](phase-3-power-bi/week-19-time-intelligence.md) |
| 20 | 15 Mar 2027 – 21 Mar | [Visuals, KPI cards, Pareto and matrix formatting](phase-3-power-bi/week-20-visuals-kpis-pareto.md) |
| 21 | 22 Mar 2027 – 28 Mar | [Interactivity, drill-through, tooltips and bookmarks](phase-3-power-bi/week-21-drillthrough-tooltips-bookmarks.md) |
| 22 | 29 Mar 2027 – 04 Apr | [Report design, and building the Model Line dashboard](phase-3-power-bi/week-22-report-design-build.md) |
| 23 | 05 Apr 2027 – 11 Apr | [Power BI Service, sharing, refresh and row-level security](phase-3-power-bi/week-23-service-rls-power-platform.md) |
| 24 | 12 Apr 2027 – 18 Apr | [Finish the dashboard, done-when test, PL-300 plan](phase-3-power-bi/week-24-phase3-done-when-pl300.md) |

### Phase 4: Production data: OEE, Redzone & Tableau

**Done when:** You can rebuild line OEE from raw shift data to match the dashboard, and show in Tableau what share of lost time is maintenance-related and which assets drive it.

| Week | Dates | Lesson |
|---|---|---|
| 25 | 19 Apr 2027 – 25 Apr | [OEE fundamentals, from shift data to one honest number](phase-4-production-oee-tableau/week-25-oee-fundamentals.md) |
| 26 | 26 Apr 2027 – 02 May | [Downtime reasons, the six big losses, and operator-coded data](phase-4-production-oee-tableau/week-26-downtime-reasons-six-big-losses.md) |
| 27 | 03 May 2027 – 09 May | [Tableau 1, getting started with Tableau Public](phase-4-production-oee-tableau/week-27-tableau-basics.md) |
| 28 | 10 May 2027 – 16 May | [Tableau 2, calculated fields, LOD expressions and table calculations](phase-4-production-oee-tableau/week-28-tableau-calculations-lod.md) |
| 29 | 17 May 2027 – 23 May | [Tableau 3, dashboards, and getting data *out* of Tableau](phase-4-production-oee-tableau/week-29-tableau-dashboards-downloads.md) |
| 30 | 24 May 2027 – 30 May | [Linking production downtime to maintenance work orders](phase-4-production-oee-tableau/week-30-link-production-maintenance.md) |
| 31 | 31 May 2027 – 06 Jun | [The CMMS from an end user's side, Mainsaver to Ultimo](phase-4-production-oee-tableau/week-31-cmms-mainsaver-to-ultimo.md) |
| 32 | 07 Jun 2027 – 13 Jun | [Phase 4 build, the OEE & maintenance impact dashboard](phase-4-production-oee-tableau/week-32-oee-maintenance-dashboard-done-when.md) |

### Phase 5: Python for data

**Done when:** A task that took you an hour a week in Excel now runs from a single command.

| Week | Dates | Lesson |
|---|---|---|
| 33 | 14 Jun 2027 – 20 Jun | [Setup, Python, VS Code, virtual environments, Jupyter and Git](phase-5-python/week-33-setup-python-vscode-git.md) |
| 34 | 21 Jun 2027 – 27 Jun | [Core Python 1, values, lists, dictionaries, loops and decisions](phase-5-python/week-34-core-python-1.md) |
| 35 | 28 Jun 2027 – 04 Jul | [Core Python 2, functions, files, errors and modules](phase-5-python/week-35-core-python-2.md) |
| 36 | 05 Jul 2027 – 11 Jul | [pandas 1, reading, inspecting, selecting and filtering](phase-5-python/week-36-pandas-1.md) |
| 37 | 12 Jul 2027 – 18 Jul | [pandas 2, cleaning, merging, groupby and pivot](phase-5-python/week-37-pandas-2.md) |
| 38 | 19 Jul 2027 – 25 Jul | [pandas 3, dates and time series](phase-5-python/week-38-pandas-time-series.md) |
| 39 | 26 Jul 2027 – 01 Aug | [Plotting with matplotlib, seaborn and plotly](phase-5-python/week-39-plotting.md) |
| 40 | 02 Aug 2027 – 08 Aug | [Automation, the weekly PM report script](phase-5-python/week-40-automation-weekly-report.md) |
| 41 | 09 Aug 2027 – 15 Aug | [Vibration trend analysis](phase-5-python/week-41-vibration-trend-analysis.md) |
| 42 | 16 Aug 2027 – 22 Aug | [Phase 5 done-when, portfolio, and the PLC stretch](phase-5-python/week-42-phase5-done-when-plc.md) |

### Phase 6: Statistics & reliability analytics

**Done when:** You can defend a PM interval change with numbers in front of an engineering manager.

| Week | Dates | Lesson |
|---|---|---|
| 43 | 23 Aug 2027 – 29 Aug | [Descriptive statistics and distributions](phase-6-statistics-reliability/week-43-descriptive-stats-distributions.md) |
| 44 | 30 Aug 2027 – 05 Sep | [Confidence intervals and hypothesis testing](phase-6-statistics-reliability/week-44-confidence-intervals-hypothesis-tests.md) |
| 45 | 06 Sep 2027 – 12 Sep | [Regression, and did the PM actually make a difference?](phase-6-statistics-reliability/week-45-regression-confounding.md) |
| 46 | 13 Sep 2027 – 19 Sep | [SPC, control charts, run rules and capability](phase-6-statistics-reliability/week-46-spc-control-charts-capability.md) |
| 47 | 20 Sep 2027 – 26 Sep | [Reliability metrics, failure rate and the bathtub curve](phase-6-statistics-reliability/week-47-reliability-metrics-bathtub.md) |
| 48 | 27 Sep 2027 – 03 Oct | [Weibull analysis](phase-6-statistics-reliability/week-48-weibull-analysis.md) |
| 49 | 04 Oct 2027 – 10 Oct | [From Weibull to PM decisions, optimal intervals, P-F, RCM and FMEA](phase-6-statistics-reliability/week-49-pm-intervals-pf-rcm-fmea.md) |
| 50 | 11 Oct 2027 – 17 Oct | [Phase 6 build, the Weibull PM interval study](phase-6-statistics-reliability/week-50-weibull-study-done-when.md) |

### Phase 7: Machine learning & condition monitoring

**Done when:** You can explain to a non-specialist why your model's alerts are worth acting on, and how many false alarms to expect.

| Week | Dates | Lesson |
|---|---|---|
| 51 | 18 Oct 2027 – 24 Oct | [Machine learning basics, and the leakage trap](phase-7-ml-condition-monitoring/week-51-ml-basics.md) |
| 52 | 25 Oct 2027 – 31 Oct | [Evaluation, precision, recall and the cost of false alarms](phase-7-ml-condition-monitoring/week-52-evaluation-metrics.md) |
| 53 | 01 Nov 2027 – 07 Nov | [Linear and logistic regression in scikit-learn](phase-7-ml-condition-monitoring/week-53-linear-logistic-regression.md) |
| 54 | 08 Nov 2027 – 14 Nov | [Decision trees and random forests](phase-7-ml-condition-monitoring/week-54-decision-trees-random-forest.md) |
| 55 | 15 Nov 2027 – 21 Nov | [Gradient boosting, tuning, and "is ML worth it?"](phase-7-ml-condition-monitoring/week-55-gradient-boosting-tuning.md) |
| 56 | 22 Nov 2027 – 28 Nov | [Unsupervised learning, clustering assets with k-means](phase-7-ml-condition-monitoring/week-56-clustering-kmeans.md) |
| 57 | 29 Nov 2027 – 05 Dec | [Anomaly detection, finding "not normal" without failure labels](phase-7-ml-condition-monitoring/week-57-anomaly-detection.md) |
| 58 | 06 Dec 2027 – 12 Dec | [Vibration signal features, RMS, peak, crest factor and kurtosis](phase-7-ml-condition-monitoring/week-58-vibration-signal-features.md) |
| 59 | 13 Dec 2027 – 19 Dec | [FFT, frequency bands and bearing defect frequencies](phase-7-ml-condition-monitoring/week-59-fft-bearing-frequencies.md) |
| 60 | 20 Dec 2027 – 26 Dec | [Remaining useful life (RUL) prediction, and its limits](phase-7-ml-condition-monitoring/week-60-rul-prediction-limits.md) |
| 61 | 27 Dec 2027 – 02 Jan | [Phase 7 build, the bearing anomaly detector](phase-7-ml-condition-monitoring/week-61-anomaly-detector-build.md) |
| 62 | 03 Jan 2028 – 09 Jan | [Phase 7 done-when, the finished portfolio, and what's next](phase-7-ml-condition-monitoring/week-62-done-when-portfolio-next-steps.md) |
