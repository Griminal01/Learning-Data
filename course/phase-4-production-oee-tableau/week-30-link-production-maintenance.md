# Week 30: Linking production downtime to maintenance work orders

**Phase 4 · Production data: OEE, Redzone & Tableau** · Mon 24 May – Sun 30 May 2027 · about 5 hours

This is the most valuable week of the phase. Production sees stops in Redzone. Maintenance sees work orders in the CMMS. **Neither system knows about the other.** Joining them answers questions nobody can answer today:

- *How much of our lost OEE is maintenance-related?*
- *Which **assets** (not "Cooker") cause the downtime?*
- *Which breakdowns cost production time, and which didn't stop the line?*

**By Sunday you'll be able to:**

- map production "machines" to CMMS assets, and handle one-to-many mapping
- match stops to work orders with a **time window**, and choose the window with evidence
- measure match rates in both directions, and explain the gaps
- calculate the maintenance share of lost time, by asset

**Data:** in `data/line_d.db`: `redzone_downtime`, `machine_asset_map`, `work_orders` and `assets`. Solutions are in [`solutions/phase-4-production/w30_link_production_maintenance.sql`](../../solutions/phase-4-production/w30_link_production_maintenance.sql).

---

## Session 1 (1.5 h): The mapping problem

Operators pick the machine they can see. The CMMS records the exact asset. Look at the map:

```sql
SELECT machine, COUNT(*) AS assets
FROM machine_asset_map
GROUP BY machine
ORDER BY assets DESC;
```

- **One to one**: `Wrapper 3` → `LD-PPK-003`. Easy.
- **One to many**: `Cooker` → ~43 assets (motors, pumps, gearboxes, conveyors, sensors…). The stop tells you *roughly where*, and only the work order tells you *what*.
- In real life the map is **something you build**, with production and engineering together. It's often the first deliverable of a project like this. Your site may also have different machine names on different lines.

### Matching rule (first version)

A stop and a work order belong together if:

1. the WO's asset is one of the stop's machine's assets, **and**
2. the WO is **Reactive**, **and**
3. the WO was **raised between the start of the stop and 60 minutes after it**. The operator stops, tries to fix it, then calls maintenance, who raise the job.

```sql
WITH stops AS (
    SELECT * FROM redzone_downtime
    WHERE production_date BETWEEN '2026-01-01' AND '2026-06-30'
      AND duration_min >= 20
)
SELECT s.event_id, s.machine, s.start_time, s.duration_min, s.reason,
       w.wo_id, w.asset_id, w.failure_code,
       ROUND((julianday(w.raised_datetime) - julianday(s.start_time)) * 1440) AS mins_to_wo
FROM stops AS s
JOIN machine_asset_map AS m ON m.machine = s.machine
JOIN work_orders AS w
  ON w.asset_id = m.asset_id
 AND w.wo_type = 'Reactive'
 AND w.raised_datetime BETWEEN s.start_time AND datetime(s.start_time, '+60 minutes')
ORDER BY s.start_time;
```

Look at a few rows. *"Belt / chain off"* on *Packing Conveyors* matches `LD-PPK-020` with *Mechanical - belt/chain*, raised 13 minutes after the stop started. The production event and the maintenance job are now one record.

---

## Session 2 (1.5 h): Choose the window with evidence, and check both directions

### Match rate vs window

For maintenance-coded stops (Mechanical or Electrical, ≥ 20 min, H1 2026, **128 stops**):

| Window after stop start | Stops matched |
|---|---|
| 60 min | 116 (91 %) |
| 180 min | 128 (100 %) |

Wider finds more, but it also finds **wrong** matches. A short stop on "Cooker" can "match" an unrelated job on any of 43 assets that happened to be raised in the next hour. With a 60-minute window, **10 short stops (< 20 min) in H1 2026** match a WO, and most of those are probably coincidences. Look at the `mins_to_wo` distribution and choose a window (say 120 minutes) that catches the slow call-outs without inviting coincidences. Write down why.

### By reason category (stops ≥ 20 min, 60-minute window)

| Category | Stops | With WO | % |
|---|---|---|---|
| Mechanical | 94 | 88 | 94 |
| Electrical | 34 | 28 | 82 |
| **Unassigned** | 21 | 21 | **100** |
| Operational | 8 | 7 | 88 |
| Changeover / Material / Quality / People | 126 | 0 | 0 |

Two great findings:

- **Every long Unassigned stop has a breakdown work order.** Uncoded downtime is mostly maintenance. Linking the systems **recovers** the reason the operator didn't enter.
- **7 "Operational" long stops have breakdown WOs.** They're breakdowns coded as jams, so the Redzone Pareto under-counts maintenance.

### The other direction: reactive WOs with a production stop (H1 2026)

| Criticality | Reactive WOs | With a stop | % |
|---|---|---|---|
| A | 73 | 66 | 90 |
| B | 104 | 64 | 62 |
| C | 59 | 17 | 29 |

C-critical breakdowns mostly **don't stop the line**, and that's what criticality is supposed to mean. If an A-critical asset's breakdowns often *don't* stop the line, or a C asset's often *do*, your **criticality ranking is wrong**. That's direct, evidence-based input to the PM pillar.

---

## Weekend (2 h): Maintenance share of lost time, by asset

1. **Maintenance share**: minutes of stops with a matched WO ÷ all downtime minutes. For H1 2026, that's **16,677 of 36,549 minutes = 45.6 %**. (Use your chosen window; the answer will move a little.)
2. **By asset**: for matched stops, sum the stop minutes by the WO's `asset_id`, then join `assets`. That's the top-10 list *production* cares about, in *maintenance's* language. Compare it with your Phase 2 done-when list (based on CMMS downtime). Same assets? Why might they differ?
3. **Vocabulary map**: count matched pairs of `reason` (operator words) and `failure_code` (maintenance code). "Sensor fault" ↔ *Electrical - sensor* is consistent. "Jam" ↔ *Operational - jam* raised as a breakdown WO is worth a conversation. Is that a jam or a failure?
4. **Export** the matched-stops result (DB Browser: run the query, then the "save results" button → CSV) as `matched_stops.csv`. You'll use it in Tableau next week and in the Phase 4 build.

---

## Watch

- Search *"joining production and maintenance data OEE CMMS"* for case studies.
- Re-watch your Week 11 and Week 13 notes on joins, `LEFT JOIN … IS NULL` and window functions. They're all used here.

---

## Check yourself

1. Why match on a time *window* rather than an exact timestamp?
2. What's the risk of a very wide window, and which machines are most exposed to it?
3. 100 % of long Unassigned stops have a breakdown WO. What should you recommend?
4. A-critical WOs have a production stop 90 % of the time. Give one reason for the other 10 %.

<details>
<summary><strong>Answers</strong></summary>

1. The two systems record different moments: the operator logs the stop start, and maintenance raises the job later (minutes or hours later). Clocks and habits differ too, so exact timestamps almost never line up.
2. False matches: unrelated jobs raised during the window get linked to a stop. Grouped machines with many assets ("Cooker" ~43, "Packing Conveyors") are most exposed, because there are more candidate WOs. Use the shortest window that catches genuine late call-outs, and check matches on short stops.
3. Two things. (a) In reporting, reclassify long Unassigned stops that have a breakdown WO as maintenance, and say so. (b) In the process, make reason entry quick at the time of the stop, or let maintenance's WO update the stop reason. The data shows uncoded stops are breakdowns, which are exactly the stops that matter.
4. The breakdown happened when the line wasn't running (a weekend, or a planned stop), the asset has redundancy or a buffer, the WO was raised long after the stop (outside the window), or it was a minor failure that didn't stop production. Each one is worth checking.

</details>

---

## Tick off

- [ ] Machine → asset mapping understood (one-to-one vs one-to-many)
- [ ] Stops matched to WOs with a time window, chosen with evidence
- [ ] Match rates in both directions, with the gaps explained
- [ ] Maintenance share of lost time (~46 %) and top assets calculated
- [ ] `matched_stops.csv` exported for Tableau
