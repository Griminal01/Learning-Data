# Week 13: Window functions, MTBF and MTTR

**Phase 2 · Data modelling & SQL** · Mon 25 Jan – Sun 31 Jan 2027 · about 5 hours

`GROUP BY` collapses rows. **Window functions** calculate across rows *without* collapsing them: "days since this asset's last breakdown", "running total", "rank within zone". They're how you get time between failures, which is the foundation of the reliability engineering in Phase 5.

**By Sunday you'll be able to:**

- use `ROW_NUMBER`, `RANK`, `LAG`, `LEAD` and `SUM() OVER`
- explain `PARTITION BY` and `ORDER BY` inside `OVER (...)`
- calculate **MTBF**, **MTTR** and **availability** per asset
- calculate time between failures and spot repeat failures

---

## Session 1 (1.5 h): Window function basics

### Do it

```sql
-- Number each breakdown on LD-PPK-005 in order
SELECT asset_id, wo_id, raised_datetime, failure_code,
       ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY raised_datetime) AS failure_no
FROM work_orders
WHERE wo_type = 'Reactive' AND asset_id = 'LD-PPK-005';
```

Now the important one, **LAG**:

```sql
SELECT asset_id, wo_id, raised_datetime, failure_code,
       LAG(raised_datetime) OVER (PARTITION BY asset_id ORDER BY raised_datetime) AS previous_failure,
       ROUND(julianday(raised_datetime)
           - julianday(LAG(raised_datetime) OVER (PARTITION BY asset_id ORDER BY raised_datetime)), 1) AS days_since_last
FROM work_orders
WHERE wo_type = 'Reactive' AND asset_id = 'LD-PPK-005';
```

The first row has no previous failure (NULL). The second is **4.0 days** later, and the third is 13.3 days after that.

Remove the `asset_id = 'LD-PPK-005'` filter and run it again. `PARTITION BY asset_id` restarts the LAG for every asset, so you never compare one asset's failure with another's.

**Running total:**

```sql
WITH daily AS (
    SELECT date(d.start_datetime) AS day, SUM(d.duration_min) / 60.0 AS hrs
    FROM downtime_events AS d
    JOIN assets AS a ON a.asset_id = d.asset_id
    WHERE a.zone_code = 'PPK' AND d.category = 'Breakdown' AND d.start_datetime >= '2026-01-01'
    GROUP BY day
)
SELECT day, ROUND(hrs, 2) AS hrs, ROUND(SUM(hrs) OVER (ORDER BY day), 2) AS running_hrs
FROM daily
ORDER BY day;
```

By the end of June, packing has lost **56.75 hours** to breakdowns in 2026.

### Why it works

```
function() OVER (PARTITION BY group_column ORDER BY sort_column)
```

- **PARTITION BY** sets the groups (like GROUP BY), but every row is kept.
- **ORDER BY** sets the sequence inside each group.
- `LAG(x)` is the previous row's x, `LEAD(x)` is the next row's x, `ROW_NUMBER()` gives 1, 2, 3…, `RANK()` is like ROW_NUMBER but ties share a rank, and `SUM(x) OVER (ORDER BY …)` is a running total.

Think of it like a shift register on a PLC: LAG looks back one position in the sequence.

---

## Session 2 (1.5 h): Reliability metrics

### The definitions

| Metric | Meaning | Formula used in this course |
|---|---|---|
| **MTBF**, mean time between failures | how long it usually runs before breaking | operating time ÷ number of failures |
| **MTTR**, mean time to repair | how long it's usually down when it breaks | total breakdown downtime ÷ number of breakdowns |
| **Availability** (inherent) | share of time it's able to run | MTBF ÷ (MTBF + MTTR) |
| **Failure rate (λ)** | failures per hour | 1 ÷ MTBF |

Our window is **1 July 2024 – 30 June 2026 = 730 days = 17,520 hours**, assuming the line runs 24/7. (At work you'd use actual scheduled run hours. Ask your planner where those come from.)

### Do it

```sql
WITH failures AS (
    SELECT asset_id, COUNT(*) AS n_failures
    FROM work_orders
    WHERE wo_type = 'Reactive'
    GROUP BY asset_id
),
repairs AS (
    SELECT asset_id, AVG(duration_min) / 60.0 AS mttr_hrs
    FROM downtime_events
    WHERE category = 'Breakdown'
    GROUP BY asset_id
)
SELECT a.asset_id, a.asset_name, f.n_failures,
       ROUND(17520.0 / f.n_failures, 0) AS mtbf_hrs,
       ROUND(r.mttr_hrs, 2)             AS mttr_hrs,
       ROUND(100.0 * (17520.0 / f.n_failures) / ((17520.0 / f.n_failures) + r.mttr_hrs), 2) AS availability_pct
FROM failures AS f
JOIN assets AS a ON a.asset_id = f.asset_id
LEFT JOIN repairs AS r ON r.asset_id = f.asset_id
ORDER BY mtbf_hrs
LIMIT 10;
```

The worst is **LD-PPK-005, Flow wrapper 5**: 37 failures, MTBF ≈ **474 h** (about 20 days), MTTR ≈ 0.76 h. The top four are all flow wrappers.

### Why it works (and its limits)

Availability comes out at about 99.8 % even for the worst asset. That looks great, so why does packing feel so bad on the floor? Because:

1. **These are single assets.** The line is a chain: if *any* of ~40 packing assets stops, packing stops. Line availability ≈ the product of every asset's availability in series.
2. **Minor stops aren't included.** They're a separate loss (OEE *performance*), and in packing they cost more hours than breakdowns (Week 11).
3. **MTBF hides the pattern.** 474 h is an average. Are the failures random, or do they bunch up as the jaws wear? That question is what **Weibull analysis** answers in Phase 5, and the `days_since_last` column you made with LAG is its raw input.

---

## Weekend practice (2 h)

Write in `week13.sql`:

1. **MTBF and MTTR by asset type** (not per asset). Which type has the worst MTBF?
2. **Mean days between failures by asset type** using LAG gaps, for types with ≥ 10 gaps.
3. **Repeat failures**: count breakdowns that happened within **7 days** of the previous breakdown on the same asset. These usually point to a bad fix or a root cause that wasn't found.
4. Same again, but **same asset and same failure code**. Show the top 5 assets.
5. **Rank zones** by breakdown downtime hours within each quarter of 2026 (`RANK() OVER (PARTITION BY quarter ORDER BY hrs DESC)`).
6. **LEAD**: for each PM completion on a flow wrapper, find the date of the next breakdown on that asset. How many days of "breakdown-free" running did each PM buy?

---

## Watch

- **Alex The Analyst**: *"Alex the Analyst window functions"*.
- **Data with Baraa**: *"Data with Baraa SQL window functions"*. It's long but excellent.
- **Reliability**: search *"MTBF MTTR explained maintenance"*. Pick a short video from a maintenance or reliability channel, not an IT one.
- Docs: [sqlite.org/windowfunctions.html](https://www.sqlite.org/windowfunctions.html).

---

## Check yourself

1. What's the difference between `ROW_NUMBER()` and `RANK()` when two values tie?
2. Why must LAG be partitioned by asset when calculating days between failures?
3. An asset had 0 breakdowns. What's its MTBF in our formula, and how should you report it?
4. Why is the window function version of "days since last failure" better than doing it in Excel?
5. How many breakdowns happened within 7 days of the previous one on the same asset?

<details>
<summary><strong>Answers</strong></summary>

1. ROW_NUMBER always gives 1, 2, 3, 4. RANK gives 1, 2, 2, 4 (ties share a rank and the next one is skipped). `DENSE_RANK` gives 1, 2, 2, 3.
2. Otherwise LAG would compare the first failure of asset B with the last failure of asset A, which gives a meaningless gap.
3. Division by zero, so it's undefined. Report it as "> 17,520 h (no failures in window)". Never report 0 or blank, because 0 would look like the *worst* asset.
4. It runs over all 1,027 breakdowns at once, re-runs instantly when the data changes, can't be broken by someone sorting the sheet, and lives in a reusable query.
5. **68**.

Mean days between failures, shortest first: Flow wrapper 26.6, Case packer 44.4, Carton erector 48.2, Label printer applicator 53.8.

Answers are in [`solutions/phase-2-sql/w13_window_reliability.sql`](../../solutions/phase-2-sql/w13_window_reliability.sql).

</details>

---

## Tick off

- [ ] LAG days-between-failures partitioned by asset
- [ ] Running total with `SUM() OVER`
- [ ] MTBF/MTTR/availability per asset, with LD-PPK-005 worst
- [ ] Can explain why 99.8 % asset availability doesn't mean a good line
- [ ] `week13.sql` saved
