# Week 6: PivotTables, PivotCharts, slicers and a downtime Pareto

**Phase 1 · Advanced Excel & Power Query** · Mon 7 Dec – Sun 13 Dec 2026 · about 5 hours

A PivotTable answers "how much, by what" in seconds: labour by zone, downtime by asset, jobs by month. You drag fields instead of writing formulas. This week you'll build the core of a maintenance review pack: a **downtime Pareto**, which is the chart every reliability meeting starts with.

**By Sunday you'll be able to:**

- build PivotTables with rows, columns, values and filters
- group dates by month or quarter, and show values as % of total or running total
- add slicers and timelines that control several pivots at once
- build a proper Pareto chart (bars plus a cumulative % line)

**Files:** the three Q2 2026 exports `WO_Export_2026-04.csv`, `-05.csv` and `-06.csv`.

---

## Session 1 (1.5 h): Your first PivotTables

### Do it

1. **Combine three months, the old way.** Open the April export, copy all the rows into a new workbook `week06_pivots.xlsx`, then paste May's and June's rows underneath, **without** their header rows. Make it a Table `tblQ2`. You should have **1,391 rows**.

   > Notice how tedious and error-prone that was. Next week Power Query does it in one click, forever. Hold on to that feeling.

2. Click in the Table → Insert → PivotTable → New Worksheet.
3. Drag **Zone** to *Rows*, **WO Type** to *Columns*, and **WO Number** to *Values*. Excel counts the work orders. Check: Primary Packing has **38 reactive** jobs, and the grand total is **1,391**.
4. Make a second pivot: **Zone** in *Rows*, **Downtime Mins** in *Values* (Sum), with a filter on **WO Type** = Reactive. Sort largest to smallest (right-click a value → Sort).
5. **Show values as**: right-click a value → *Show Values As* → *% of Grand Total*. Then try *% of Row Total* on the first pivot: what percentage of each zone's jobs were reactive?
6. **Group dates**: in a new pivot, drag **Raised** to *Rows*. Excel usually groups by month automatically. If it doesn't, right-click a date → Group → Months. Add Downtime Mins and filter to Reactive. Totals: April **2,516**, May **3,402**, June **2,675** minutes.

### Why it works

A PivotTable is a **summary engine**: it scans every row and groups by whatever you put in Rows/Columns. It works on a *cache*, a copy of the data, so **when the source changes you must Refresh** (right-click → Refresh, or Data → Refresh All). Forgetting to refresh is the number one pivot mistake.

Values can be *Sum*, *Count*, *Average*, *Max* and so on (right-click → Summarize Values By). Count of WO Number counts rows. Sum of WO Number would be nonsense, but Excel won't stop you.

---

## Session 2 (1.5 h): Slicers, timelines and PivotCharts

### Do it

1. Click in any pivot → PivotTable Analyze → **Insert Slicer** → tick *Zone*, *Criticality* and *WO Type*.
2. **Insert Timeline** → *Raised*. Drag the timeline to pick a single month.
3. **Connect one slicer to all pivots**: right-click the Zone slicer → *Report Connections* → tick every pivot. Now one click filters the lot.
4. **PivotChart**: click your Zone/Downtime pivot → PivotTable Analyze → PivotChart → Clustered Bar. Apply the Week 2 formatting rules: a title that states the finding, no gridlines, data labels, and one highlight colour.
5. **Field buttons**: right-click a button on the chart → *Hide All Field Buttons* for a clean look.
6. Put the slicers, timeline and two charts on one sheet called `Dashboard`. Set View → untick Gridlines. You've built your first interactive dashboard.

---

## Weekend build (2 h): Downtime Pareto, Q2 2026

A **Pareto** sorts causes from biggest to smallest and adds a cumulative % line. It shows the "vital few": usually a small number of assets cause most of the loss.

1. New pivot: **Asset** and **Asset Description** in *Rows* (PivotTable Design → Report Layout → *Show in Tabular Form*, and *Repeat All Item Labels*). Set **WO Type** = Reactive as a filter. Put **Downtime Mins** in *Values* twice.
2. Sort by Downtime Mins, largest first.
3. On the second Downtime Mins: right-click → Show Values As → **% Running Total In** → Asset. That's your cumulative %.
4. Filter to the top 10: click the Rows drop-down → Value Filters → **Top 10** → by Sum of Downtime Mins.
5. Insert a **Combo chart** from the pivot: Change Chart Type → Combo → Downtime = Clustered Column, Cumulative % = Line on the **secondary axis**. Set the secondary axis maximum to 1 (100 %).
6. Title it with the finding. Check it against the answers below.

**Then ask the question that matters:** the top 10 is only about 39 % of the downtime here, so the losses are spread out. Two flaking rolls lead, and flow wrappers show up twice. What would you investigate first, and why? Write three sentences. That's the habit of turning a chart into a decision.

> Also try Insert → Chart → **Histogram → Pareto** on a plain (non-pivot) two-column table of asset and downtime. Excel 365 has a built-in Pareto chart type. It's quick but less flexible than the combo version.

---

## Watch

- **Leila Gharani**: *"Leila Gharani pivot tables beginners"*.
- **Excel Campus**: *"Excel Campus slicers multiple pivot tables"*.
- **MyOnlineTrainingHub**: *"MyOnlineTrainingHub Pareto chart pivot table"*.

---

## Check yourself

1. You add 50 new rows to `tblQ2` but the pivot doesn't change. Why?
2. How would you show reactive **labour hours** by technician, for Primary Packing only?
3. What's the difference between *% of Grand Total* and *% Running Total In*?
4. Why does a Pareto use a secondary axis?
5. In Q2, which failure code caused the most reactive downtime minutes?

<details>
<summary><strong>Answers</strong></summary>

1. Pivots don't update live. Right-click → **Refresh**. Because the source is a Table, the new rows are included once you refresh. With a fixed range they wouldn't be, even after a refresh.
2. Technician in *Rows*, Labour Hrs in *Values* (Sum), and filters (or slicers) of WO Type = Reactive and Zone = Primary Packing.
3. % of Grand Total is each item's share of the total. % Running Total is the cumulative share as you go down the sorted list, which is what makes the Pareto line.
4. The bars are minutes (hundreds) and the line is a percentage (0–100 %). On one axis the line would be flat along the bottom.
5. **Mechanical - bearing**, 2,328 minutes, more than double the next one (*Electrical - sensor*, 1,095).

**Pareto reference (Q2 2026, reactive downtime, 8,593 min total):**

| # | Asset | Description | Mins | Cum % |
|---|---|---|---|---|
| 1 | LD-FLK-010 | Flaking roll 2 | 575 | 6.7 % |
| 2 | LD-FLK-018 | Flaking roll 10 | 513 | 12.7 % |
| 3 | LD-PPK-030 | Primary Packing Servo drive 3 | 402 | 17.3 % |
| 4 | LD-PPK-003 | Primary Packing Flow wrapper 3 | 322 | 21.1 % |
| 5 | LD-PPK-002 | Primary Packing Flow wrapper 2 | 280 | 24.3 % |
| 6 | LD-EOL-008 | End of Line Label printer applicator 1 | 271 | 27.5 % |
| 7 | LD-FLK-006 | Flaking Drive motor 6 | 269 | 30.6 % |
| 8 | LD-EOL-028 | End of Line Drive motor 4 | 261 | 33.7 % |
| 9 | LD-EOL-016 | End of Line Conveyor 6 | 253 | 36.6 % |
| 10 | LD-EOL-002 | End of Line Case packer 2 | 242 | 39.4 % |

Note that Pareto by **asset** gives a flat picture here, but Pareto by **failure code** is much sharper: bearings alone are 27 %. Always try more than one cut.

</details>

---

## Tick off

- [ ] Count and sum pivots with Show Values As
- [ ] Dates grouped by month
- [ ] Slicers and a timeline connected to several pivots
- [ ] Top-10 downtime Pareto combo chart, matching the reference
- [ ] Three sentences on what you'd investigate
