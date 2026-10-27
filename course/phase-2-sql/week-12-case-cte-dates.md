# Week 12: CASE, CTEs and dates

**Phase 2 · Data modelling & SQL** · Mon 18 Jan – Sun 24 Jan 2027 · about 5 hours

Real questions need logic ("was this PM on time?"), steps ("first work out compliance per zone, *then* keep the bad ones") and dates ("by month", "days late"). This week gives you all three, and you'll calculate PM compliance properly in SQL.

**By Sunday you'll be able to:**

- write `CASE WHEN … THEN … ELSE … END` for labels and conditional counting
- break a query into steps with `WITH` (Common Table Expressions)
- use SQLite date functions: `date()`, `strftime()` and `julianday()`
- calculate PM compliance by month and zone

---

## Session 1 (1.5 h): CASE

### Do it

```sql
SELECT wo_id, due_date, completed_date,
       CASE
         WHEN status = 'Open'            THEN 'Open'
         WHEN completed_date IS NULL     THEN 'Missed'
         WHEN completed_date <= due_date THEN 'On time'
         ELSE 'Late'
       END AS pm_result
FROM work_orders
WHERE wo_type = 'PM'
LIMIT 20;
```

Now **group by the CASE**:

```sql
SELECT CASE
         WHEN status = 'Open'            THEN 'Open'
         WHEN completed_date IS NULL     THEN 'Missed'
         WHEN completed_date <= due_date THEN 'On time'
         ELSE 'Late'
       END AS pm_result,
       COUNT(*) AS pms
FROM work_orders
WHERE wo_type = 'PM'
GROUP BY pm_result
ORDER BY pms DESC;
```

You should get On time 8,349 · Late 1,619 · Missed 513 · Open 21.

**Conditional counting** is the most useful trick in SQL. Here's compliance in one line:

```sql
SELECT COUNT(*) AS pms_due,
       SUM(CASE WHEN completed_date <= due_date THEN 1 ELSE 0 END) AS on_time,
       ROUND(100.0 * SUM(CASE WHEN completed_date <= due_date THEN 1 ELSE 0 END) / COUNT(*), 1) AS compliance_pct
FROM work_orders
WHERE wo_type = 'PM';
```

That gives **79.5 %**, which matches your Excel workbook from Week 8. Two tools, same answer: that's how you know both are right.

### Why it works

`CASE` is checked **top to bottom**, and the first true `WHEN` wins. Order matters: if `completed_date <= due_date` came first, an Open PM (NULL completed date) would fall through to `ELSE 'Late'`.

`100.0 *` forces decimal division. In SQL, `8349 / 10502` with whole numbers gives `0`. That's integer division, and it catches everyone at least once.

---

## Session 2 (1.5 h): Dates and CTEs

### Dates in SQLite

| Function | Example | Result |
|---|---|---|
| `date(x)` | `date('2026-06-14 09:30')` | `2026-06-14` |
| `strftime('%Y-%m', x)` | year-month | `2026-06` |
| `strftime('%H', x)` | hour | `09` |
| `strftime('%w', x)` | weekday (0 = Sunday) | `0` |
| `julianday(x)` | day number | `2461205.89…` |
| `julianday(a) - julianday(b)` | days between | e.g. `12.5` |
| `date(x, '+28 days')` | add days | |

```sql
-- PM compliance by month due
SELECT strftime('%Y-%m', due_date) AS due_month,
       COUNT(*) AS pms_due,
       ROUND(100.0 * SUM(CASE WHEN completed_date <= due_date THEN 1 ELSE 0 END) / COUNT(*), 1) AS compliance_pct
FROM work_orders
WHERE wo_type = 'PM'
GROUP BY due_month
ORDER BY due_month;

-- Most-late PMs
SELECT wo_id, asset_id, due_date, completed_date,
       CAST(julianday(completed_date) - julianday(due_date) AS INTEGER) AS days_late
FROM work_orders
WHERE wo_type = 'PM' AND completed_date > due_date
ORDER BY days_late DESC
LIMIT 5;
```

### CTEs: queries in steps

```sql
WITH pm AS (                       -- step 1: one row per PM, flagged
    SELECT a.zone_code,
           CASE WHEN w.completed_date <= w.due_date THEN 1 ELSE 0 END AS on_time
    FROM work_orders AS w
    JOIN assets AS a ON a.asset_id = w.asset_id
    WHERE w.wo_type = 'PM'
      AND w.due_date BETWEEN '2026-01-01' AND '2026-06-30'
),
by_zone AS (                       -- step 2: summarise per zone
    SELECT zone_code, COUNT(*) AS due, SUM(on_time) AS on_time,
           ROUND(100.0 * SUM(on_time) / COUNT(*), 1) AS compliance_pct
    FROM pm
    GROUP BY zone_code
)
SELECT *                           -- step 3: keep the problem zones
FROM by_zone
WHERE compliance_pct < 80
ORDER BY compliance_pct;
```

That returns **PPK 64.7 %** and **EOL 74.8 %**.

### Why it works

A CTE is a **named temporary result** you can query like a table. It's the SQL version of `LET`, or of helper columns in Excel. Use one whenever a query has more than one "and then…". Each step can be tested on its own: just `SELECT * FROM pm LIMIT 10` while you're building.

(`due_date` has no time part, so `BETWEEN` is safe here, unlike `raised_datetime` last week.)

---

## Weekend practice (2 h)

Write in `week12.sql`:

1. **Planned vs reactive by quarter**: % of work orders that weren't Reactive, per quarter. (Build the quarter label with `strftime('%Y', …) || '-Q' || ((CAST(strftime('%m', …) AS INTEGER) + 2) / 3)`.)
2. **When do breakdowns happen?** Count of reactive jobs by hour of day. Is there a pattern?
3. **Breakdowns by day of week.**
4. **Average days late** of late PMs, by zone.
5. **A "PM health" label per asset**: in a CTE, calculate each asset's PM compliance; then label it `'Good'` (≥ 90 %), `'Watch'` (75–90 %) or `'Poor'` (< 75 %), and count assets per label per zone.
6. **Stretch:** for each zone, compliance in H2 2025 vs H1 2026 side by side, plus the change. (Hint: two conditional `SUM`s in one query.)

---

## Watch

- **Alex The Analyst**: *"Alex the Analyst CASE statement"* and *"Alex the Analyst CTE"*.
- **Mode SQL Tutorial**: [mode.com/sql-tutorial](https://mode.com/sql-tutorial/). Read the *SQL CASE* and *SQL Date Format* pages.
- SQLite date reference: [sqlite.org/lang_datefunc.html](https://www.sqlite.org/lang_datefunc.html).

---

## Check yourself

1. Why does `SELECT 8349 / 10502` give 0?
2. Rewrite this to avoid repeating the CASE three times: compliance = on_time / due, using a CTE.
3. What's the difference between a CTE and saving a query result as a new table?
4. What was the worst month for PM compliance in the data?

<details>
<summary><strong>Answers</strong></summary>

1. Both are integers, so SQL does integer division and drops the remainder. Write `100.0 * 8349 / 10502` or `CAST(8349 AS REAL) / 10502`.
2. ```sql
   WITH f AS (
     SELECT CASE WHEN completed_date <= due_date THEN 1 ELSE 0 END AS on_time
     FROM work_orders WHERE wo_type = 'PM'
   )
   SELECT COUNT(*) AS due, SUM(on_time) AS on_time,
          ROUND(100.0 * SUM(on_time) / COUNT(*), 1) AS pct
   FROM f;
   ```
3. A CTE exists only while that query runs, so it's always up to date and leaves no clutter. A saved table is a snapshot that goes stale when the data changes.
4. **March 2025 (76.4 %)**, closely followed by December 2024 (76.9 %).

Planned share is about 90–92 % in every quarter. That looks great, but remember it's a **count** of jobs. By **hours**, reactive work is a much bigger slice. Try it.

Answers are in [`solutions/phase-2-sql/w12_case_cte_dates.sql`](../../solutions/phase-2-sql/w12_case_cte_dates.sql).

</details>

---

## Tick off

- [ ] CASE labels and conditional SUM for compliance (79.5 %)
- [ ] Compliance by month with `strftime`
- [ ] Days late with `julianday`
- [ ] A multi-step CTE query
- [ ] `week12.sql` saved
