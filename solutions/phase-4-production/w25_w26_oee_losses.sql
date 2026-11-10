-- Weeks 25-26: OEE and production losses from shift records (run against data/line_d.db)

-- 1. Line OEE, all two years: aggregate the minutes and counts FIRST, then divide
SELECT ROUND(100.0 * SUM(run_min) / SUM(planned_production_min), 1)                 AS availability_pct,
       ROUND(100.0 * SUM(total_count) / SUM(run_min * ideal_rate_ppm), 1)           AS performance_pct,
       ROUND(100.0 * SUM(good_count) / SUM(total_count), 1)                         AS quality_pct,
       ROUND(100.0 * SUM(1.0 * good_count / ideal_rate_ppm) / SUM(planned_production_min), 1) AS oee_pct
FROM shifts;

-- 2. OEE by shift, H1 2026
SELECT shift,
       ROUND(100.0 * SUM(1.0 * good_count / ideal_rate_ppm) / SUM(planned_production_min), 1) AS oee_pct,
       COUNT(*) AS shifts
FROM shifts
WHERE production_date >= '2026-01-01'
GROUP BY shift;

-- 3. The minute bridge (waterfall) for H1 2026
SELECT SUM(planned_production_min)                                      AS planned_min,
       SUM(downtime_min)                                                AS availability_loss_min,
       ROUND(SUM(run_min - 1.0 * total_count / ideal_rate_ppm))         AS speed_loss_min,
       ROUND(SUM(1.0 * reject_count / ideal_rate_ppm))                  AS quality_loss_min,
       ROUND(SUM(1.0 * good_count / ideal_rate_ppm))                    AS fully_productive_min
FROM shifts
WHERE production_date >= '2026-01-01';

-- 4. Downtime by reason category, H1 2026 (the loss Pareto)
SELECT reason_category, COUNT(*) AS events, SUM(duration_min) AS minutes,
       ROUND(100.0 * SUM(duration_min) / (SELECT SUM(duration_min) FROM redzone_downtime WHERE production_date >= '2026-01-01'), 1) AS pct
FROM redzone_downtime
WHERE production_date >= '2026-01-01'
GROUP BY reason_category
ORDER BY minutes DESC;

-- 5. How much downtime is unassigned (no reason entered)?
SELECT ROUND(100.0 * SUM(reason_category = 'Unassigned') / COUNT(*), 1)                                  AS pct_events,
       ROUND(100.0 * SUM(CASE WHEN reason_category = 'Unassigned' THEN duration_min END) / SUM(duration_min), 1) AS pct_minutes
FROM redzone_downtime;
