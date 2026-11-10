# Week 31: The CMMS from an end user's side, Mainsaver to Ultimo

**Phase 4 · Production data: OEE, Redzone & Tableau** · Mon 31 May – Sun 6 Jun 2027 · about 5 hours

Every analysis in this course depends on what technicians type into the CMMS. Your site is moving from **Mainsaver** to **Ultimo**. As an **end user**, you'll be one of the people whose job close-outs become everyone else's data. This week is about doing that well, understanding what a migration does to history, and spotting migration problems before they bite your reports.

**By Sunday you'll be able to:**

- explain the asset hierarchy (functional location vs equipment) and why it matters for history
- describe what a "good" work order close-out contains, and why each field matters
- run migration checks: unmapped, duplicated and merged assets, and failure-code mapping
- keep KPIs continuous across a system change

> **About terminology:** EAM systems use different words for the same ideas. Ultimo, for example, talks about *jobs* (work orders), *process functions* (functional locations, the positions in the plant) and *equipment* (the physical items). Your site's Ultimo training is the authority on the exact terms and screens. The concepts below are what matter.

**Data:** `data/cmms_migration/` (also loaded into `data/line_d.db` as tables of the same names), a made-up example of migration files, shaped like a real project:

- `ultimo_equipment.csv`: new equipment records with new IDs (`EQ-nnnnn`) and a process-function path
- `asset_id_map.csv`: legacy asset ID → new equipment ID
- `failure_code_map.csv`: legacy failure codes → a structured *object part / damage / cause* coding (in the style of the ISO 14224 standard)

---

## Session 1 (1.5 h): Hierarchy and good close-outs

### Functional location vs equipment

- A **functional location / process function** is a *position* in the plant: "Line D › Primary Packing › Wrapper 3 position". It never moves.
- **Equipment** is the *physical thing* installed there: "flow wrapper, serial 12345". It can be removed, overhauled and reinstalled somewhere else.

Why you care: if a gearbox is swapped from position A to position B, do its failures follow the **gearbox** (equipment history: is this unit unreliable?) or stay with the **position** (location history: is this duty hard on gearboxes?). Good reliability analysis needs **both**, which is why the hierarchy is set up carefully during migration.

### A good reactive job close-out

| Field | Why it matters downstream |
|---|---|
| Correct **asset / equipment** (not the parent "Line D") | asset-level MTBF, Weibull, Paretos (Phases 2, 6) |
| **Failure coding**: what part, what damage, what cause | Weibull per failure mode (Week 48); mixing modes ruins β |
| **Actual start and finish times** | MTTR; linking to production stops (Week 30) |
| **Did it stop production?** (Y/N) | criticality checks, maintenance share of OEE loss |
| **Labour hours and parts used** | cost per failure; the C_CM in your optimal interval (Week 49) |
| **Plain-English description** ("bearing on drive end failed, replaced, shaft OK") | the root-cause story; future technicians |

### Do it

Using `data/dirty/wo_export_q1_2026_dirty.csv` and your Phase 1 skills, count the jobs that fail a "good close-out" check: blank completion, labour not numeric, reactive with no failure code. Write a 6-line **close-out checklist** you'd want every technician to follow in Ultimo.

---

## Session 2 (1.5 h): Migration checks

The legacy history (all of `work_orders`) is keyed on legacy asset IDs (`LD-PPK-005`). After cutover, new jobs use new IDs (`EQ-…`). To keep **one continuous history**, every legacy ID must map cleanly to a new one.

### Do it (SQL in DB Browser, or Power Query if you prefer)

```sql
-- 1. Duplicate rows in the map
SELECT legacy_asset_id, equipment_id, COUNT(*) FROM asset_id_map
GROUP BY legacy_asset_id, equipment_id HAVING COUNT(*) > 1;

-- 2. Legacy assets with no new ID
SELECT a.asset_id FROM assets a
LEFT JOIN asset_id_map m ON m.legacy_asset_id = a.asset_id
WHERE m.legacy_asset_id IS NULL;

-- 3. New equipment that several legacy assets were merged into
SELECT equipment_id, GROUP_CONCAT(DISTINCT legacy_asset_id) AS legacy_ids, COUNT(DISTINCT legacy_asset_id) AS n
FROM asset_id_map GROUP BY equipment_id HAVING n > 1;

-- 4. History at risk: legacy work orders on unmapped assets
SELECT COUNT(*) FROM work_orders w
LEFT JOIN asset_id_map m ON m.legacy_asset_id = w.asset_id
WHERE m.legacy_asset_id IS NULL;
```

Full answers are in [`solutions/phase-4-production/w31_migration_checks.sql`](../../solutions/phase-4-production/w31_migration_checks.sql).

**Expected findings:**

| Check | Result |
|---|---|
| Map rows / new equipment records | 290 / 291 |
| Duplicate map rows | **1** (LD-COK-011). It duplicates that asset's 32 jobs: a naive LEFT join turns 11,902 work orders into **11,934**, and an inner join gives 11,911, because the 23 orphaned jobs below also silently drop out. |
| Legacy assets with no new ID | **3**: LD-COK-036, LD-DRY-032, LD-FLK-041 (sensors). Their **23** historical WOs would be orphaned. |
| Merged equipment | **EQ-44667** ← LD-FRM-031 + LD-FRM-032. Two cylinders' histories are now combined, so their MTBF halves overnight. |
| Failure codes | **28** legacy codes, only **8** mapped to the new structure. 20 still need a decision. |

### Why it matters

Each of these silently breaks a KPI after go-live: inflated counts (duplicates), lost history (unmapped), and fake reliability changes (merges). As an end user you can't fix the migration, but **you can spot these early and tell the project team, with evidence**. That's a very good way to get noticed.

---

## Weekend (2 h): KPIs across the cutover

1. **Build the bridge table** that every post-cutover report needs: `legacy_asset_id → equipment_id`, de-duplicated, with the 3 gaps listed for the project team.
2. **Restate a KPI on the new IDs**: reactive breakdowns per **equipment_id** over the two years of legacy history, using a de-duplicated map (`SELECT DISTINCT`). Reconcile: **1,016** of the 1,027 legacy breakdowns carry across, and the missing **11** are on the 3 unmapped sensors. The top equipment is the old LD-PPK-005, Flow wrapper 5, with 37.
3. **Complete the failure-code map** for 5 more codes (e.g. *Mechanical - grippers* → Grippers / Wear / Normal wear). Notice how much judgement it takes. That's why failure coding should be decided once, centrally.
4. **At work:** ask the Ultimo project lead or your supervisor:
   - Will legacy work order history be migrated, or archived?
   - Will failure codes be structured (part / damage / cause), and are they mandatory on close-out?
   - Can end users export job lists to Excel, and which fields?
   - Is there a plan for linking jobs to production stops (Redzone)?

   Write down the answers. They decide what analysis will be possible after go-live.

---

## Watch

- Search *"functional location vs equipment SAP PM explained"*. It's the same concept in another EAM, and these videos explain it clearly.
- Search *"ISO 14224 failure mode taxonomy"* for the standard behind structured failure coding.
- Search *"IFS Ultimo"* for the vendor's own overview, so you know the product your site is moving to.

---

## Check yourself

1. A gearbox is swapped between two positions. Where should its failures be recorded, and why both?
2. Why does a duplicate row in a mapping table inflate KPIs?
3. Two legacy assets are merged into one new record. What happens to its MTBF after migration, and is the asset really less reliable?
4. Why are structured failure codes better than free text for reliability analysis?

<details>
<summary><strong>Answers</strong></summary>

1. Against the **equipment** (that unit's history: is it a bad gearbox?) **and** the **functional location** (that position's history: is it a hard duty?). Recording both lets you tell a bad unit from a bad application.
2. A join to a duplicated key matches every work order on that asset twice (fan-out, Week 11). Counts, hours and costs for that asset double, and the line totals rise with them.
3. Its failure count roughly doubles in the same time window, so its MTBF roughly halves. **Nothing physical changed.** It's a data artefact, and anyone trending MTBF across the cutover would wrongly see a deterioration.
4. You can count and group them reliably, which is essential for Weibull per failure mode, Paretos by mode, and FMEA occurrence scores. Free text varies with every writer ("brg", "bearing gone", "noisy DE"), so it can't be grouped without a lot of cleaning.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** The Session 1 count of jobs failing the close-out check on the dirty Q1 file, the four Session 2 migration checks (1 duplicate, 3 unmapped, 1 merge, 20 unmapped codes), and weekend steps 1 and 2: the de-duplicated bridge table and breakdowns restated on `equipment_id`, reconciled to 1,016 plus 11.
- **On your phone (10 min a day):** Read the functional location versus equipment section and the close-out table, watch a "functional location vs equipment" video, and write your 6-line close-out checklist on paper. At work, ask the Ultimo project lead or your supervisor the four weekend step 4 questions and note the answers.
- **Safe to skip this week:** Weekend step 3 (mapping 5 more failure codes) and the ISO 14224 and IFS Ultimo searches can be skipped this week.

---

## Tick off

- [ ] Can explain functional location vs equipment, and why history needs both
- [ ] Close-out checklist written (6 lines)
- [ ] Migration checks run: 1 duplicate, 3 unmapped, 1 merge, 20 unmapped codes
- [ ] KPI restated on new equipment IDs, with totals reconciled
- [ ] Questions asked of the Ultimo project team, answers noted
