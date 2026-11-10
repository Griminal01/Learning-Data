# Week 10: SQL core, SELECT, WHERE and ORDER BY

**Phase 2 · Data modelling & SQL** · Mon 4 Jan – Sun 10 Jan 2027 · about 5 hours

SQL (*Structured Query Language*) is how you ask a database questions. It's 50 years old, every serious system speaks it, and it reads almost like English. This week covers the part you'll use in every single query: picking columns, filtering rows and sorting.

**By Sunday you'll be able to:**

- write `SELECT … FROM … WHERE … ORDER BY … LIMIT`
- filter with `=`, `<>`, `>`, `BETWEEN`, `IN`, `LIKE` and `IS NULL`
- combine conditions with `AND` and `OR`, and use brackets properly
- use `DISTINCT`, `COUNT(*)`, and aliases with `AS`

**Tools:** DB Browser for SQLite with `data/line_d.db` open, on the **Execute SQL** tab. Run the whole editor with `Ctrl+Return`, or just the current statement with `Shift+F5`.

**Practice site:** [sqlbolt.com](https://sqlbolt.com). Lessons 1–4 match this week exactly, and you type answers right in the browser.

---

## Session 1 (1.5 h): SELECT and WHERE

### Do it

Type each query (don't paste; typing builds memory), run it, and look at the result.

```sql
-- Every column, first 10 assets
SELECT * FROM assets LIMIT 10;

-- Just the columns you want
SELECT asset_id, asset_name, criticality FROM assets;

-- Filter: only Primary Packing
SELECT asset_id, asset_name, criticality
FROM assets
WHERE zone_code = 'PPK';

-- Two conditions, both must be true
SELECT asset_id, asset_name, asset_type
FROM assets
WHERE zone_code = 'PPK' AND criticality = 'A'
ORDER BY asset_id;
```

The last query should return **12 assets**, starting with `LD-PPK-007`, Primary Packing Carton erector 1.

Now try each of these filters on `work_orders`:

```sql
WHERE wo_type = 'Reactive'
WHERE wo_type <> 'PM'
WHERE labour_hours > 4
WHERE labour_hours BETWEEN 1 AND 2
WHERE wo_type IN ('Reactive', 'Corrective')
WHERE description LIKE '%bearing%'
WHERE completed_date IS NULL
```

### Why it works

The order you **write** a query in:

```
SELECT   columns
FROM     table
WHERE    row filter
ORDER BY sort
LIMIT    how many
```

The order the database **runs** it in is different: `FROM` → `WHERE` → `SELECT` → `ORDER BY` → `LIMIT`. Knowing that explains a lot of errors later. For example, you can't use a `SELECT` alias inside `WHERE`, because `WHERE` runs first.

- Text goes in **single quotes**: `'PPK'`. Numbers don't.
- `LIKE '%bearing%'` means "contains bearing", because `%` stands for any characters. In SQLite `LIKE` isn't case-sensitive.
- `NULL` means **unknown or empty**, and it isn't equal to anything, not even itself. So `= NULL` never matches. Always use `IS NULL` or `IS NOT NULL`.

---

## Session 2 (1.5 h): Sorting, DISTINCT, dates and brackets

### Do it

```sql
-- The 10 longest stoppages ever
SELECT event_id, asset_id, start_datetime, duration_min, cause
FROM downtime_events
ORDER BY duration_min DESC
LIMIT 10;
```

The top one should be `DT-004654`: LD-FLK-013, a bearing, 1,375 minutes on New Year's Eve 2025. Ouch.

```sql
-- Every failure code that's ever been used on a breakdown
SELECT DISTINCT failure_code
FROM work_orders
WHERE wo_type = 'Reactive'
ORDER BY failure_code;
```

That gives **28 codes**.

```sql
-- Dates are text in YYYY-MM-DD format, so they compare correctly as text
SELECT wo_id, asset_id, description, labour_hours
FROM work_orders
WHERE wo_type = 'Reactive'
  AND raised_datetime >= '2026-06-01'
  AND raised_datetime <  '2026-07-01'
  AND labour_hours > 4
ORDER BY labour_hours DESC;
```

That's **2 jobs** in June over 4 hours.

**Brackets matter.** Compare:

```sql
SELECT COUNT(*) FROM work_orders
WHERE wo_type = 'Reactive' OR wo_type = 'Corrective' AND labour_hours > 3;

SELECT COUNT(*) FROM work_orders
WHERE (wo_type = 'Reactive' OR wo_type = 'Corrective') AND labour_hours > 3;
```

They give **1,071** and **280**. The first one is really "all Reactive jobs, plus Corrective jobs over 3 hours", because `AND` binds tighter than `OR`, just like × before + in maths. When you mix them, always use brackets.

**Aliases:**

```sql
SELECT asset_id AS asset, ROUND(labour_hours * 60) AS labour_mins
FROM work_orders
WHERE wo_type = 'Reactive'
ORDER BY labour_mins DESC
LIMIT 5;
```

### Why `>= '2026-06-01' AND < '2026-07-01'`?

`raised_datetime` includes a time (`2026-06-30 14:22`). If you wrote `BETWEEN '2026-06-01' AND '2026-06-30'`, anything after midnight on the 30th would be missed, because `'2026-06-30 14:22'` is "bigger" than `'2026-06-30'`. A half-open range (`>=` start, `<` next start) is always safe.

---

## Weekend practice (2 h)

1. Finish **SQLBolt lessons 1–4** (and their exercises).
2. Write queries for each question below. Save them all in one file `week10.sql` (DB Browser → Save SQL file). Keep every SQL file you write; they're portfolio material.

   1. All assets made by *Kestrel Drives*, sorted by install date (oldest first).
   2. All PM work orders for asset `LD-PPK-005` that weren't completed.
   3. The 5 reactive jobs with the most labour hours, ever.
   4. All assets with "Burner" in the name.
   5. How many work orders have no completed date?
   6. Every breakdown raised on Christmas Day 2025. (Hint: `LIKE '2025-12-25%'`.)
   7. Every *Replace sealing jaws* PM that wasn't completed.

---

## Watch

- **Alex The Analyst**: *"Alex the Analyst SQL SELECT WHERE"*.
- **Programming with Mosh**: *"Mosh SQL tutorial for beginners"*. It's a longer, very clear full course. Watch the first hour.
- Reference: [sqlite.org/lang_select.html](https://www.sqlite.org/lang_select.html), the official (dense) docs.

---

## Check yourself

1. Why does `WHERE completed_date = NULL` return nothing?
2. Write a query for A-critical assets in either Baking or Drying.
3. What's wrong with `SELECT asset_id, ROUND(labour_hours) AS hrs FROM work_orders WHERE hrs > 5;`?
4. How many assets are there of each criticality? (Hint: try `GROUP BY criticality` with `COUNT(*)`. That's next week, but have a go.)

<details>
<summary><strong>Answers</strong></summary>

1. `NULL` isn't a value, it's "unknown", and comparing anything to unknown gives unknown (not TRUE). Use `IS NULL`.
2. ```sql
   SELECT asset_id, asset_name
   FROM assets
   WHERE criticality = 'A' AND zone_code IN ('BAK', 'DRY');
   ```
3. `WHERE` runs **before** `SELECT`, so the alias `hrs` doesn't exist yet. Use `WHERE ROUND(labour_hours) > 5` (or a CTE, Week 12).
4. ```sql
   SELECT criticality, COUNT(*) FROM assets GROUP BY criticality;
   ```
   A = 86, B = 129, C = 77.

Weekend answers are in [`solutions/phase-2-sql/w10_select.sql`](../../solutions/phase-2-sql/w10_select.sql). Q5 = **534** work orders with no completed date. Q7 = 2 (WO-109531 cancelled, WO-111369 still open).

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Type Session 2's brackets comparison and half-open date range query, then write and save all seven weekend queries in `week10.sql`, and get through SQLBolt lessons 1 to 4 at the PC.
- **On your phone (10 min a day):** Watch the Alex The Analyst SELECT WHERE video, read the "Why it works" parts on written versus run order and on NULL, plus the note on why `>=` and `<` beats `BETWEEN` for dates, and answer Check yourself questions 1 and 3 in your head.
- **Safe to skip this week:** The first hour of the Mosh course, the sqlite.org docs and typing every one of the seven Session 1 filter lines separately can go, because the weekend queries practise the same filters.

---

## Tick off

- [ ] SQLBolt lessons 1–4 done
- [ ] Can filter with `IN`, `LIKE`, `BETWEEN` and `IS NULL`
- [ ] Understand why brackets matter with `AND`/`OR`
- [ ] `week10.sql` saved with all 7 weekend queries
