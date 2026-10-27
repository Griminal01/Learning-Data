# Week 31: Plotting with matplotlib, seaborn and plotly

**Phase 4 · Python for data** · Mon 31 May – Sun 6 Jun 2027 · about 5 hours

Python charts are code, so a chart you build once regenerates every week with new data. That's what the automated report next week relies on. This week you learn matplotlib properly (it's the base for everything else), then the quicker seaborn and interactive plotly.

**By Sunday you'll be able to:**

- build line, bar, scatter and histogram charts with matplotlib's `fig, ax` style
- apply the same declutter rules you used in Excel and Power BI
- make statistical charts quickly with seaborn
- make an interactive HTML chart with plotly
- save charts as PNG for reports

---

## Session 1 (1.5 h): matplotlib, the proper way

### Do it

```python
import matplotlib.pyplot as plt
import pandas as pd
from pathlib import Path
DATA = Path("..") / "data"

dt = pd.read_csv(DATA / "csv" / "downtime_events.csv", parse_dates=["start_datetime"])
weekly = (dt[dt["category"] == "Breakdown"].set_index("start_datetime")["duration_min"]
          .resample("W-SUN").sum() / 60)

fig, ax = plt.subplots(figsize=(9, 4))
ax.plot(weekly.index, weekly, color="#9E9E9E", linewidth=1, label="Weekly")
ax.plot(weekly.index, weekly.rolling(13).mean(), color="#1F4E79", linewidth=2.5, label="13-week average")
ax.set_title("Breakdown hours are flat at about 13 h a week", loc="left")
ax.set_ylabel("Hours")
ax.legend(frameon=False)
ax.spines[["top", "right"]].set_visible(False)
fig.tight_layout()
fig.savefig("breakdown_trend.png", dpi=150)
```

**A horizontal bar chart, worst first, with one highlight colour:**

```python
assets = pd.read_csv(DATA / "csv" / "assets.csv")
z = (dt[dt["category"] == "Breakdown"].merge(assets, on="asset_id")
       .groupby("zone")["duration_min"].sum().div(60).sort_values())
colours = ["#C62828" if v == z.max() else "#9E9E9E" for v in z]

fig, ax = plt.subplots(figsize=(7, 3.5))
ax.barh(z.index, z.values, color=colours)
for i, v in enumerate(z.values):
    ax.text(v + 3, i, f"{v:.0f} h", va="center")
ax.set_title("Flaking lost the most hours to breakdowns", loc="left")
ax.spines[["top", "right", "bottom"]].set_visible(False)
ax.set_xticks([])
fig.tight_layout()
```

### Why it works

Always use `fig, ax = plt.subplots()` and then call methods on `ax`. The quick `plt.plot()` style gets confusing as soon as there's more than one chart. `fig` is the whole picture (size, saving), and `ax` is one chart inside it (data, titles, axes).

The design rules are the same in every tool: a title that states the finding, grey for context, one strong colour for the point, and no chart junk.

---

## Session 2 (1.5 h): seaborn and plotly

### seaborn: statistical charts in one line

```python
import seaborn as sns
wo = pd.read_csv(DATA / "csv" / "work_orders.csv").merge(assets, on="asset_id")
r = wo[wo["wo_type"] == "Reactive"]

sns.boxplot(data=r, x="labour_hours", y="zone", color="#BBDEFB")     # spread of repair effort
sns.histplot(data=dt[dt["category"] == "Breakdown"], x="duration_min", bins=40, log_scale=True)
```

The histogram on a log scale shows breakdown durations are **right-skewed**: lots of short jobs and a long tail. Keep that in mind for Phase 5, because it's why averages can mislead.

### plotly: interactive HTML

```python
import plotly.express as px
fig = px.line(weekly.reset_index(), x="start_datetime", y="duration_min",
              title="Weekly breakdown hours (hover for values)")
fig.write_html("weekly_breakdowns.html")
```

Double-click the HTML file. You can zoom, hover and pan in any browser, and send it to someone without them needing Python.

---

## Weekend practice (2 h)

Make a **one-page chart pack** (`fig, axes = plt.subplots(2, 2, figsize=(12, 8))`), saved as a PNG:

1. Top left: PM compliance % by zone (2026), worst highlighted, with a 90 % target line (`ax.axvline`).
2. Top right: monthly reactive jobs, 2024–26, as a line.
3. Bottom left: Pareto of Q2 2026 breakdown hours by asset (top 10 bars, plus `ax2 = ax.twinx()` for the cumulative % line).
4. Bottom right: scatter of MTBF vs MTTR per asset, point size = breakdown hours.

Give every chart a finding-style title. Then do **Kaggle Learn: Data Visualization** ([kaggle.com/learn/data-visualization](https://www.kaggle.com/learn/data-visualization)).

---

## Watch

- **Corey Schafer**: the *"Corey Schafer matplotlib tutorial"* series, episodes 1–3.
- **Seaborn docs**: [seaborn.pydata.org/tutorial](https://seaborn.pydata.org/tutorial.html).
- **Plotly Express docs**: search *"plotly express python"*.

---

## Check yourself

1. What's the difference between `fig` and `ax`?
2. How do you put two y-axes on one chart (bars in hours plus a cumulative % line)?
3. Why plot breakdown durations on a log scale?
4. When would you choose plotly over matplotlib?

<details>
<summary><strong>Answers</strong></summary>

1. `fig` is the whole figure (size, layout, saving). `ax` is one set of axes, where the data and labels go. A figure can hold many axes.
2. `ax2 = ax.twinx()`, then plot the line on `ax2` and set `ax2.set_ylim(0, 100)`.
3. The values span 5 to 1,375 minutes. On a linear scale everything bunches up at the left and the long tail is invisible. A log scale spreads them out.
4. When the audience will explore it (hover, zoom) in a browser, or for dashboards. Use matplotlib for static, carefully designed images in reports and documents.

</details>

---

## Tick off

- [ ] `fig, ax` style with decluttered, finding-titled charts
- [ ] seaborn box plot and histogram
- [ ] Interactive plotly HTML
- [ ] 2×2 chart pack PNG
- [ ] Kaggle Data Visualization course
