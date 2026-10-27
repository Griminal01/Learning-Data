-- Week 12: CASE, CTEs (WITH), date functions

-- 1. Label each PM as On time / Late / Missed / Open
SELECT wo_id, due_date, completed_date,
       CASE
         WHEN status = 'Open'                THEN 'Open'
         WHEN completed_date IS NULL         THEN 'Missed'
         WHEN completed_date <= due_date     THEN 'On time'
         ELSE 'Late'
       END AS pm_result
FROM work_orders
WHERE wo_type = 'PM'
LIMIT 5;

-- 2. Count of each PM result
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

-- 3. PM compliance by month due (strftime pulls out year-month)
SELECT strftime('%Y-%m', due_date) AS due_month,
       COUNT(*) AS pms_due,
       SUM(CASE WHEN completed_date <= due_date THEN 1 ELSE 0 END) AS on_time,
       ROUND(100.0 * SUM(CASE WHEN completed_date <= due_date THEN 1 ELSE 0 END) / COUNT(*), 1) AS compliance_pct
FROM work_orders
WHERE wo_type = 'PM'
GROUP BY due_month
ORDER BY due_month;

-- 4. Days late for late PMs (julianday turns a date into a number of days)
SELECT wo_id, asset_id, due_date, completed_date,
       CAST(julianday(completed_date) - julianday(due_date) AS INTEGER) AS days_late
FROM work_orders
WHERE wo_type = 'PM' AND completed_date > due_date
ORDER BY days_late DESC
LIMIT 5;

-- 5. CTE: compliance by zone for H1 2026, then keep zones under 80 %
WITH pm AS (
    SELECT a.zone_code,
           CASE WHEN w.completed_date <= w.due_date THEN 1 ELSE 0 END AS on_time
    FROM work_orders AS w
    JOIN assets AS a ON a.asset_id = w.asset_id
    WHERE w.wo_type = 'PM'
      AND w.due_date BETWEEN '2026-01-01' AND '2026-06-30'
),
by_zone AS (
    SELECT zone_code, COUNT(*) AS due, SUM(on_time) AS on_time,
           ROUND(100.0 * SUM(on_time) / COUNT(*), 1) AS compliance_pct
    FROM pm
    GROUP BY zone_code
)
SELECT * FROM by_zone
WHERE compliance_pct < 80
ORDER BY compliance_pct;

-- 6. Breakdowns by hour of day (when do things fail?)
SELECT CAST(strftime('%H', raised_datetime) AS INTEGER) AS hour, COUNT(*) AS breakdowns
FROM work_orders
WHERE wo_type = 'Reactive'
GROUP BY hour
ORDER BY hour
LIMIT 4;

-- 7. Planned vs reactive ratio by quarter
WITH q AS (
    SELECT strftime('%Y', raised_datetime) || '-Q' ||
           ((CAST(strftime('%m', raised_datetime) AS INTEGER) + 2) / 3) AS quarter,
           CASE WHEN wo_type = 'Reactive' THEN 0 ELSE 1 END AS planned
    FROM work_orders
)
SELECT quarter, COUNT(*) AS jobs, SUM(planned) AS planned_jobs,
       ROUND(100.0 * SUM(planned) / COUNT(*), 1) AS planned_pct
FROM q
GROUP BY quarter
ORDER BY quarter;
