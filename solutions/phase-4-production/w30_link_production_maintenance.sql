-- Week 30: link production downtime (Redzone-style) to CMMS work orders

-- 1. How many CMMS assets sit behind each production "machine"?
SELECT machine, COUNT(*) AS assets
FROM machine_asset_map
GROUP BY machine
ORDER BY assets DESC
LIMIT 5;

-- 2. Candidate matches: a reactive WO on one of the machine's assets,
--    raised from the start of the stop up to 60 minutes after it
WITH stops AS (
    SELECT * FROM redzone_downtime
    WHERE production_date BETWEEN '2026-01-01' AND '2026-06-30'
      AND duration_min >= 20                      -- long enough that maintenance would be called
),
candidates AS (
    SELECT s.event_id, s.machine, s.start_time, s.duration_min, s.reason_category, s.reason,
           w.wo_id, w.asset_id, w.failure_code, w.raised_datetime,
           ROUND((julianday(w.raised_datetime) - julianday(s.start_time)) * 1440) AS mins_to_wo,
           ROW_NUMBER() OVER (PARTITION BY s.event_id ORDER BY w.raised_datetime) AS rn
    FROM stops AS s
    JOIN machine_asset_map AS m ON m.machine = s.machine
    JOIN work_orders AS w
      ON w.asset_id = m.asset_id
     AND w.wo_type = 'Reactive'
     AND w.raised_datetime BETWEEN s.start_time AND datetime(s.start_time, '+60 minutes')
)
SELECT event_id, machine, start_time, duration_min, reason_category, reason,
       wo_id, asset_id, failure_code, mins_to_wo
FROM candidates
WHERE rn = 1
ORDER BY start_time
LIMIT 8;

-- 3. Match rate by reason category (stops >= 20 min, H1 2026)
WITH stops AS (
    SELECT * FROM redzone_downtime
    WHERE production_date BETWEEN '2026-01-01' AND '2026-06-30' AND duration_min >= 20
),
matched AS (
    SELECT DISTINCT s.event_id
    FROM stops AS s
    JOIN machine_asset_map AS m ON m.machine = s.machine
    JOIN work_orders AS w
      ON w.asset_id = m.asset_id AND w.wo_type = 'Reactive'
     AND w.raised_datetime BETWEEN s.start_time AND datetime(s.start_time, '+60 minutes')
)
SELECT s.reason_category, COUNT(*) AS stops, COUNT(m.event_id) AS with_wo,
       ROUND(100.0 * COUNT(m.event_id) / COUNT(*), 0) AS pct_with_wo,
       SUM(s.duration_min) AS minutes,
       SUM(CASE WHEN m.event_id IS NOT NULL THEN s.duration_min ELSE 0 END) AS minutes_with_wo
FROM stops AS s
LEFT JOIN matched AS m ON m.event_id = s.event_id
GROUP BY s.reason_category
ORDER BY minutes DESC;

-- 4. The other direction: reactive WOs in H1 2026 with no matching production stop
WITH wo AS (
    SELECT w.*, a.criticality FROM work_orders AS w JOIN assets AS a ON a.asset_id = w.asset_id
    WHERE w.wo_type = 'Reactive' AND w.raised_datetime BETWEEN '2026-01-01' AND '2026-06-30 23:59'
),
hit AS (
    SELECT DISTINCT wo.wo_id
    FROM wo
    JOIN machine_asset_map AS m ON m.asset_id = wo.asset_id
    JOIN redzone_downtime AS s
      ON s.machine = m.machine
     AND wo.raised_datetime BETWEEN s.start_time AND datetime(s.start_time, '+60 minutes')
)
SELECT wo.criticality, COUNT(*) AS reactive_wos, COUNT(hit.wo_id) AS with_stop,
       ROUND(100.0 * COUNT(hit.wo_id) / COUNT(*), 0) AS pct_with_stop
FROM wo
LEFT JOIN hit ON hit.wo_id = wo.wo_id
GROUP BY wo.criticality
ORDER BY wo.criticality;

-- 5. Maintenance share of lost time: minutes of matched stops / all downtime minutes (H1 2026)
WITH stops AS (
    SELECT * FROM redzone_downtime WHERE production_date BETWEEN '2026-01-01' AND '2026-06-30'
),
matched AS (
    SELECT DISTINCT s.event_id, s.duration_min
    FROM stops AS s
    JOIN machine_asset_map AS m ON m.machine = s.machine
    JOIN work_orders AS w
      ON w.asset_id = m.asset_id AND w.wo_type = 'Reactive'
     AND w.raised_datetime BETWEEN s.start_time AND datetime(s.start_time, '+60 minutes')
)
SELECT (SELECT SUM(duration_min) FROM stops)   AS all_downtime_min,
       (SELECT SUM(duration_min) FROM matched) AS stops_with_wo_min,
       ROUND(100.0 * (SELECT SUM(duration_min) FROM matched) / (SELECT SUM(duration_min) FROM stops), 1) AS pct_with_wo;

-- 6. Operator words vs maintenance failure codes for matched stops
WITH m AS (
    SELECT s.reason, w.failure_code,
           ROW_NUMBER() OVER (PARTITION BY s.event_id ORDER BY w.raised_datetime) AS rn
    FROM redzone_downtime AS s
    JOIN machine_asset_map AS mm ON mm.machine = s.machine
    JOIN work_orders AS w
      ON w.asset_id = mm.asset_id AND w.wo_type = 'Reactive'
     AND w.raised_datetime BETWEEN s.start_time AND datetime(s.start_time, '+60 minutes')
)
SELECT reason, failure_code, COUNT(*) AS n
FROM m WHERE rn = 1
GROUP BY reason, failure_code
ORDER BY n DESC
LIMIT 10;
