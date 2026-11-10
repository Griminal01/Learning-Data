-- Week 10 weekend answers: SELECT, WHERE, ORDER BY, LIMIT, DISTINCT

-- 1. Assets made by Kestrel Drives, oldest first
SELECT asset_id, asset_name, install_date
FROM assets
WHERE manufacturer = 'Kestrel Drives'
ORDER BY install_date;

-- 2. PM work orders for LD-PPK-005 that weren't completed
SELECT wo_id, description, due_date, status
FROM work_orders
WHERE asset_id = 'LD-PPK-005' AND wo_type = 'PM' AND status <> 'Completed';

-- 3. The 5 reactive jobs with the most labour hours
SELECT wo_id, asset_id, description, labour_hours
FROM work_orders
WHERE wo_type = 'Reactive'
ORDER BY labour_hours DESC
LIMIT 5;

-- 4. Assets with Burner in the name
SELECT asset_id, asset_name, zone_code
FROM assets
WHERE asset_name LIKE '%Burner%';

-- 5. Work orders with no completed date
SELECT COUNT(*) AS not_completed
FROM work_orders
WHERE completed_date IS NULL;

-- 6. Breakdowns raised on Christmas Day 2025
SELECT wo_id, asset_id, raised_datetime, description
FROM work_orders
WHERE wo_type = 'Reactive' AND raised_datetime LIKE '2025-12-25%';

-- 7. Replace sealing jaws PMs that weren't completed
SELECT wo_id, asset_id, due_date, status
FROM work_orders
WHERE description = 'Replace sealing jaws' AND status <> 'Completed';

-- Session examples
-- A-critical assets in Primary Packing
SELECT asset_id, asset_name, asset_type
FROM assets
WHERE zone_code = 'PPK' AND criticality = 'A'
ORDER BY asset_id;

-- Distinct failure codes on breakdowns
SELECT DISTINCT failure_code
FROM work_orders
WHERE wo_type = 'Reactive'
ORDER BY failure_code;

-- Brackets matter: compare these two
SELECT COUNT(*) AS without_brackets FROM work_orders
WHERE wo_type = 'Reactive' OR wo_type = 'Corrective' AND labour_hours > 3;

SELECT COUNT(*) AS with_brackets FROM work_orders
WHERE (wo_type = 'Reactive' OR wo_type = 'Corrective') AND labour_hours > 3;
