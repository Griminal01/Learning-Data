# Week 11: JOINs, GROUP BY and HAVING

**Phase 2 · Data modelling & SQL** · Mon 11 Jan – Sun 17 Jan 2027 · about 5 hours

This is where SQL gets powerful. **JOIN** puts related tables back together (work orders + assets + zones), and **GROUP BY** summarises them (jobs per zone, hours per asset). Together they're 80 % of all real-world SQL.

**By Sunday you'll be able to:**

- `JOIN` two or three tables on their keys
- explain `INNER` vs `LEFT` join, and use `LEFT JOIN … IS NULL` to find missing matches
- aggregate with `COUNT`, `SUM`, `AVG`, `MIN` and `MAX`
- group with `GROUP BY` and filter groups with `HAVING`

---

## Session 1 (1.5 h): JOINs

### Do it

```sql
-- Work orders with the asset's name and zone
SELECT w.wo_id, w.asset_id, a.asset_name, a.zone_code, w.wo_type
FROM work_orders AS w
JOIN assets AS a ON a.asset_id = w.asset_id
LIMIT 5;
```

`w` and `a` are **table aliases**, short names so you don't have to type `work_orders.asset_id` every time.

Add a third table:

```sql
SELECT w.wo_id, a.asset_name, z.zone, w.wo_type, w.labour_hours
FROM work_orders AS w
JOIN assets AS a ON a.asset_id  = w.asset_id
JOIN zones  AS z ON z.zone_code = a.zone_code
WHERE w.wo_type = 'Reactive'
LIMIT 10;
```

**INNER vs LEFT.** Downtime events don't all have a work order. Compare:

```sql
SELECT COUNT(*) FROM downtime_events AS d
JOIN work_orders AS w ON w.wo_id = d.wo_id;          -- 710

SELECT COUNT(*) FROM downtime_events AS d
LEFT JOIN work_orders AS w ON w.wo_id = d.wo_id;     -- 6,177
```

The `JOIN` (inner) **silently dropped** 5,467 minor stops because they had no matching work order. That's one of the commonest ways reports go wrong.

**Find things with no match.** These are assets that have *never* broken down:

```sql
SELECT a.asset_id, a.asset_name
FROM assets AS a
LEFT JOIN work_orders AS w
       ON w.asset_id = a.asset_id AND w.wo_type = 'Reactive'
WHERE w.wo_id IS NULL;
```

That gives **32 assets**. (Notice that the `wo_type` condition sits in the `ON`, not the `WHERE`. Think about why. The answer is in Check yourself, below.)

### Why it works

```
INNER JOIN: only rows that match in both tables
LEFT JOIN:  every row from the left table, plus matches from the right (NULLs where there's none)
```

It's exactly the Power Query Merge from Week 7: Inner, Left Outer, and Left Anti (`LEFT JOIN … WHERE right.key IS NULL`).

Always join **on keys**: a foreign key to its primary key. Joining on names or descriptions breaks as soon as someone renames something.

---

## Session 2 (1.5 h): GROUP BY and HAVING

### Do it

```sql
-- How many of each WO type?
SELECT wo_type, COUNT(*) AS jobs
FROM work_orders
GROUP BY wo_type
ORDER BY jobs DESC;
```

That's PM 10,502 · Reactive 1,027 · Corrective 373.

```sql
-- Reactive jobs and labour by zone
SELECT z.zone, COUNT(*) AS reactive_jobs, ROUND(SUM(w.labour_hours), 1) AS labour_hrs
FROM work_orders AS w
JOIN assets AS a ON a.asset_id  = w.asset_id
JOIN zones  AS z ON z.zone_code = a.zone_code
WHERE w.wo_type = 'Reactive'
GROUP BY z.zone
ORDER BY reactive_jobs DESC;
```

Primary Packing has the most jobs (292), but **Flaking has the most labour** (519.7 h), because flaking rolls take a long time to fix.

```sql
-- Repeat offenders: assets with more than 8 breakdowns
SELECT a.asset_id, a.asset_name, COUNT(*) AS breakdowns
FROM work_orders AS w
JOIN assets AS a ON a.asset_id = w.asset_id
WHERE w.wo_type = 'Reactive'
GROUP BY a.asset_id, a.asset_name
HAVING COUNT(*) > 8
ORDER BY breakdowns DESC;
```

That returns 20 assets. Flow wrappers dominate: LD-PPK-005 has had **37 breakdowns** in two years.

### Why it works

`GROUP BY` collapses rows into one per group, and aggregate functions summarise each group. The rule: **every column in `SELECT` must either be in `GROUP BY` or inside an aggregate.** (SQLite is lenient and won't always complain, but other databases will, and the results can be nonsense.)

`WHERE` filters **rows before** grouping. `HAVING` filters **groups after** grouping. The full run order is now:

```
FROM → JOIN → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
```

---

## Weekend practice (2 h)

1. **SQLBolt lessons 6–12** (joins, nulls, expressions, aggregates).
2. Write these in `week11.sql`:
   1. Downtime hours by zone and category (Breakdown/Minor stop). Which zone loses most to minor stops?
   2. How many downtime events have a work order vs not? (Hint: `CASE WHEN wo_id IS NULL …`; you can borrow it from Week 12.)
   3. Average repair labour by asset type, only for types with at least 20 breakdowns.
   4. For each technician, the number of reactive jobs and their total labour hours.
   5. Number of PM tasks by `task_type` and `frequency_days`.
   6. Which **manufacturer**'s assets have the most breakdowns per asset? (Count breakdowns ÷ count of distinct assets: `COUNT(DISTINCT a.asset_id)`.)

---

## Watch

- **Alex The Analyst**: *"Alex the Analyst SQL joins"* and *"Alex the Analyst GROUP BY HAVING"*.
- **Data with Baraa**: *"Data with Baraa SQL joins"*. It has excellent join diagrams.
- The famous visual: search *"SQL joins Venn diagram"*. It's a useful mental picture, but remember that joins really match *rows on keys*.

---

## Check yourself

1. In the "never broken down" query, what goes wrong if you move `w.wo_type = 'Reactive'` from `ON` into `WHERE`?
2. Why is `HAVING COUNT(*) > 8` correct but `WHERE COUNT(*) > 8` an error?
3. You join `work_orders` to `downtime_events` on `asset_id` (not `wo_id`). What happens to the row count, and why?
4. What's the average breakdown duration in minutes, by zone? Write the query.

<details>
<summary><strong>Answers</strong></summary>

1. The `WHERE` runs after the join. For assets with no reactive jobs, the left join still brings in their *PM* rows, so `w.wo_type` is `'PM'`. The `WHERE` then throws those rows away, and `IS NULL` never matches. You'd get 0 instead of 32. **Conditions on the right-hand table of a LEFT JOIN belong in the `ON`.**
2. `WHERE` runs before grouping, so there's no count yet. `HAVING` runs after.
3. It **explodes**: every work order on an asset matches every downtime event on that asset, so 10 WOs × 20 events = 200 rows for one asset. This is called *fan-out*, and it's why you join on the true key. If totals ever look too big after a join, suspect fan-out.
4. ```sql
   SELECT a.zone_code, ROUND(AVG(d.duration_min), 1) AS avg_breakdown_min
   FROM downtime_events AS d
   JOIN assets AS a ON a.asset_id = d.asset_id
   WHERE d.category = 'Breakdown'
   GROUP BY a.zone_code
   ORDER BY avg_breakdown_min DESC;
   ```
   Flaking is highest, because roll and bearing jobs are long.

Full answers are in [`solutions/phase-2-sql/w11_joins_groupby.sql`](../../solutions/phase-2-sql/w11_joins_groupby.sql). Minor-stop hours: Primary Packing is worst (312 h), then End of Line (206 h).

</details>

---

## Tick off

- [ ] Three-table JOIN written from memory
- [ ] Can explain why the INNER join lost 5,467 rows
- [ ] `LEFT JOIN … IS NULL` used to find assets that never failed
- [ ] GROUP BY + HAVING for repeat offenders
- [ ] `week11.sql` saved
