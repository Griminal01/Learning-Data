# Glossary

Words the lessons use without stopping to explain. In the tracker, the first time one of these appears in a section it's underlined: tap it for the meaning.

Each line is `- **Term** (other forms, comma separated): meaning`. Terms match whole words, ignoring capitals, unless they're marked *(match case)*.

## Excel basics

- **Workbook** (workbooks): an Excel file (`.xlsx`). It can hold several sheets.
- **Worksheet** (worksheets, sheet tab, sheet tabs): one page of a workbook, the grid of rows and columns. Its tab is at the bottom of the window.
- **CSV** (CSV file, CSV files) *(match case)*: a plain-text file of values separated by commas. Excel opens it, but it can't keep formulas or formatting, so save a copy as `.xlsx`.
- **Cell reference** (cell references): the address of a cell, column letter then row number, like `B7`.
- **Range** (ranges): a block of cells, written first cell : last cell, like `A2:A125`.
- **Ribbon** (the ribbon): the strip of tabs and buttons across the top of Excel (Home, Insert, Data, View…).
- **Formula bar**: the long box above the column letters that shows what's really in the selected cell, formula and all.
- **Status bar**: the strip along the very bottom of the Excel window. Select some numbers and it shows their Sum, Average and Count.
- **Fill handle**: the small square at the bottom-right of a selected cell. Drag it, or double-click it, to copy a formula down.
- **Fill down** (filled down, fills down): copying a formula into the cells below, usually with the fill handle.
- **Freeze Panes** *(match case)*: View → Freeze Panes. Keeps the header row (or first columns) on screen while you scroll.
- **AutoFit** *(match case)*: makes a column exactly wide enough for what's in it. Double-clicking the edge of the column letter does the same.
- **Relative reference** (relative references): a reference like `A1` that shifts when you copy the formula. One row down, it becomes `A2`.
- **Absolute reference** (absolute references): a reference with `$` signs, like `$A$1`, that stays put when you copy the formula.
- **Mixed reference** (mixed references): half-locked, like `A$1` (row locked) or `$A1` (column locked).
- **Argument** (arguments): one of the values you give a function, between its brackets and separated by commas.
- **Criteria** (criterion): the condition a function like `SUMIFS` or `COUNTIFS` tests, like "Zone is Packing".
- **Helper column** (helper columns): an extra column you add to work something out in steps, so the main formula stays simple.
- **Pivot** (pivots): short for PivotTable.
- **PivotTable** (PivotTables, pivot table, pivot tables): a summary table you build by dragging fields. Excel does the grouping and adding up for you.
- **Slicer** (slicers): a panel of buttons that filters a PivotTable (or several) with one click.
- **Conditional formatting**: colours or icons that change with a cell's value, like turning overdue dates red.
- **Data validation**: a rule on a cell that limits what can be typed in it, often a drop-down list.

## Tables and lookups

- **Table** (Tables) *(match case)*: a range turned into an Excel Table with Ctrl+T. It has a name, grows when you add rows, and fills formulas down by itself.
- **Structured reference** (structured references): a reference to a Table by name instead of by cell address, like `tblWO[Labour Hrs]`.
- **Calculated column** (calculated columns): a Table column with one formula that Excel fills down the whole column.
- **Lookup** (lookups, look up): finding a value in another table by matching a key, like an asset's zone from its ID.
- **Dynamic array** (dynamic arrays): a formula that returns many values at once. They spill into the cells below.
- **Spill** (spills, spilled, spill range): the cells a dynamic array formula fills. `A2#` means "the whole spill".
- **Named range** (named ranges): a name you give to a cell or range so a formula can say `Target` instead of `$H$1`.

## Power Query and Power Pivot

- **Power Query** *(match case)*: Excel's tool for importing and cleaning data in recorded steps. Refresh re-runs every step on new data.
- **Query** (queries): a saved set of steps that fetches and shapes data (in Power Query), or a question asked of a database (in SQL).
- **Applied Steps** *(match case)*: the list of steps on the right of the Power Query editor. Each one is a change to the data, in order.
- **Unpivot** (unpivoting, unpivoted): turning columns into rows, for example one column per week into a Week column and a Value column.
- **Append** (appends, appended): stacking tables with the same columns on top of each other.
- **Merge** (merges, merged): joining two tables side by side by matching a key, like a lookup.
- **Refresh All** *(match case)*: Data → Refresh All. Re-runs every query and updates every PivotTable from it.
- **Data Model** (data model): the store inside a workbook where Power Pivot keeps tables and the relationships between them.
- **Relationship** (relationships): a link between two tables on a key, so a pivot can use columns from both.
- **DAX** *(match case)*: the formula language of Power Pivot and Power BI. A DAX *measure* is a named calculation, like `Total Downtime := SUM(...)`, that works out its answer for each cell of a pivot or visual.

## Data and maintenance words

- **Grain**: what one row of a table stands for, such as one work order, or one asset per day.
- **Primary key** (primary keys): the column that is unique for every row of a table.
- **Foreign key** (foreign keys): a column that points to another table's primary key, like `asset_id` in work orders.
- **CMMS** *(match case)*: the maintenance management system that holds assets, PMs and work orders (Mainsaver, moving to Ultimo).
- **PM** (PMs) *(match case)*: planned (preventive) maintenance, a task done on a schedule before anything fails.
- **PM compliance**: the share of PMs that were done on time.
- **Work order** (work orders, WO, WOs): a job raised in the CMMS: a PM, a breakdown repair or a planned repair.
- **Reactive** (reactive work): unplanned work after a breakdown.
- **Criticality**: how much an asset matters to the line, graded A (stops the line) to C.
- **Downtime**: time the line or a machine isn't running when it should be.
- **Minor stop** (minor stops): a short stop, usually a few minutes, like a jam or a sensor misread.
- **Pareto** (Pareto chart): a bar chart sorted from biggest to smallest, with a running-total line. It shows the few causes behind most of the loss.
- **MTBF** *(match case)*: mean time between failures: running time divided by the number of failures.
- **MTTR** *(match case)*: mean time to repair: total repair time divided by the number of repairs.
- **OEE** *(match case)*: overall equipment effectiveness: availability × performance × quality.
