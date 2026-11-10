-- Week 13: window functions and reliability metrics
-- Analysis window: 2024-07-01 to 2026-06-30 = 730 days = 17,520 hours (24/7 operation assumed)

-- 1. Number each asset's breakdowns in order (ROW_NUMBER)
SELECT asset_id, wo_id, raised_datetime,
       ROW_NUMBER() OVER (PARTITION BY asset_id ORDER BY raised_datetime) AS failure_no
FROM work_orders
WHERE wo_type = 'Reactive' AND asset_id = 'LD-PPK-005'
LIMIT 5;

-- 2. Days since the previous breakdown on the same asset (LAG)
SELECT asset_id, wo_id, raised_datetime, failure_code,
       ROUND(julianday(raised_datetime)
             - julianday(LAG(raised_datetime) OVER (PARTITION BY asset_id ORDER BY raised_datetime)), 1) AS days_since_last
FROM work_orders
WHERE wo_type = 'Reactive' AND asset_id = 'LD-PPK-005'
LIMIT 6;

-- 3. MTBF (hours) and MTTR (hours) per asset, top 10 worst MTBF
WITH failures AS (
    SELECT asset_id, COUNT(*) AS n_failures
    FROM work_orders
    WHERE wo_type = 'Reactive'
    GROUP BY asset_id
),
repairs AS (
    SELECT asset_id, AVG(duration_min) / 60.0 AS mttr_hrs, SUM(duration_min) / 60.0 AS downtime_hrs
    FROM downtime_events
    WHERE category = 'Breakdown'
    GROUP BY asset_id
)
SELECT a.asset_id, a.asset_name, f.n_failures,
       ROUND(17520.0 / f.n_failures, 0) AS mtbf_hrs,
       ROUND(r.mttr_hrs, 2)             AS mttr_hrs,
       ROUND(100.0 * (17520.0 / f.n_failures) / ((17520.0 / f.n_failures) + r.mttr_hrs), 2) AS availability_pct
FROM failures AS f
JOIN assets   AS a ON a.asset_id = f.asset_id
LEFT JOIN repairs AS r ON r.asset_id = f.asset_id
ORDER BY mtbf_hrs
LIMIT 10;

-- 4. Average time between failures by asset type (mean of the LAG gaps)
WITH gaps AS (
    SELECT w.asset_id, a.asset_type,
           julianday(w.raised_datetime)
             - julianday(LAG(w.raised_datetime) OVER (PARTITION BY w.asset_id ORDER BY w.raised_datetime)) AS gap_days
    FROM work_orders AS w
    JOIN assets AS a ON a.asset_id = w.asset_id
    WHERE w.wo_type = 'Reactive'
)
SELECT asset_type, COUNT(gap_days) AS gaps, ROUND(AVG(gap_days), 1) AS mean_days_between_failures
FROM gaps
WHERE gap_days IS NOT NULL
GROUP BY asset_type
HAVING COUNT(gap_days) >= 10
ORDER BY mean_days_between_failures
LIMIT 6;

-- 5. Running total of reactive downtime hours through 2026 for Primary Packing
WITH daily AS (
    SELECT date(d.start_datetime) AS day, SUM(d.duration_min) / 60.0 AS hrs
    FROM downtime_events AS d
    JOIN assets AS a ON a.asset_id = d.asset_id
    WHERE a.zone_code = 'PPK' AND d.category = 'Breakdown' AND d.start_datetime >= '2026-01-01'
    GROUP BY day
)
SELECT day, ROUND(hrs, 2) AS hrs,
       ROUND(SUM(hrs) OVER (ORDER BY day), 2) AS running_hrs
FROM daily
ORDER BY day DESC
LIMIT 3;

-- 6. Rank zones by reactive downtime within each quarter (RANK)
WITH zq AS (
    SELECT a.zone_code,
           strftime('%Y', d.start_datetime) || '-Q' || ((CAST(strftime('%m', d.start_datetime) AS INTEGER) + 2) / 3) AS quarter,
           SUM(d.duration_min) / 60.0 AS hrs
    FROM downtime_events AS d
    JOIN assets AS a ON a.asset_id = d.asset_id
    WHERE d.category = 'Breakdown'
    GROUP BY a.zone_code, quarter
)
SELECT quarter, zone_code, ROUND(hrs, 1) AS hrs,
       RANK() OVER (PARTITION BY quarter ORDER BY hrs DESC) AS rank_in_quarter
FROM zq
WHERE quarter >= '2026'
ORDER BY quarter, rank_in_quarter;

-- 7. Repeat failures: breakdowns within 7 days of the previous one on the same asset
WITH g AS (
    SELECT asset_id, wo_id, failure_code, raised_datetime,
           julianday(raised_datetime) - julianday(LAG(raised_datetime) OVER (PARTITION BY asset_id ORDER BY raised_datetime)) AS gap_days
    FROM work_orders
    WHERE wo_type = 'Reactive'
)
SELECT COUNT(*) AS repeat_failures_within_7_days
FROM g
WHERE gap_days <= 7;
