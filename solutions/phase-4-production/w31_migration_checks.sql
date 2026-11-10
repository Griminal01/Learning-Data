-- Week 31: CMMS migration checks (legacy Mainsaver-style IDs -> new Ultimo-style equipment IDs)

-- 1. Duplicate rows in the ID map
SELECT legacy_asset_id, equipment_id, COUNT(*) AS copies
FROM asset_id_map
GROUP BY legacy_asset_id, equipment_id
HAVING COUNT(*) > 1;

-- 2. Legacy assets with no new ID
SELECT a.asset_id, a.asset_name
FROM assets AS a
LEFT JOIN asset_id_map AS m ON m.legacy_asset_id = a.asset_id
WHERE m.legacy_asset_id IS NULL;

-- 3. New equipment records that several legacy assets were merged into
SELECT equipment_id, GROUP_CONCAT(DISTINCT legacy_asset_id) AS legacy_ids, COUNT(DISTINCT legacy_asset_id) AS n
FROM asset_id_map
GROUP BY equipment_id
HAVING COUNT(DISTINCT legacy_asset_id) > 1;

-- 4. History at risk: legacy work orders on unmapped assets
SELECT COUNT(*) AS orphaned_wos
FROM work_orders AS w
LEFT JOIN asset_id_map AS m ON m.legacy_asset_id = w.asset_id
WHERE m.legacy_asset_id IS NULL;

-- 5. What a naive join does to the row count (fan-out from the duplicate)
SELECT (SELECT COUNT(*) FROM work_orders) AS wos,
       (SELECT COUNT(*) FROM work_orders w JOIN asset_id_map m ON m.legacy_asset_id = w.asset_id) AS after_naive_join;

-- 6. Failure codes still needing a decision
SELECT COUNT(*) AS codes, SUM(object_part IS NULL) AS unmapped
FROM failure_code_map;

-- 7. Breakdowns per NEW equipment ID over the legacy history, using a de-duplicated map
WITH bridge AS (SELECT DISTINCT legacy_asset_id, equipment_id FROM asset_id_map)
SELECT b.equipment_id, e.description, COUNT(*) AS breakdowns
FROM work_orders AS w
JOIN bridge AS b ON b.legacy_asset_id = w.asset_id
JOIN ultimo_equipment AS e ON e.equipment_id = b.equipment_id
WHERE w.wo_type = 'Reactive'
GROUP BY b.equipment_id, e.description
ORDER BY breakdowns DESC
LIMIT 5;

-- 8. Reconcile: reactive total on new IDs vs legacy total
WITH bridge AS (SELECT DISTINCT legacy_asset_id, equipment_id FROM asset_id_map)
SELECT (SELECT COUNT(*) FROM work_orders WHERE wo_type = 'Reactive') AS legacy_total,
       (SELECT COUNT(*) FROM work_orders w JOIN bridge b ON b.legacy_asset_id = w.asset_id WHERE w.wo_type = 'Reactive') AS on_new_ids;
