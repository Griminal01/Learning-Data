# Week 14: Data quality, and the Phase 2 build

**Phase 2 · Data modelling & SQL** · Mon 1 Feb – Sun 7 Feb 2027 · about 5 hours

Before you trust any analysis, you **test the data**. This week you build a set of data quality checks you can run against any CMMS export. Then you write the Phase 2 *done when* query and package your SQL work as a portfolio piece.

**By Sunday you'll be able to:**

- check for duplicates, orphans, nulls, impossible values and outliers in SQL
- check that codes follow a pattern with `GLOB`
- create a reusable **view**
- answer the Phase 2 question in one query

---

## Session 1 (1.5 h): Data quality checks

### Do it

Write each check and run it against `line_d.db`. A good check returns **nothing** (or 0) when the data is healthy.

```sql
-- 1. Duplicate primary keys
SELECT wo_id, COUNT(*) FROM work_orders GROUP BY wo_id HAVING COUNT(*) > 1;

-- 2. Orphans: work orders on assets that don't exist
SELECT COUNT(*) AS orphan_wos
FROM work_orders AS w
LEFT JOIN assets AS a ON a.asset_id = w.asset_id
WHERE a.asset_id IS NULL;

-- 3. Nulls in important columns (in SQLite a TRUE condition counts as 1)
SELECT COUNT(*) AS pm_rows,
       SUM(due_date IS NULL)       AS null_due,
       SUM(completed_date IS NULL) AS null_completed,
       SUM(technician IS NULL)     AS null_technician
FROM work_orders
WHERE wo_type = 'PM';

-- 4. Impossible sequence: completed before raised
SELECT wo_id, raised_datetime, due_date, completed_date
FROM work_orders
WHERE completed_date < date(raised_datetime);

-- 5. Status vs date consistency
SELECT status,
       SUM(completed_date IS NULL)     AS no_date,
       SUM(completed_date IS NOT NULL) AS has_date
FROM work_orders
GROUP BY status;

-- 6. Outliers: breakdowns over 12 hours
SELECT event_id, asset_id, start_datetime, duration_min, cause
FROM downtime_events
WHERE category = 'Breakdown' AND duration_min > 720
ORDER BY duration_min DESC;

-- 7. Codes that break the LD-XXX-NNN pattern
SELECT asset_id
FROM assets
WHERE asset_id NOT GLOB 'LD-[A-Z][A-Z][A-Z]-[0-9][0-9][0-9]';
```

**What you should find:**

- Checks 1, 2 and 7: clean.
- Check 3: 534 null completions, which matches Missed + Open from Week 12. That's consistent.
- Check 4: **10 rows**, PMs completed a day or two *before* the work order was raised. In real life this happens when the PM gets done early and the paperwork is backfilled. It isn't wrong data, but you need to know about it. If you calculated "response time" on these, you'd get negative numbers.
- Check 6: **4 events over 12 hours**, the longest 1,375 min. Are those real (a big bearing job over New Year), or did someone forget to close the stop? At work, you'd ask. Never silently delete outliers.

### Why it works

Every check is something you already know (GROUP BY, LEFT JOIN, CASE), pointed at the data instead of the business question. A professional analyst runs checks like these **every time** new data arrives, before building anything on it.

---

## Session 2 (1.5 h): Views and the done-when query

### Views

A **view** is a saved query that behaves like a table. Make one for the logic you keep repeating:

```sql
CREATE VIEW v_pm_results AS
SELECT w.wo_id, w.asset_id, a.zone_code, a.criticality, w.due_date, w.completed_date,
       CASE
         WHEN w.status = 'Open'              THEN 'Open'
         WHEN w.completed_date IS NULL       THEN 'Missed'
         WHEN w.completed_date <= w.due_date THEN 'On time'
         ELSE 'Late'
       END AS pm_result,
       CASE WHEN w.completed_date <= w.due_date THEN 1 ELSE 0 END AS on_time
FROM work_orders AS w
JOIN assets AS a ON a.asset_id = w.asset_id
WHERE w.wo_type = 'PM';
```

Now `SELECT zone_code, AVG(on_time) FROM v_pm_results GROUP BY zone_code;` is one line. (Remember **Write Changes**, `Ctrl+S`, after creating a view.)

> Do this in your own copy of the database, or keep a backup of `line_d.db`. You can always regenerate it by running `python data/generate_data.py` (from Phase 5 onwards).

### Phase 2 *done when*

> **Which 10 assets lost the most hours to reactive work last quarter, and were their PMs on time?**

"Last quarter" is **Q2 2026** (1 April – 30 June), the latest full quarter in the data.

Try it yourself first. You need:

1. a CTE of breakdown downtime hours per asset in Q2
2. a CTE of PMs due and PMs on time per asset in Q2
3. a join of both to `assets`, sorted by hours, top 10

<details>
<summary><strong>Show the solution</strong> (only after a real attempt)</summary>

```sql
WITH loss AS (
    SELECT d.asset_id, SUM(d.duration_min) / 60.0 AS reactive_hrs, COUNT(*) AS breakdowns
    FROM downtime_events AS d
    WHERE d.category = 'Breakdown'
      AND d.start_datetime >= '2026-04-01' AND d.start_datetime < '2026-07-01'
    GROUP BY d.asset_id
),
pm AS (
    SELECT asset_id,
           COUNT(*) AS pms_due,
           SUM(CASE WHEN completed_date <= due_date THEN 1 ELSE 0 END) AS pms_on_time
    FROM work_orders
    WHERE wo_type = 'PM' AND due_date BETWEEN '2026-04-01' AND '2026-06-30'
    GROUP BY asset_id
)
SELECT a.asset_id, a.asset_name, a.criticality,
       l.breakdowns,
       ROUND(l.reactive_hrs, 1) AS reactive_hrs,
       p.pms_due, p.pms_on_time,
       ROUND(100.0 * p.pms_on_time / p.pms_due, 0) AS pm_on_time_pct
FROM loss AS l
JOIN assets AS a ON a.asset_id = l.asset_id
LEFT JOIN pm AS p ON p.asset_id = l.asset_id
ORDER BY l.reactive_hrs DESC
LIMIT 10;
```

| Asset | Name | Breakdowns | Reactive hrs | PM on time |
|---|---|---|---|---|
| LD-FLK-010 | Flaking roll 2 | 1 | 9.6 | 6/8 (75 %) |
| LD-FLK-018 | Flaking roll 10 | 1 | 8.6 | 8/8 (100 %) |
| LD-PPK-030 | Primary Packing Servo drive 3 | 1 | 6.7 | 1/1 (100 %) |
| LD-PPK-003 | Primary Packing Flow wrapper 3 | 3 | 5.4 | 9/14 (64 %) |
| LD-PPK-002 | Primary Packing Flow wrapper 2 | 4 | 4.7 | 5/14 (36 %) |
| LD-EOL-008 | End of Line Label printer applicator 1 | 3 | 4.5 | 9/13 (69 %) |
| LD-FLK-006 | Flaking Drive motor 6 | 1 | 4.5 | 4/4 (100 %) |
| LD-EOL-028 | End of Line Drive motor 4 | 1 | 4.3 | 4/4 (100 %) |
| LD-EOL-016 | End of Line Conveyor 6 | 1 | 4.2 | 4/6 (67 %) |
| LD-EOL-002 | End of Line Case packer 2 | 1 | 4.0 | 7/7 (100 %) |

It matches the Week 6 Excel Pareto: same assets, same order. **That cross-check is the real done-when.**

**Reading it:** the top two are single long flaking-roll jobs, so they're about severity. Flow wrappers 2 and 3 are about **frequency** and have the worst PM compliance. Those are two different problems with two different fixes, and that's exactly the kind of distinction an engineering manager wants to hear.

</details>

---

## Weekend build (2 h): Mini CMMS portfolio piece

Create a folder `portfolio/02-mini-cmms-sql/` in your GitHub repo (see `portfolio/README.md`) containing:

1. `schema.sql`: your `CREATE TABLE` statements from Week 9, plus the `v_pm_results` view.
2. `quality_checks.sql`: this week's checks, each with a comment explaining what "good" looks like.
3. `analysis.sql`: your best queries, covering PM compliance by month and zone, MTBF/MTTR per asset, time between failures with LAG, repeat failures, and the done-when query.
4. `README.md`: one paragraph on what the database is, an ERD image of your star schema, and 3–5 findings written in plain English, like *"Flow wrappers account for 4 of the 5 lowest-MTBF assets; LD-PPK-005 fails every ~20 days."*

Tick off **Phase 2** in the tracker. 🎉

---

## Watch

- **Alex The Analyst**: *"Alex the Analyst data cleaning SQL"*.
- **SQLBolt**: finish any lessons you skipped (13–18 cover creating and changing tables).
- Book (dip in, don't read cover to cover): *SQL for Data Analysis* by Cathy Tanimura, chapters 2 (data preparation) and 3 (time series).

---

## Check yourself

1. Which data quality check would catch the "Prim Pack" problem from Week 4, if the zone were stored as free text on the work order?
2. Why are views better than copying the same CASE logic into every query?
3. Why should you check your SQL done-when answer against the Excel Pareto?
4. Write a check that finds PM work orders whose `pm_id` doesn't exist in `pm_tasks`.

<details>
<summary><strong>Answers</strong></summary>

1. `SELECT zone, COUNT(*) FROM work_orders GROUP BY zone;`, which lists the distinct values, or an orphan check (`LEFT JOIN zones … IS NULL`) against the trusted zones table.
2. One definition of "on time", so every query agrees and you only fix it once. It's the same reason as LAMBDA in Week 5.
3. Two independent methods giving the same answer is the strongest evidence that both are right. If they differ, one has a bug, and finding it teaches you something.
4. ```sql
   SELECT w.wo_id, w.pm_id
   FROM work_orders AS w
   LEFT JOIN pm_tasks AS p ON p.pm_id = w.pm_id
   WHERE w.pm_id IS NOT NULL AND p.pm_id IS NULL;
   ```

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** This is the Phase 2 done-when, so none of the core is skippable: the seven Session 1 checks, the `v_pm_results` view, the done-when query matching the Week 6 Pareto, and the `portfolio/02-mini-cmms-sql/` folder with all four files. That is more than 90 minutes, so give the portfolio folder its own sitting.
- **On your phone (10 min a day):** Watch the Alex The Analyst data cleaning SQL video, read the "What you should find" notes and the "Reading it" paragraph under the solution, and draft your 3 to 5 plain-English README findings on paper.
- **Safe to skip this week:** Only the extras can wait: SQLBolt lessons 13 to 18, the Cathy Tanimura book chapters and a fresh ERD drawing (reuse your Week 9 star schema for the README image).

---

## Tick off

- [ ] Seven data quality checks written and understood
- [ ] `v_pm_results` view created
- [ ] **Done-when query** written, matching the Week 6 Pareto
- [ ] `portfolio/02-mini-cmms-sql/` committed, with README and findings
