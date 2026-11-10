# Week 32: Phase 4 build, the OEE & maintenance impact dashboard

**Phase 4 · Production data: OEE, Redzone & Tableau** · Mon 7 Jun – Sun 13 Jun 2027 · about 5 hours

> **Done when:** you can rebuild the line's OEE from raw shift data so it **matches the dashboard figure**, and show in a **Tableau dashboard** what share of lost time is maintenance-related and **which assets** drive it.

This build joins the two worlds: production's OEE view and maintenance's asset view, in the tool your production team already uses.

---

## Session 1 (1.5 h): Data and model in Tableau

### Sources

| File | Grain | Notes |
|---|---|---|
| `production/shifts.csv` | one row per shift | OEE inputs |
| `production/redzone_downtime.csv` | one row per stop | reasons |
| `matched_stops.csv` (yours, from Week 30) | one row per stop with a matched WO | `event_id`, `wo_id`, `asset_id`, `failure_code` |
| `csv/assets.csv` | one row per asset | zone, type, criticality |

### Do it

1. Connect `shifts.csv`. Add `redzone_downtime.csv` and **relate** them (the "noodle", not a join) on `Production Date` = `Production Date` **and** `Shift` = `Shift`.
2. Relate `matched_stops.csv` to `redzone_downtime` on `Event Id`, and `assets.csv` to `matched_stops` on `Asset Id`.

### Why relationships, not joins

A join of shifts (one row) to stops (many rows) would repeat each shift's planned minutes once per stop, and your OEE would be wrong (fan-out, Week 11). Tableau **relationships** keep each table at its own grain and only combine them at the level of the view, which is the same idea as a Power BI star schema. Test it: OEE for H1 2026 must still read **71.9 %** after adding the other tables.

---

## Session 2 (1.5 h): Build the sheets

1. **KPI row**: OEE, Availability, Performance, Quality (H1 2026: 71.9 / 85.2 / 86.0 / 98.1 %).
2. **Minute bridge**: planned 243,540 → downtime 36,146 → speed 28,989 → quality 3,350 → productive 175,055. Tableau has no built-in waterfall, so use a **Gantt bar** with a running total (search *"Tableau waterfall chart"*). It's a good table-calculation workout.
3. **Downtime by reason category** with a calculated field `Maintenance?`:

   ```
   IF NOT ISNULL([Wo Id]) THEN "Maintenance (has breakdown WO)"
   ELSEIF [Reason Category] IN ("Mechanical", "Electrical") THEN "Maintenance-coded, no WO"
   ELSE "Not maintenance" END
   ```

   as a stacked bar. Show the maintenance share of lost time as a big number (about **46 %** with a 60-minute window).
4. **Top 10 assets by matched stop minutes**: the asset ID, name and criticality, with the failure code on tooltips. Production's losses in maintenance's language.
5. **OEE trend** by week with a 4-week moving average and a target parameter line.

## Weekend (2 h): Assemble, test, publish

1. **Dashboard**: KPI row at the top, bridge (left) plus maintenance share (right), top-10 assets, and the trend at the bottom. Add a filter action from the reason chart to the top-10 list, and a date-range filter applied to all sheets.
2. **About** text box: OEE definitions (Week 25), the matching rule and window (Week 30), and "synthetic data" clearly stated.
3. **The done-when test:**
   - Rebuild H1 2026 OEE from raw shifts in Excel or SQL, without Tableau. It must equal the dashboard's **71.9 %**, and the downloaded crosstab's Grand Total.
   - Show someone the dashboard and ask: *"How much of our lost time is maintenance, and which three assets would you tackle first?"* If they can answer from the dashboard alone, **Phase 4 is passed.** 🎉
4. **Portfolio**: `portfolio/04-oee-maintenance-impact/` with a link to the Tableau Public dashboard, screenshots, your SQL from Week 30, and a README covering the problem (two systems that don't talk to each other), the method (mapping, time-window matching), the findings (≈ 46 % of lost time is maintenance, uncoded stops are mostly breakdowns, C-critical breakdowns rarely stop the line), and what you'd do with real data.

---

## At work, next steps (with permission)

- Take your OEE definitions note and the matching method to your manager and the CI lead. Propose a small pilot on **one line, one month**: a permitted event-level Redzone download, plus a CMMS job export, matched with your Week 30 query.
- After Ultimo goes live, include the **ID bridge table** (Week 31), so the legacy and new histories join up.
- Suggest a simple process fix: maintenance adds the Redzone stop reference to the job, or production can see the job number. Once the two systems carry each other's IDs, matching becomes exact instead of time-window guesswork.

---

## Check yourself: Phase 4 review

1. Define OEE in one sentence, and give the safest formula.
2. Why use Tableau relationships rather than joins between shifts and stops?
3. Name three things that make operator-coded downtime unreliable, and one way linking to the CMMS helps.
4. What three migration problems can silently change a KPI after a CMMS change?

<details>
<summary><strong>Answers</strong></summary>

1. OEE is the share of planned production time that was fully productive: running, at ideal speed, making good product. The safest formula is good count × ideal cycle time ÷ planned production time.
2. The tables have different grains. Joining repeats each shift row for every stop and inflates the minute and count totals. Relationships aggregate each table at its own level before combining.
3. Any three of: unassigned stops; wrong categories (breakdowns coded as jams); grouped machines hiding the actual asset; reasons entered late from memory; changeovers logged against one machine. Linking to WOs recovers the true cause and the exact asset for maintenance-related stops.
4. Duplicate map rows (inflated counts), unmapped assets (lost history) and merged assets (fake MTBF drops). Inconsistent failure-code mapping is a fourth.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** This is the Phase 4 done-when, so none of the core is skippable: the Session 1 relationships with OEE still at 71.9 %, the five Session 2 sheets, the weekend dashboard with About box published to Tableau Public, the three-way OEE reconciliation, a colleague answering the two questions unaided, and the portfolio folder. Plan on several sittings, not one.
- **On your phone (10 min a day):** Read "Why relationships, not joins", do the Phase 4 review in Check yourself in your head, draft the About box text and the README findings on paper, and line up a colleague at work for the test.
- **Safe to skip this week:** Only polish and follow-ups can wait: the moving average and target line on the trend sheet, extra formatting, and the "At work, next steps" pilot proposal, which comes after the phase.

---

## Tick off

- [ ] Tableau model with relationships, OEE still 71.9 %
- [ ] Bridge, maintenance share, top-10 assets and trend sheets
- [ ] Dashboard with actions, an About box, and published to Tableau Public
- [ ] **Done-when passed**: OEE reconciled three ways, and a colleague answered the questions unaided
- [ ] `portfolio/04-oee-maintenance-impact/` committed
