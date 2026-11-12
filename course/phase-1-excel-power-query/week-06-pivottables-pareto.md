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

1. **Combine three months, the old way.** Make a new workbook, `week06_pivots.xlsx`.
2. Open the April export (`WO_Export_2026-04.csv`), copy every row including the headers, and paste it into `A1` of your new workbook.
3. Open May's export, copy the rows **without** the header row, and paste them under April's.
4. Do the same for June.
5. Click in the data → `Ctrl+T` → name the Table `tblQ2`.

   **You should see:** 1,391 rows (`=ROWS(tblQ2)` in a spare cell).

   > Notice how tedious and error-prone that was. Next week Power Query does it in one click, forever. Hold on to that feeling.

6. Click in the Table → Insert → PivotTable → **New Worksheet** → OK.
7. Drag **Zone** to *Rows*.
8. Drag **WO Type** to *Columns*.
9. Drag **WO Number** to *Values*. Excel counts the work orders.

   **You should see:** Primary Packing has 38 Reactive jobs, and the grand total is 1,391.
10. **A second pivot.** Click back in `tblQ2` → Insert → PivotTable → New Worksheet.
11. Drag **Zone** to *Rows* and **Downtime Mins** to *Values* (it should say *Sum of*).
12. Drag **WO Type** to *Filters*, then pick *Reactive* in the filter drop-down above the pivot.
13. Right-click any value → Sort → **Largest to Smallest**.

    **You should see:** Flaking at the top with 2,349 minutes.
14. **Show values as a share.** Right-click a value → *Show Values As* → **% of Grand Total**.
15. Go back to the first pivot. Right-click a value → *Show Values As* → **% of Row Total**. Now each row shows what share of that zone's jobs were each type.
16. **Group by month.** Make a third pivot from `tblQ2` and drag **Raised** to *Rows*. Excel usually groups by month on its own. If it doesn't, right-click a date → Group → **Months** → OK.
17. Drag **Downtime Mins** to *Values* and **WO Type** to *Filters*, then pick *Reactive*.

    **You should see:** April 2,516, May 3,402, June 2,675 minutes.

### Why it works

A PivotTable is a **summary engine**: it scans every row and groups by whatever you put in Rows/Columns. It works on a *cache*, a copy of the data, so **when the source changes you must Refresh** (right-click → Refresh, or Data → Refresh All). Forgetting to refresh is the number one pivot mistake.

Values can be *Sum*, *Count*, *Average*, *Max* and so on (right-click → Summarize Values By). Count of WO Number counts rows. Sum of WO Number would be nonsense, but Excel won't stop you.

---

## Session 2 (1.5 h): Slicers, timelines and PivotCharts

### Do it

1. Click in any pivot → PivotTable Analyze → **Insert Slicer**.
2. Tick *Zone*, *Criticality* and *WO Type* → OK. Three slicer boxes appear.
3. Click in a pivot again → PivotTable Analyze → **Insert Timeline** → tick *Raised* → OK.
4. Drag the bar on the timeline to pick a single month.

   **You should see:** the pivot you inserted it from changes. The others don't yet.
5. **Connect the Zone slicer to every pivot.** Right-click the Zone slicer → **Report Connections** → tick every pivot → OK.
6. Do the same for the other two slicers and the timeline.

   **You should see:** one click on a slicer filters every pivot at once.
7. **PivotChart.** Click in your Zone/Downtime pivot → PivotTable Analyze → **PivotChart** → Bar → Clustered Bar → OK.
8. Format it with the Week 2 rules: a title that states the finding, no gridlines, data labels on, one highlight colour.
9. **Hide the field buttons.** Right-click a grey button on the chart → **Hide All Field Buttons on Chart**.
10. Add a sheet called `Dashboard`.
11. Cut and paste the slicers, the timeline and two charts onto `Dashboard`.
12. View → untick **Gridlines**. You've built your first interactive dashboard.

---

## Weekend build (2 h): Downtime Pareto, Q2 2026

A **Pareto** sorts causes from biggest to smallest and adds a cumulative % line. It shows the "vital few": usually a small number of assets cause most of the loss.

1. Click in `tblQ2` → Insert → PivotTable → New Worksheet.
2. Drag **Asset**, then **Asset Description**, to *Rows*.
3. PivotTable Design → Report Layout → **Show in Tabular Form**.
4. PivotTable Design → Report Layout → **Repeat All Item Labels**.
5. PivotTable Design → Subtotals → **Do Not Show Subtotals**.
6. Drag **WO Type** to *Filters* and pick *Reactive*.
7. Drag **Downtime Mins** to *Values* twice. You get two identical columns.
8. Right-click a value in the first Downtime column → Sort → **Largest to Smallest**.

   **You should see:** `LD-FLK-010`, Flaking roll 2, at the top with 575 minutes.
9. Right-click a value in the **second** Downtime column → Show Values As → **% Running Total In** → Base field: *Asset* → OK. That's your cumulative %.
10. **Top 10 only.** Click the drop-down on the Asset heading → Value Filters → **Top 10** → by *Sum of Downtime Mins* → OK.

    **You should see:** the cumulative % ends at about 39 % on the 10th row.
11. Click in the pivot → PivotTable Analyze → **PivotChart** → **Combo**.
12. Set the first Downtime series to *Clustered Column* and the second to *Line*, and tick **Secondary Axis** for the line → OK.
13. Right-click the right-hand axis → Format Axis → set Maximum to `1` (that's 100 %).
14. Give it a title that states the finding, then check it against the answers below.
15. **Read the chart.** The top 10 is only about 39 % of the downtime here, so the losses are spread out. Two flaking rolls lead, and flow wrappers show up twice.
16. **Ask the question that matters.** What would you investigate first, and why? Write three sentences. That's the habit of turning a chart into a decision.

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

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 17 (the 1,391-row `tblQ2`, count and sum pivots, Show Values As, dates grouped by month), Session 2 steps 1 to 6 (slicers and a timeline connected to every pivot), and the full weekend Pareto plus your three sentences. Week 8 reuses this Pareto, so build it properly.
- **On your phone (10 min a day):** Watch the Leila Gharani pivot tables video and the MyOnlineTrainingHub Pareto video, read the "Why it works" note on the pivot cache and Refresh, and answer Check yourself questions 1, 3 and 4 in your head. Once the Pareto is built, think through your three sentences on the bus.
- **Safe to skip this week:** Session 2 steps 7 to 12 (the formatted PivotChart and the `Dashboard` sheet) and the built-in Histogram Pareto chart can be skipped; the combo Pareto is the one you need.

---

## Tick off

- [ ] Count and sum pivots with Show Values As
- [ ] Dates grouped by month
- [ ] Slicers and a timeline connected to several pivots
- [ ] Top-10 downtime Pareto combo chart, matching the reference
- [ ] Three sentences on what you'd investigate
