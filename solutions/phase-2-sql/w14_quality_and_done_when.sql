-- Week 14: data quality checks and the Phase 2 done-when query

-- 1. Duplicate keys? (should return nothing)
SELECT wo_id, COUNT(*) FROM work_orders GROUP BY wo_id HAVING COUNT(*) > 1;

-- 2. Orphans: work orders whose asset isn't in the register (should be 0)
SELECT COUNT(*) AS orphan_wos
FROM work_orders AS w
LEFT JOIN assets AS a ON a.asset_id = w.asset_id
WHERE a.asset_id IS NULL;

-- 3. Nulls by column for PM work orders
SELECT COUNT(*) AS pm_rows,
       SUM(due_date IS NULL)        AS null_due,
       SUM(completed_date IS NULL)  AS null_completed,
       SUM(technician IS NULL)      AS null_technician
FROM work_orders
WHERE wo_type = 'PM';

-- 4. Logic check: completed before it was raised
SELECT COUNT(*) AS completed_before_raised
FROM work_orders
WHERE completed_date < date(raised_datetime);

-- 5. Logic check: Completed status with no completion date, or a date with a non-Completed status
SELECT status, SUM(completed_date IS NULL) AS no_date, SUM(completed_date IS NOT NULL) AS has_date
FROM work_orders
GROUP BY status;

-- 6. Outliers: breakdown downtime longer than 12 hours
SELECT event_id, asset_id, start_datetime, duration_min, cause
FROM downtime_events
WHERE category = 'Breakdown' AND duration_min > 720
ORDER BY duration_min DESC;

-- 7. Asset codes that don't follow the LD-XXX-NNN pattern (GLOB is SQLite's pattern match)
SELECT COUNT(*) AS bad_codes
FROM assets
WHERE asset_id NOT GLOB 'LD-[A-Z][A-Z][A-Z]-[0-9][0-9][0-9]';

-- 8. DONE-WHEN: the 10 assets that lost the most hours to reactive work in Q2 2026,
--    and how on-time their PMs were in the same quarter
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
       ROUND(100.0 * p.pms_on_time / p.pms_due, 0) AS pm_on_time_pct,
       CASE WHEN p.pms_on_time = p.pms_due THEN 'PMs on time'
            ELSE 'PMs late/missed' END AS verdict
FROM loss AS l
JOIN assets AS a ON a.asset_id = l.asset_id
LEFT JOIN pm AS p ON p.asset_id = l.asset_id
ORDER BY l.reactive_hrs DESC
LIMIT 10;
