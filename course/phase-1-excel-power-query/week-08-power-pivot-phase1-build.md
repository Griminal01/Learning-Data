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

1. Open `week07_powerquery.xlsx` and **File → Save As** `PM_Compliance.xlsx`. You'll build the rest of the week in this file.
2. **Add WorkOrders to the Data Model.** In Queries & Connections, right-click `WorkOrders` → **Load To…** → tick **Add this data to the Data Model** → OK.
3. Do the same for `Assets`. Keep it as *Only Create Connection*, but tick **Add this data to the Data Model**.
4. **Make a Calendar table.** Data → Get Data → From Other Sources → **Blank Query**.
5. In the editor, Home → **Advanced Editor**. Delete what's there and paste:

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

6. Click **Done**.

   **You should see:** one row per day from 01/07/2024, with Month, Month Name, Quarter and Week Commencing columns.
7. Rename the query `Calendar`.
8. Home → Close & Load **To…** → *Only Create Connection* and tick **Add this data to the Data Model** → OK.
9. Data → **Manage Data Model**. The Power Pivot window opens.
10. Click **Diagram View** (top right).

    **You should see:** three boxes: `WorkOrders`, `Assets` and `Calendar`.
11. **First relationship.** Drag `Asset` in the `WorkOrders` box onto `asset_id` in the `Assets` box.
12. **Second relationship.** Drag `Due` in `WorkOrders` onto `Date` in `Calendar`.

    **You should see:** two lines joining the boxes.
13. Look at the ends of each line: a **1** at `Assets` and a **\*** at `WorkOrders`. One asset, many work orders. That's a *one-to-many* relationship, and you'll see it again in Phase 2.

### Why it works

The Data Model holds tables **separately but related**, instead of one giant merged sheet. A pivot built on it can use fields from any related table: Zone from Assets, Month from Calendar, values from WorkOrders. It also handles millions of rows that would choke a normal sheet. Power BI uses exactly this engine.

---

## Session 2 (1.5 h): Your first DAX measures

### Do it

1. In the Power Pivot window, click **Data View**, then the `WorkOrders` tab at the bottom.
2. Click any empty cell in the **calculation area**, the grey grid under the data.
3. **First measure.** Type this into the formula bar and press Enter:

   ```
   PMs Due := CALCULATE ( COUNTROWS ( WorkOrders ), WorkOrders[WO Type] = "PM" )
   ```

   **You should see:** `PMs Due: 10502` in the cell.
4. Click the next empty cell and add:

   ```
   PMs On Time := SUM ( WorkOrders[On Time] )
   ```

5. Next empty cell:

   ```
   PM Compliance % := DIVIDE ( [PMs On Time], [PMs Due] )
   ```

6. Select that cell → Home → Format → **Percentage**.

   **You should see:** 79.5 %.
7. Next empty cell:

   ```
   Reactive Jobs := CALCULATE ( COUNTROWS ( WorkOrders ), WorkOrders[WO Type] = "Reactive" )
   ```

8. Next empty cell:

   ```
   Downtime Hrs := DIVIDE ( SUM ( WorkOrders[Downtime Mins] ), 60 )
   ```

   (If you'd rather type measures from Excel, use the Power Pivot tab → Measures → **New Measure**. Same formulas, without the `Name :=` part.)
9. Close the Power Pivot window. In Excel, Insert → PivotTable → **From Data Model** → New Worksheet → OK.
10. Drag `Assets[zone]` to *Rows*.
11. Drag `Calendar[Month]` to *Columns*.
12. Drag `PM Compliance %` to *Values*.

    **You should see:** a different % for every zone and month. If every zone shows the same figure, check the relationship in Diagram View.

### Why it works

A **measure** is a calculation that runs **in whatever context the pivot gives it**. Put Zone on rows and the same `PM Compliance %` formula calculates per zone. Add Month to columns and it calculates per zone per month. You write it once and it's right everywhere. Compare that with Week 5, where you needed a separate formula for every cut.

`CALCULATE` changes the filter, as in "count rows, *but only where* WO Type is PM". `DIVIDE` is safe division that returns blank instead of an error when there's nothing to divide by. These two functions are 50 % of real-world DAX. Phase 3 goes much deeper.

---

## Weekend build (2 h): PM Compliance Workbook

Keep building in `PM_Compliance.xlsx`. Everything must come from queries and the Data Model, with **no typed-in numbers.** You'll make four sheets: Dashboard, Overdue, Pareto and About.

### Dashboard

1. Add a sheet called `Dashboard`. View → untick **Gridlines**.
2. Insert → PivotTable → From Data Model. Put `PM Compliance %`, `PMs Due`, `Reactive Jobs` and `Downtime Hrs` in *Values*. These are your KPI cells.
3. Insert a second Data Model pivot with `Assets[zone]` in *Rows* and `PM Compliance %` in *Values*, then a bar PivotChart from it.
4. Insert a third with `Calendar[Month]` in *Rows* and `PM Compliance %` in *Values*, then a line PivotChart from it.
5. Click one of the pivots → PivotTable Analyze → Insert Slicer → tick *zone* and *criticality* (from `Assets`).
6. Insert Timeline → `Calendar[Date]`.
7. Right-click each slicer and the timeline → **Report Connections** → tick all three pivots.

   **You should see:** one click on a slicer changes the KPIs and both charts.

### Overdue

8. Data → Queries & Connections → right-click `WorkOrders` → **Reference**. A new query opens, built on top of `WorkOrders`.
9. Filter `WO Type` to `PM`.
10. Filter `Completed` to *null* only (untick everything else).
11. Filter `Status` to `Open`.
12. Click the drop-down on `Due` → Date Filters → **Before…**. Pick *Parameter* in the middle box (click the small `ABC`/`123` icon to switch) and choose `ReportDate` → OK.
13. Sort `Due` ascending, so the oldest is first.
14. Rename the query `Overdue`, then Close & Load to a new sheet. Rename the sheet `Overdue`.

    **You should see:** 17 PMs, oldest `WO-111320` (LD-FLK-013), due 27/05/2026.

### Pareto

15. Add a sheet called `Pareto`. Insert → PivotTable → From Data Model.
16. Rebuild the Week 6 Pareto: Asset in *Rows*, WO Type = Reactive as a filter, `Downtime Hrs` in *Values* twice, the second as % Running Total, sorted largest first, Top 10.
17. Make the combo chart from it, the same way as Week 6.
18. Connect the Dashboard timeline to this pivot too (right-click the timeline → Report Connections).

### About

19. Add a sheet called `About`. Write where the data comes from (the work order export folder) and how to refresh it (Data → Refresh All).
20. Write the definitions, starting with *on time = completed on or before the due date*.
21. **Show the report date.** Data → Get Data → From Other Sources → Blank Query. In the formula bar type `= ReportDate`, rename the query `Report Date`, then Close & Load it onto `About`.

### Polish

22. Use one colour for "bad" (overdue, low compliance) everywhere, give every chart a title that states the finding, and line up the slicers neatly.

### Phase 1 *done when* test

23. Move `WO_Export_2026-06.csv` **out** of the folder → **Refresh All**.

    **You should see:** the dashboard now ends at May.
24. Put it **back** → **Refresh All**.

    **You should see:** June reappears.
25. If every table and chart updated with **zero manual edits**, you've passed Phase 1. 🎉 Tick it off in the tracker app, then commit the workbook to your portfolio (see `portfolio/README.md`).

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

- **Must do (about 90 min at a PC):** This is the Phase 1 done-when, so none of it is skippable: Session 1 steps 1 to 13 (Calendar and relationships), the five Session 2 measures, weekend steps 1 to 21 (the Dashboard, Overdue, Pareto and About sheets) and steps 23 to 25 (move June out, Refresh All). It won't fit in 90 minutes, so spread it over several sittings across the holiday week.
- **On your phone (10 min a day):** Watch the MyOnlineTrainingHub Power Pivot tutorial and the SQLBI CALCULATE introduction, read both "Why it works" parts on the Data Model and measures, answer Check yourself questions 1 to 4 in your head, and draft the About sheet definitions on paper.
- **Safe to skip this week:** Only the polish can wait (weekend step 22): lining up the slicers, one consistent "bad" colour and finding-style chart titles. The four sheets and the done-when test cannot.

---

## Tick off

- [ ] Calendar table and relationships in the Data Model
- [ ] Five DAX measures working in a Data Model pivot
- [ ] PM Compliance Workbook: Dashboard, Overdue, Pareto and About sheets
- [ ] **Phase 1 done-when test passed** (ticked in the tracker)
