# Week 8: Power Pivot, first DAX, and the Phase 1 build

**Phase 1 · Advanced Excel & Power Query** · Mon 21 Dec – Sun 27 Dec 2026 · about 5 hours (it's Christmas week, so spread it out or roll some into next week)

This week you bring it all together into the **PM Compliance Workbook**, the Phase 1 portfolio piece. You'll also take your first step into the Data Model and DAX, the engine behind Power BI, so Phase 3 won't feel foreign.

**By Sunday you'll be able to:**

- load Power Query tables into the **Data Model** and relate them
- build a **Calendar** table
- write simple **DAX measures**: `COUNTROWS`, `SUM`, `CALCULATE`, `DIVIDE`
- pass the Phase 1 *done when* test

**Files:** your `week07_powerquery.xlsx` (or start a fresh workbook `PM_Compliance.xlsx` and rebuild the queries, which is good practice).

---

## Session 1 (1.5 h): The Data Model

### Do it

1. In Queries & Connections, right-click `WorkOrders` → Load To… → tick **Add this data to the Data Model**. Do the same for `Assets`.
2. **Make a Calendar table in Power Query**: Get Data → From Other Sources → **Blank Query**. Open the Advanced Editor and paste:

   ```
   let
       Start = #date(2024, 7, 1),
       End   = #date(2026, 12, 31),
       Dates = List.Dates(Start, Duration.Days(End - Start) + 1, #duration(1,0,0,0)),
       T     = Table.FromList(Dates, Splitter.SplitByNothing(), {"Date"}),
       Typed = Table.TransformColumnTypes(T, {{"Date", type date}}),
       Month = Table.AddColumn(Typed, "Month", each Date.StartOfMonth([Date]), type date),
       MName = Table.AddColumn(Month, "Month Name", each Date.ToText([Date], "MMM yyyy"), type text),
       Qtr   = Table.AddColumn(MName, "Quarter", each "Q" & Text.From(Date.QuarterOfYear([Date])) & " " & Text.From(Date.Year([Date])), type text),
       Week  = Table.AddColumn(Qtr, "Week Commencing", each Date.StartOfWeek([Date], Day.Monday), type date)
   in
       Week
   ```

   Name it `Calendar` and load it to the Data Model only.
3. Data → **Manage Data Model** (the Power Pivot window opens). Switch to **Diagram View** (top right).
4. Drag to create relationships:
   - `WorkOrders[Asset]` → `Assets[asset_id]`
   - `WorkOrders[Due]` → `Calendar[Date]`
5. Notice the **1** and **\*** ends: one asset, many work orders. That's a *one-to-many* relationship, and you'll see it again in Phase 2.

### Why it works

The Data Model holds tables **separately but related**, instead of one giant merged sheet. A pivot built on it can use fields from any related table: Zone from Assets, Month from Calendar, values from WorkOrders. It also handles millions of rows that would choke a normal sheet. Power BI uses exactly this engine.

---

## Session 2 (1.5 h): Your first DAX measures

### Do it

In the Power Pivot window, click the `WorkOrders` table (Data View). In the **calculation area** (the grid under the data), click a cell and type each of these measures. Or, from Excel, go to Power Pivot tab → Measures → New Measure.

```
PMs Due := CALCULATE ( COUNTROWS ( WorkOrders ), WorkOrders[WO Type] = "PM" )

PMs On Time := SUM ( WorkOrders[On Time] )

PM Compliance % := DIVIDE ( [PMs On Time], [PMs Due] )

Reactive Jobs := CALCULATE ( COUNTROWS ( WorkOrders ), WorkOrders[WO Type] = "Reactive" )

Downtime Hrs := DIVIDE ( SUM ( WorkOrders[Downtime Mins] ), 60 )
```

Format `PM Compliance %` as a percentage.

Now Insert → PivotTable → **From Data Model**. Put `Assets[zone]` in Rows, `Calendar[Month]` in Columns, and `PM Compliance %` in Values.

### Why it works

A **measure** is a calculation that runs **in whatever context the pivot gives it**. Put Zone on rows and the same `PM Compliance %` formula calculates per zone. Add Month to columns and it calculates per zone per month. You write it once and it's right everywhere. Compare that with Week 5, where you needed a separate formula for every cut.

`CALCULATE` changes the filter, as in "count rows, *but only where* WO Type is PM". `DIVIDE` is safe division that returns blank instead of an error when there's nothing to divide by. These two functions are 50 % of real-world DAX. Phase 3 goes much deeper.

---

## Weekend build (2 h): PM Compliance Workbook

Build `PM_Compliance.xlsx` with these sheets. Everything must come from queries and the Data Model, with **no typed-in numbers.**

| Sheet | Contents |
|---|---|
| **Dashboard** | Slicers for Zone and Criticality, and a timeline on Calendar[Date]. KPI cells for PM Compliance %, PMs Due, Reactive Jobs and Downtime Hrs (use `=GETPIVOTDATA` or small pivots). Chart: compliance by zone. Chart: compliance trend by month. |
| **Overdue** | PMs not completed with Due before `ReportDate`. Build it as a Power Query table (reference `WorkOrders`, filter `WO Type = PM`, `Completed` is null, `Status = Open`, `Due < ReportDate`), sorted oldest first. |
| **Pareto** | Top 10 assets by reactive downtime hours, with the combo chart from Week 6, driven by the timeline. |
| **About** | Data source, refresh instructions, definitions (*on time = completed on or before due date*), and the report date. |

Formatting rules: one colour for "bad" (overdue, low compliance) used consistently, titles that state findings, no gridlines, and the slicers lined up neatly.

### Phase 1 *done when* test

1. Move `WO_Export_2026-06.csv` **out** of the folder → **Refresh All**. The dashboard should now end at May.
2. Put it **back** → **Refresh All**. June reappears.
3. If every table and chart updated with **zero manual edits**, you've passed Phase 1. 🎉

Tick it off in the tracker app, then commit the workbook to your portfolio (see `portfolio/README.md`).

---

## Watch

- **MyOnlineTrainingHub**: *"MyOnlineTrainingHub Power Pivot tutorial"*.
- **Leila Gharani**: *"Leila Gharani Excel data model relationships"*.
- **SQLBI**: *"SQLBI CALCULATE introduction"*. It's a little ahead of you, but watch it for the idea of filter context.

---

## Check yourself

1. What's the difference between a calculated column (like `On Time` in Power Query) and a measure (like `PM Compliance %`)?
2. Why does `PM Compliance %` give the right answer for each zone without being told about zones?
3. Why do you need a Calendar table instead of just using the `Due` column's dates?
4. Your Data Model pivot shows the same total for every zone. What's wrong?
5. What was PM compliance for **Primary Packing**, Jan–Jun 2026?

<details>
<summary><strong>Answers</strong></summary>

1. A **column** is calculated once per row and stored (on time: yes or no for each WO). A **measure** is calculated on the fly over whatever rows are in the current filter (the % for this zone and this month). Rule of thumb: if you'd want to filter or slice *by* it, make it a column. If you'd want to *see the total* of it, make it a measure.
2. The pivot puts each zone into the **filter context**. The filter flows from `Assets` across the relationship to `WorkOrders`, so the measure only "sees" that zone's rows.
3. The Calendar gives you every date, including days with no work orders, plus months, quarters and weeks to group by. It also lets several tables (work orders, downtime) share the same date filter. Power BI time intelligence needs one.
4. There's no relationship (or a wrong one) between `Assets` and `WorkOrders`, so the zone filter can't reach the work orders. Check the Diagram View.
5. **64.7 %** (356 on time out of 550 due). That's the lowest of any zone. End of Line is next lowest at 74.8 %. The line overall is 79.5 % for the same period.

**More reference numbers:**

- Over all 24 months: 10,502 PMs, overall compliance **79.5 %**. Monthly figures range between about 76 % and 83 %.
- Overdue as at 30/06/2026 (status Open, due before the report date): **17 PMs**. The oldest is `WO-111320`, *Regrind / swap flaking roll* on LD-FLK-013, due 27/05/2026.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** This is the Phase 1 done-when, so none of it is skippable: Session 1 steps 1 to 4 (Calendar and relationships), the five Session 2 measures, the four weekend sheets (Dashboard, Overdue, Pareto, About) and the move-June-out, Refresh All test. It won't fit in 90 minutes, so spread it over several sittings across the holiday week.
- **On your phone (10 min a day):** Watch the MyOnlineTrainingHub Power Pivot tutorial and the SQLBI CALCULATE introduction, read both "Why it works" parts on the Data Model and measures, answer Check yourself questions 1 to 4 in your head, and draft the About sheet definitions on paper.
- **Safe to skip this week:** Only the polish can wait: lining up the slicers, one consistent "bad" colour and finding-style chart titles. The four sheets and the done-when test cannot.

---

## Tick off

- [ ] Calendar table and relationships in the Data Model
- [ ] Five DAX measures working in a Data Model pivot
- [ ] PM Compliance Workbook: Dashboard, Overdue, Pareto and About sheets
- [ ] **Phase 1 done-when test passed** (ticked in the tracker)
