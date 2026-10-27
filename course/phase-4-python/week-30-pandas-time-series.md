# Week 30: pandas 3, dates and time series

**Phase 4 · Python for data** · Mon 24 May – Sun 30 May 2027 · about 5 hours

Maintenance data is time data: when things fail, how long they're down, how a vibration reading drifts. pandas has the best time-series tools of anything you've used so far. This week: datetime indexes, resampling, rolling windows and year-on-year comparisons.

**By Sunday you'll be able to:**

- use the `.dt` accessor (hour, weekday, month, period)
- set a **DatetimeIndex** and `resample` to days, weeks or months
- calculate `rolling` windows and `pct_change`
- find patterns by hour and weekday

---

## Session 1 (1.5 h): Resampling

### Do it

```python
import pandas as pd
from pathlib import Path
DATA = Path("..") / "data"

dt = pd.read_csv(DATA / "csv" / "downtime_events.csv", parse_dates=["start_datetime", "end_datetime"])
bd = (dt[dt["category"] == "Breakdown"]
      .set_index("start_datetime")
      .sort_index())

weekly = bd["duration_min"].resample("W-SUN").sum() / 60      # weeks ending Sunday
monthly = bd["duration_min"].resample("MS").sum() / 60        # MS = month start label

print(len(weekly), weekly.idxmax(), round(weekly.max(), 1))
monthly.tail(6).round(1)
```

There are 105 weeks. The worst week ended **4 Jan 2026**, with 39.4 h (that's the New Year's Eve bearing job from Week 10). The 2026 months run Jan 49.4, Feb 43.0, Mar 31.3, Apr 41.9, May 56.7, Jun 44.6.

```python
# Rolling 13-week total: compare with Power BI R13W in Week 19
rolling = weekly.rolling(13).sum()
rolling.loc["2026-06-28"]          # 139.4 h, the same answer as DAX

# Year on year
yoy = monthly.pct_change(12) * 100
yoy.loc["2026-06-01"]              # -15.5 % (June 2026 vs June 2025)
```

### Why it works

`resample` is `groupby` for time: it buckets rows into regular periods and aggregates them. **Weeks with no breakdowns still appear** (as 0), unlike a plain groupby. That's essential for honest trend charts. `"W-SUN"` means weeks ending Sunday, matching a Monday-start working week.

`rolling(13)` looks back 13 rows. Because the rows are now evenly spaced weeks, that's exactly 13 weeks.

---

## Session 2 (1.5 h): Patterns in time

### Do it

```python
dt["hour"] = dt["start_datetime"].dt.hour
dt["weekday"] = dt["start_datetime"].dt.day_name()
dt["month"] = dt["start_datetime"].dt.to_period("M")

# Minor stops by hour
dt[dt["category"] == "Minor stop"].groupby("hour").size()

# Breakdown hours by weekday, in Mon-Sun order
order = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
(dt[dt["category"] == "Breakdown"]
   .groupby("weekday")["duration_min"].sum()
   .reindex(order) / 60).round(1)

# Shift view: days 06:00-18:00, nights otherwise
dt["shift"] = dt["hour"].between(6, 17).map({True: "Days", False: "Nights"})
dt.pivot_table(index="shift", columns="category", values="duration_min", aggfunc="sum") / 60
```

**Time between failures with `diff`:**

```python
wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["raised_datetime"])
r = wo[wo["wo_type"] == "Reactive"].sort_values(["asset_id", "raised_datetime"])
r["days_since_last"] = r.groupby("asset_id")["raised_datetime"].diff().dt.total_seconds() / 86400
r.loc[r["asset_id"] == "LD-PPK-005", ["raised_datetime", "failure_code", "days_since_last"]].head()
```

That's the SQL `LAG` from Week 13 in one line. Keep `days_since_last`, because Phase 5 fits a Weibull distribution to exactly this kind of column.

---

## Weekend practice (2 h)

1. **Weekly reactive jobs** and their 4-week rolling mean, for Primary Packing only.
2. **PM compliance by due week** for 2026, then a 13-week rolling compliance (hint: resample the on-time *count* and the due *count* separately, roll both, then divide).
3. **MTTR trend**: monthly mean breakdown duration in hours. Is it getting better?
4. **Busiest hour** for minor stops. In this data, it's **21:00**. Is that real, or noise? Look at how much the counts per hour vary before you claim a pattern. (Phase 5 gives you the statistics to answer properly.)
5. Kaggle Learn Pandas: finish the course.

---

## Watch

- **Corey Schafer**: *"Corey Schafer pandas datetime"*.
- **Data School**: *"Data School pandas resample"*.
- McKinney's book, chapter 11 (time series).

---

## Check yourself

1. Why use `resample("W-SUN")` rather than `groupby(dt.dt.isocalendar().week)`?
2. What does `rolling(13).sum()` return for the first 12 weeks, and why?
3. `diff()` on the raised dates gives a `Timedelta`. How do you turn it into days with decimals?
4. Your weekly chart shows a huge spike. What's the first thing you check?

<details>
<summary><strong>Answers</strong></summary>

1. `resample` keeps the real dates, fills empty weeks with 0, and never mixes up week 1 of 2025 with week 1 of 2026. A week-number groupby loses the year and drops empty weeks.
2. `NaN`, because there aren't 13 values yet. Use `rolling(13, min_periods=1)` if you want a partial window, but be clear on the chart that the early points are partial.
3. `.dt.total_seconds() / 86400`. (`.dt.days` gives whole days only.)
4. The raw events behind it: is it one huge event (a single outlier like the 1,375-min bearing job) or many? Check with `bd.loc["2025-12-29":"2026-01-04"]`.

</details>

---

## Tick off

- [ ] Weekly/monthly resampling with empty periods kept
- [ ] Rolling 13 weeks matches Power BI (139.4 h)
- [ ] Hour, weekday and shift patterns
- [ ] Days between failures with `groupby().diff()`
- [ ] Kaggle Pandas course complete
