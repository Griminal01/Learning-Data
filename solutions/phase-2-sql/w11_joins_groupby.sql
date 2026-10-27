-- Week 11: JOINs, GROUP BY, HAVING

-- 1. Work orders with their asset name and zone (first rows)
SELECT w.wo_id, w.asset_id, a.asset_name, a.zone_code, w.wo_type
FROM work_orders AS w
JOIN assets AS a ON a.asset_id = w.asset_id
ORDER BY w.wo_id
LIMIT 5;

-- 2. Work order count by type
SELECT wo_type, COUNT(*) AS jobs
FROM work_orders
GROUP BY wo_type
ORDER BY jobs DESC;

-- 3. Reactive jobs and labour hours by zone
SELECT z.zone, COUNT(*) AS reactive_jobs, ROUND(SUM(w.labour_hours), 1) AS labour_hrs
FROM work_orders AS w
JOIN assets AS a ON a.asset_id = w.asset_id
JOIN zones  AS z ON z.zone_code = a.zone_code
WHERE w.wo_type = 'Reactive'
GROUP BY z.zone
ORDER BY reactive_jobs DESC;

-- 4. Assets with more than 8 breakdowns in the two years
SELECT a.asset_id, a.asset_name, COUNT(*) AS breakdowns
FROM work_orders AS w
JOIN assets AS a ON a.asset_id = w.asset_id
WHERE w.wo_type = 'Reactive'
GROUP BY a.asset_id, a.asset_name
HAVING COUNT(*) > 8
ORDER BY breakdowns DESC;

-- 5. Assets that have NEVER had a breakdown (LEFT JOIN + IS NULL)
SELECT COUNT(*) AS assets_never_failed
FROM assets AS a
LEFT JOIN work_orders AS w
       ON w.asset_id = a.asset_id AND w.wo_type = 'Reactive'
WHERE w.wo_id IS NULL;

-- 6. Downtime hours by category and zone
SELECT a.zone_code, d.category, COUNT(*) AS events, ROUND(SUM(d.duration_min) / 60.0, 1) AS hours
FROM downtime_events AS d
JOIN assets AS a ON a.asset_id = d.asset_id
GROUP BY a.zone_code, d.category
ORDER BY a.zone_code, d.category;

-- 7. Downtime events with no work order (minor stops) vs with one
SELECT CASE WHEN wo_id IS NULL THEN 'No WO' ELSE 'Has WO' END AS link, COUNT(*) AS events
FROM downtime_events
GROUP BY link;

-- 8. Average repair labour by asset type, for types with at least 20 breakdowns
SELECT a.asset_type, COUNT(*) AS breakdowns, ROUND(AVG(w.labour_hours), 2) AS avg_labour_hrs
FROM work_orders AS w
JOIN assets AS a ON a.asset_id = w.asset_id
WHERE w.wo_type = 'Reactive'
GROUP BY a.asset_type
HAVING COUNT(*) >= 20
ORDER BY breakdowns DESC;
