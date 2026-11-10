# Week 37: pandas 2, cleaning, merging, groupby and pivot

**Phase 5 · Python for data** · Mon 12 Jul – Sun 18 Jul 2027 · about 5 hours

This week you redo Phase 1 and 2 work in pandas: clean the dirty export, join tables, and summarise by group. You'll see why analysts move to Python. The Week 4 cleaning that took a whole evening of Excel formulas takes about ten lines here.

**By Sunday you'll be able to:**

- clean text with `.str` methods and regular expressions
- remove duplicates and convert messy numbers
- `merge` DataFrames (left, inner) and validate the join
- `groupby` + `agg` with named outputs
- build `pivot_table`s

---

## Session 1 (1.5 h): Clean the dirty export

### Do it

```python
import pandas as pd
from pathlib import Path
DATA = Path("..") / "data"

dirty = pd.read_csv(DATA / "dirty" / "wo_export_q1_2026_dirty.csv", dtype=str, keep_default_na=False)
assets = pd.read_csv(DATA / "csv" / "assets.csv")
print(len(dirty), dirty["WO Number"].nunique())        # 1499 1470

clean = dirty.drop_duplicates().copy()

clean["Asset"] = (clean["Asset"]
    .str.strip()
    .str.upper()
    .str.replace(" ", "-", regex=False)
    .str.replace(r"^LD-?([A-Z]{3})-?(\d{3})$", r"LD-\1-\2", regex=True))

clean["Labour Hrs"] = pd.to_numeric(clean["Labour Hrs"].str.replace("h", "", regex=False), errors="coerce")

clean = clean.merge(assets[["asset_id", "zone"]], left_on="Asset", right_on="asset_id",
                    how="left", validate="many_to_one")

print(len(clean), clean["asset_id"].isna().sum(), round(clean["Labour Hrs"].sum(), 2))
# 1470 0 1124.02
```

That matches your Week 4 Excel result exactly: 1,470 rows, every asset matched, 1,124.02 labour hours.

### Why it works

- `dtype=str, keep_default_na=False` reads everything as text with blanks as `""`, so you see the raw mess and decide what to do with it.
- `.str` gives you Excel-style text functions for a whole column at once.
- The **regular expression** `^LD-?([A-Z]{3})-?(\d{3})$` means: starts with LD, an optional dash, three capital letters (captured as group 1), an optional dash, three digits (group 2), end. `r"LD-\1-\2"` rebuilds it in the standard form. Regex is worth learning a little of; [regex101.com](https://regex101.com) lets you test patterns.
- `errors="coerce"` turns anything unconvertible into `NaN` instead of crashing.
- `validate="many_to_one"` makes pandas **raise an error** if the asset table has duplicate keys. That's the fan-out guard from Week 11, built in. Use it on every merge.

---

## Session 2 (1.5 h): groupby and pivot_table

### Do it

```python
wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["raised_datetime", "due_date", "completed_date"])
wo = wo.merge(assets[["asset_id", "zone", "asset_type", "criticality"]], on="asset_id",
              how="left", validate="many_to_one")

by_zone = (wo[wo["wo_type"] == "Reactive"]
           .groupby("zone")
           .agg(jobs=("wo_id", "count"),
                labour_hrs=("labour_hours", "sum"),
                failing_assets=("asset_id", "nunique"))
           .sort_values("jobs", ascending=False))
by_zone["jobs_per_failing_asset"] = by_zone["jobs"] / by_zone["failing_assets"]
by_zone.round(1)
```

Primary Packing has 292 jobs over 39 failing assets (**7.5 per asset**). Flaking has the most labour (519.7 h).

```python
# PM compliance heat-map: zone × month, H1 2026
pm = wo[wo["wo_type"] == "PM"].copy()
pm["on_time"] = pm["completed_date"].le(pm["due_date"])
pm["due_month"] = pm["due_date"].dt.to_period("M")

pivot = pm[pm["due_date"] >= "2026-01-01"].pivot_table(
    index="zone", columns="due_month", values="on_time", aggfunc="mean")
(pivot * 100).round(0)
```

Primary Packing sits between **59 % and 70 %** every month. It's a consistent problem, not a blip.

```python
# Style it like conditional formatting (in a notebook)
(pivot * 100).round(0).style.background_gradient(cmap="RdYlGn", vmin=50, vmax=100)
```

### Why it works

`groupby` is SQL's `GROUP BY`, and `agg(name=(column, function))` is the `SELECT` list with aliases. `pivot_table` is an Excel PivotTable. **`completed_date.le(due_date)`** returns False when `completed_date` is missing (NaT), so missed PMs count as not on time, which matches the SQL CASE logic.

---

## Weekend practice (2 h)

1. **Recreate the Phase 2 done-when query in pandas**: the top 10 assets by Q2 2026 breakdown downtime hours, with their Q2 PM on-time %. Check it against the Week 14 table.
2. **Planned vs reactive** labour hours by zone, as a pivot with zones as rows and WO types as columns, then add a "% reactive" column.
3. **Repeat failures**: for each asset, sort reactive jobs by date, use `groupby("asset_id")["raised_datetime"].diff()` to get the gap, and count gaps under 7 days. The answer is **68**, the same as the SQL LAG in Week 13.
4. Kaggle Learn Pandas, lessons 4–6.

---

## Watch

- **Corey Schafer**: pandas episodes 5–8 (updating, adding/removing, sorting, grouping).
- **Data School (Kevin Markham)**: *"Data School pandas merge"*.
- McKinney's book, chapters 7 (cleaning), 8 (merge, reshape) and 10 (groupby).

---

## Check yourself

1. What does `validate="many_to_one"` protect you from?
2. What's the difference between `.agg(jobs=("wo_id", "count"))` and `.size()`?
3. Why read the dirty file with `dtype=str`?
4. Write the pandas for: count of PMs by `task_type`, from `pm_tasks.csv`.

<details>
<summary><strong>Answers</strong></summary>

1. Duplicate keys in the right-hand table, which would multiply rows (fan-out) and inflate totals. pandas raises a `MergeError` instead of silently producing wrong numbers.
2. `count` counts non-null values in that column. `size()` counts rows, nulls included. For a key column like `wo_id` (never null) they're the same.
3. So pandas doesn't guess. It might turn `005` into 5, or `1.5h` into NaN, before you've had a chance to see the problem. Read raw, inspect, then convert on purpose.
4. `pd.read_csv(DATA / "csv" / "pm_tasks.csv")["task_type"].value_counts()`

Full worked code is in [`solutions/phase-5-python/w36_w38_pandas.py`](../../solutions/phase-5-python/w36_w38_pandas.py).

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1's clean of the dirty export (1,470 rows, 0 unmatched, 1,124.02 h) with `validate=` on the merge, Session 2's groupby summary and the zone by month compliance pivot, and weekend items 1 and 3: the Phase 2 done-when in pandas and the repeat-failure count of 68.
- **On your phone (10 min a day):** Watch Corey Schafer's pandas episodes 5 to 8 and the Data School merge video, read the "Why it works" bullets on regex, `errors="coerce"` and `validate`, and answer Check yourself in your head. You can try the asset regex on regex101.com in a phone browser.
- **Safe to skip this week:** Weekend item 2 (planned versus reactive pivot), the `.style` gradient, Kaggle Pandas lessons 4 to 6 and the McKinney chapters can wait.

---

## Tick off

- [ ] Dirty export cleaned in pandas, matching the Excel result (1,470 rows, 1,124.02 h)
- [ ] Merges with `validate=` on every one
- [ ] groupby/agg summary and a styled pivot heat-map
- [ ] Phase 2 done-when recreated in pandas
- [ ] Repeat-failure count = 68
