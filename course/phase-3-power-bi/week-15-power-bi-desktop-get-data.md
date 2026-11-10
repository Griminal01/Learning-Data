# Week 15: Power BI Desktop and getting data in

**Phase 3 · Power BI** · Mon 8 Feb – Sun 14 Feb 2027 · about 5 hours

**Phase 3 goal:** a Line D maintenance dashboard that the team could use in a weekly review **without you explaining it**. This is the longest phase (10 weeks), because DAX is where most people stall, and the payoff at work is huge.

Good news: Power BI Desktop *is* Power Query + the Data Model + charts. You already know two of those three.

**By Sunday you'll be able to:**

- find your way around Power BI Desktop's three views (Report, Table, Model)
- load all the Line D tables from CSV with correct types
- reuse your Power Query skills in Power BI
- build your first visuals and save a `.pbix`

**Install:** Power BI Desktop is free from the **Microsoft Store** (search *Power BI Desktop*). The Store version updates itself. It runs on Windows only.

**Before you start at work:** check with IT whether Power BI Desktop is allowed on your work laptop, and whether the site has Power BI *Pro* licences for sharing (Week 23). For now, everything happens on your home PC with practice data.

---

## Session 1 (1.5 h): Tour and first load

### Do it

1. Open Power BI Desktop → **Blank report**. Look at the left-hand bar: **Report** view (canvas), **Table** view (data grid) and **Model** view (relationships).
2. Home → Get Data → **Text/CSV** → `data/csv/assets.csv` → **Transform Data**. The Power Query editor opens, the same one as in Excel.
3. Check the types. `install_date` should be *Date* and `criticality` *Text*. Name the query `Assets`.
4. Load the other tables the same way, and rename each query:

   | File | Query name |
   |---|---|
   | `work_orders.csv` | `WorkOrders` |
   | `downtime_events.csv` | `Downtime` |
   | `pm_tasks.csv` | `PMTasks` |
   | `zones.csv` | `Zones` |
   | `sensor_rollout.csv` | `SensorRollout` |

5. Type checks in `WorkOrders`:
   - `raised_datetime` → **Date/Time**
   - `due_date` and `completed_date` → **Date** (blanks become `null`, which is correct)
   - `labour_hours` → Decimal, and `priority` → Whole Number
6. In `Downtime`, set `start_datetime`/`end_datetime` → Date/Time and `duration_min` → Whole Number.
7. **Close & Apply.** Go to Table view and click each table. Check the row count at the bottom: WorkOrders **11,902**, Downtime **6,177**, Assets **292**.
8. Save as `LineD_Maintenance.pbix`.

### Why it works

These CSVs use ISO dates (`2026-06-30`), so there's no UK/US ambiguity and Power BI types them correctly. That's another reason ISO is the standard for data files.

A `.pbix` stores the queries, the compressed data, the model and the report all in one file. When the CSVs change, **Home → Refresh** re-runs the queries.

---

## Session 2 (1.5 h): Shape data in Power Query (Power BI edition)

### Do it

Open **Transform data**. In `WorkOrders`:

1. Add Column → Custom Column `Raised Date` = `DateTime.Date([raised_datetime])`, type Date. You'll need a date-only column to relate to a calendar.
2. Add a conditional column `Is Planned`: if `wo_type` equals `Reactive` then `0` else `1`.
3. Add `PM Result` (Custom Column):

   ```
   if [wo_type] <> "PM" then null
   else if [status] = "Open" then "Open"
   else if [completed_date] = null then "Missed"
   else if [completed_date] <= [due_date] then "On time"
   else "Late"
   ```

   It's the same logic as your SQL CASE in Week 12. Set its type to Text.
4. In `Downtime`, add `Start Date` = `DateTime.Date([start_datetime])`, and `Duration Hrs` = `[duration_min] / 60`.
5. **Build a Calendar in Power Query.** New Source → Blank Query → Advanced Editor → paste the M code from Week 8 (1 July 2024 – 31 Dec 2026), and add a `Year` column at the end:

   ```
   Year = Table.AddColumn(Week, "Year", each Date.Year([Date]), Int64.Type)
   ```

   (Remember to change the final `in` line to `Year`.) Name it `Calendar`.
6. Close & Apply.

### Why it works

The rule from Phase 1 still holds: **do row-level shaping in Power Query** (types, flags, labels, date-only columns), and **do aggregation in DAX measures** (next weeks). Power Query results are stored and compressed; measures are calculated on demand.

---

## Weekend task (2 h): First visuals

On the Report canvas:

1. **Card**: drag `WorkOrders[wo_id]` onto the canvas → change the visual to *Card* → it shows Count of wo_id = **11,902**.
2. **Clustered bar**: `Assets[zone]` on the Y-axis and `WorkOrders[wo_id]` (Count) on the X-axis. It won't split properly by zone yet. **Why not?** Write down your guess. (Next week's relationships fix it.)
3. **Table** visual: `WorkOrders[wo_type]`, Count of wo_id, Sum of labour_hours.
4. **Slicer**: `WorkOrders[wo_type]`. Click Reactive and watch the other visuals change.
5. **Explore the formatting pane** (the paintbrush icon): titles, data labels, colours. Make the bar chart readable.
6. Play. Drag fields about and try different visuals. Nothing you do here can break the data.

---

## Watch

- **Guy in a Cube**: *"Guy in a Cube Power BI for beginners"*.
- **Microsoft Learn**: the free PL-300 learning path. Search *"PL-300 Microsoft Learn study guide"*, then do the module *Get data in Power BI*.
- **Kevin Stratvert**: *"Kevin Stratvert Power BI tutorial for beginners"*, a full one-hour walkthrough.

---

## Check yourself

1. Which view do you use to check a table's row count? Which do you use to set relationships?
2. Why add a date-only `Raised Date` column when `raised_datetime` already exists?
3. Where should "is this PM on time?" be calculated, in Power Query or as a DAX measure? Why?
4. Your bar of work orders by zone shows the same number (11,902) for every zone. Why?

<details>
<summary><strong>Answers</strong></summary>

1. Table view for row counts. Model view for relationships.
2. A calendar has one row per **date**. `2026-06-14 09:30` won't match `2026-06-14` in a relationship, so you need the date part on its own.
3. Power Query (or a calculated column): it's a property of **each row**, and you'll want to filter and group by it. The *percentage* on time is the measure.
4. There's no relationship between Assets and WorkOrders yet, so the zone filter can't reach the work orders, and every bar shows the grand total. (Power BI may have auto-detected the relationship. If so, your chart is already right. Check Model view.)

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 2 to 8 (six tables with correct types, row counts 11,902 / 6,177 / 292, saved as `LineD_Maintenance.pbix`), Session 2 steps 1 to 6 (`Raised Date`, `Is Planned`, `PM Result`, `Start Date`, `Duration Hrs` and the Calendar), and weekend steps 1 to 4 for the first card, bar, table and slicer.
- **On your phone (10 min a day):** Watch the Guy in a Cube Power BI for beginners video, read the PL-300 *Get data in Power BI* module and both "Why it works" parts, and answer Check yourself in your head. At work, ask IT whether Power BI Desktop is allowed and whether the site has Pro licences.
- **Safe to skip this week:** Weekend steps 5 and 6 (the formatting pane and free play) and the hour-long Kevin Stratvert walkthrough can be skipped.

---

## Tick off

- [ ] Power BI Desktop installed
- [ ] Six tables plus Calendar loaded with correct types and row counts
- [ ] `PM Result`, `Is Planned`, `Raised Date` and `Duration Hrs` columns added in Power Query
- [ ] First card, bar, table and slicer on the canvas
- [ ] `LineD_Maintenance.pbix` saved
