# Week 28: pandas 1, reading, inspecting, selecting and filtering

**Phase 4 · Python for data** · Mon 10 May – Sun 16 May 2027 · about 5 hours

**pandas** is Excel inside Python: tables (called *DataFrames*) that you filter, sort and summarise with code. Every step is recorded, it handles millions of rows, and the same script works next week on new data.

**By Sunday you'll be able to:**

- read CSV and Excel files into DataFrames, with correct types and dates
- inspect data with `head`, `info`, `describe` and `value_counts`
- select columns and filter rows with boolean masks
- sort, add columns and write results back to Excel

**Work in:** `my_work\week28.ipynb`, with the `.venv` kernel.

---

## Session 1 (1.5 h): Read and inspect

### Do it

```python
import pandas as pd
from pathlib import Path

DATA = Path("..") / "data"
wo = pd.read_csv(DATA / "csv" / "work_orders.csv",
                 parse_dates=["raised_datetime", "due_date", "completed_date"])
assets = pd.read_csv(DATA / "csv" / "assets.csv", parse_dates=["install_date"])

wo.shape            # (11902, 14)
wo.head()           # first 5 rows
wo.info()           # columns, types, non-null counts
wo.describe()       # stats for numeric columns
wo["wo_type"].value_counts()          # PM 10502, Reactive 1027, Corrective 373
wo["status"].value_counts(normalize=True)
wo.isna().sum()     # nulls per column
```

**The CMMS export format** (UK dates, spaces in the headers):

```python
june = pd.read_csv(DATA / "exports" / "work_orders" / "WO_Export_2026-06.csv")
june["Raised"] = pd.to_datetime(june["Raised"], format="%d/%m/%Y %H:%M")
june["Due"] = pd.to_datetime(june["Due"], format="%d/%m/%Y")
june["Completed"] = pd.to_datetime(june["Completed"], format="%d/%m/%Y")
```

Always give the `format`. Without it, pandas may guess month-first for ambiguous dates.

### Why it works

`info()` is your first move with any new file. It's the pandas version of the Week 4 profiling: how many rows, which columns have gaps, and whether the dates are really dates (`datetime64`) or still text (`object`).

---

## Session 2 (1.5 h): Select, filter and sort

### Do it

```python
# Columns
wo["asset_id"]                                  # one column (a Series)
wo[["wo_id", "asset_id", "labour_hours"]]       # several columns (a DataFrame)

# Rows: boolean mask, the pandas version of Excel's FILTER
reactive = wo[wo["wo_type"] == "Reactive"]
len(reactive)                                    # 1027

# Several conditions: & (and), | (or), and brackets round each one
big = wo[(wo["wo_type"] == "Reactive") & (wo["labour_hours"] > 6)]
big = big.sort_values("labour_hours", ascending=False)
big[["wo_id", "asset_id", "description", "labour_hours"]].head()
```

The top one is **WO-100455**, a gearbox (gears) on LD-FLK-031: 36.2 labour hours.

```python
# Handy filters
wo[wo["wo_type"].isin(["Reactive", "Corrective"])]
wo[wo["description"].str.contains("bearing", case=False)]
wo[wo["completed_date"].isna()]
wo[wo["raised_datetime"].between("2026-06-01", "2026-06-30 23:59")]
wo.query("wo_type == 'Reactive' and labour_hours > 6")    # an alternative syntax

# New columns (whole-column maths, no fill-down)
wo["labour_mins"] = wo["labour_hours"] * 60
wo["days_late"] = (wo["completed_date"] - wo["due_date"]).dt.days
wo["is_late"] = wo["days_late"] > 0
```

### Why it works

`wo["wo_type"] == "Reactive"` produces a column of True/False, one per row. Putting that inside `wo[...]` keeps the True rows. It's the same Boolean multiplication as Excel's `FILTER`, but pandas uses `&` and `|`, **and each condition needs its own brackets**.

Operations act on **whole columns at once**. There's no looping and no filling down. That's why pandas is fast.

---

## Weekend practice (2 h)

1. Answer each of these in one or two lines of pandas:
   1. How many A-critical assets are there in each zone?
   2. The 10 longest downtime events (from `downtime_events.csv`).
   3. All cancelled PMs for `LD-PPK-005`.
   4. How many PMs were completed more than 14 days late?
   5. Which `failure_code` appears most on reactive jobs?
2. Save the answer to (b) to Excel: `top10.to_excel("top10_downtime.xlsx", index=False)`.
3. **Kaggle Learn: Pandas**, lessons 1–3: [kaggle.com/learn/pandas](https://www.kaggle.com/learn/pandas).

---

## Watch

- **Corey Schafer**: the *"Corey Schafer pandas tutorial"* series, episodes 1–4.
- **Keith Galli**: *"Keith Galli complete pandas tutorial"*.
- Book: *Python for Data Analysis*, 3rd edition, by Wes McKinney (the creator of pandas). It's free at [wesmckinney.com/book](https://wesmckinney.com/book/). Read chapter 5 this week.

---

## Check yourself

1. Why does `wo[wo["wo_type"] == "Reactive" & wo["labour_hours"] > 6]` raise an error?
2. What's the difference between `wo["asset_id"]` and `wo[["asset_id"]]`?
3. How do you check whether `due_date` was read as a date?
4. How many PMs were completed more than 14 days late?

<details>
<summary><strong>Answers</strong></summary>

1. `&` binds tighter than `==`, so Python tries `"Reactive" & wo["labour_hours"]` first. Put brackets round each condition.
2. Single brackets return a **Series** (one column). Double brackets return a **DataFrame** with one column. Some functions want one or the other.
3. `wo.dtypes` or `wo.info()`. It should say `datetime64[ns]`, not `object`.
4. ```python
   pm = wo[wo["wo_type"] == "PM"]
   ((pm["completed_date"] - pm["due_date"]).dt.days > 14).sum()
   ```
   Run it and compare with SQL: `SELECT COUNT(*) FROM work_orders WHERE wo_type='PM' AND julianday(completed_date) - julianday(due_date) > 14;`. The two should match.

</details>

---

## Tick off

- [ ] Read clean CSVs and the UK-dated export with correct types
- [ ] `info`, `describe`, `value_counts` and `isna().sum()` on every table
- [ ] Boolean filters with `&`, `|`, `isin`, `str.contains` and `between`
- [ ] Weekend questions answered, top 10 written to Excel
- [ ] Kaggle Pandas lessons 1–3
