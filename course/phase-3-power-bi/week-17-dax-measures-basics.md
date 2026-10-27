# Week 17: DAX 1, measures vs calculated columns

**Phase 3 · Power BI** · Mon 22 Feb – Sun 28 Feb 2027 · about 5 hours

DAX (*Data Analysis Expressions*) is the formula language of Power BI. It looks like Excel, but it thinks in **tables and filters** rather than cells. This week you build the core KPI measures for the dashboard and learn the one distinction that matters most: **measure vs calculated column**.

**By Sunday you'll be able to:**

- create measures with `SUM`, `COUNTROWS`, `DISTINCTCOUNT`, `AVERAGE` and `DIVIDE`
- organise measures in a dedicated measures table, with formats
- explain when to use a calculated column instead
- use `VAR` / `RETURN` for readable measures

---

## Session 1 (1.5 h): Your first measures

### Do it

1. **Create a measures table**: Home → Enter Data → name it `_Measures`, then load it (it has one dummy column). Every measure goes here. After you add your first measure, you can hide the dummy column, and the table jumps to the top of the field list with a calculator icon.
2. Select `_Measures` → **New measure**, and type each of these. (`Shift+Enter` gives a new line in the formula bar.)

   ```dax
   Total WOs = COUNTROWS ( WorkOrders )

   Labour Hrs = SUM ( WorkOrders[Labour Hrs] )

   Reactive Jobs =
   CALCULATE ( COUNTROWS ( WorkOrders ), WorkOrders[WO Type] = "Reactive" )

   Reactive Labour Hrs =
   CALCULATE ( [Labour Hrs], WorkOrders[WO Type] = "Reactive" )

   Reactive Labour % = DIVIDE ( [Reactive Labour Hrs], [Labour Hrs] )

   Planned % (count) = 1 - DIVIDE ( [Reactive Jobs], [Total WOs] )

   Breakdown Hrs =
   CALCULATE ( SUM ( Downtime[Duration Hrs] ), Downtime[category] = "Breakdown" )

   Minor Stop Hrs =
   CALCULATE ( SUM ( Downtime[Duration Hrs] ), Downtime[category] = "Minor stop" )

   Assets With Breakdowns =
   CALCULATE ( DISTINCTCOUNT ( WorkOrders[asset_id] ), WorkOrders[WO Type] = "Reactive" )
   ```

   (Use whatever names you gave the columns in Week 16, e.g. `WorkOrders[WO Type]` or `WorkOrders[wo_type]`.)
3. **Format each one** (Measure tools ribbon): % for the percentages, 1 decimal for hours, and a thousands separator for counts.
4. Put them all on **Cards** and check them against the reference values below.

### Reference values (whole data set, no filters)

| Measure | Value |
|---|---|
| Total WOs | 11,902 |
| Labour Hrs | 9,654.9 |
| Reactive Jobs | 1,027 |
| Reactive Labour % | 24.5 % |
| Planned % (count) | 91.4 % |
| Breakdown Hrs | 1,321.4 |
| Minor Stop Hrs | 776.6 |
| Assets With Breakdowns | 260 |

Look at **Planned % (91 %)** next to **Reactive Labour % (25 %)**. By count, reactive work looks small. By hours, it's a quarter of the workload. Choose your KPI definitions deliberately, and write them down.

---

## Session 2 (1.5 h): Measures vs calculated columns, and VAR

### Do it

1. **Calculated column** (in the `Assets` table → New column):

   ```dax
   Asset Age Yrs = DATEDIFF ( Assets[install_date], DATE ( 2026, 6, 30 ), YEAR )
   ```

   And an age band:

   ```dax
   Age Band =
   SWITCH (
       TRUE (),
       Assets[Asset Age Yrs] < 2, "0-2 yrs",
       Assets[Asset Age Yrs] < 8, "2-8 yrs",
       "8+ yrs"
   )
   ```

2. Make a bar chart of `Reactive Jobs` by `Age Band`. Do old assets fail more? Be careful: the 8+ band holds about 200 of the 292 assets, so of course it has the most jobs. Compare **jobs per asset** instead (you'll build that measure this weekend). And remember that kit installed during the window hasn't been running for the full two years. Unfair comparisons like these are the most common analysis mistake.
3. **The same thing as a measure doesn't work.** Try making `Asset Age Yrs` a measure with the same formula and you'll get an error. A measure has no "current row" for `Assets[install_date]` to come from.
4. **VAR / RETURN** makes measures readable and efficient:

   ```dax
   MTTR Hrs =
   VAR BreakdownHours = [Breakdown Hrs]
   VAR Breakdowns =
       CALCULATE ( COUNTROWS ( Downtime ), Downtime[category] = "Breakdown" )
   RETURN
       DIVIDE ( BreakdownHours, Breakdowns )
   ```

   You should get **1.86 h** overall. Slice it by zone: Flaking has the longest repairs (3.88 h), and packing the shortest (1.17 h).

### Why it works

| | Calculated column | Measure |
|---|---|---|
| Calculated | at refresh, once per row | at query time, for each cell of a visual |
| Stored | yes (uses memory) | no |
| Has a "current row" | yes | no; it works over the filtered set of rows |
| Use for | slicing, filtering, grouping (age band, flags) | numbers you aggregate (totals, %, ratios) |

**Rule of thumb:** if it goes on an axis or in a slicer, it's a column (and better still done in Power Query). If it goes in *Values*, it's a measure.

`VAR` works like `LET` in Excel. Each variable is calculated once, and `RETURN` gives the result.

---

## Weekend task (2 h): KPI page, version 1

1. Add these measures:
   - `PMs Due = CALCULATE ( COUNTROWS ( WorkOrders ), WorkOrders[WO Type] = "PM" )`, which gives 10,502
   - `PMs On Time = CALCULATE ( COUNTROWS ( WorkOrders ), WorkOrders[PM Result] = "On time" )`, which gives 8,349
   - `PM Compliance % = DIVIDE ( [PMs On Time], [PMs Due] )`, which gives **79.5 %**
   - `Corrective Jobs`, `Avg Labour per Reactive Job`, and `Breakdowns per Asset = DIVIDE ( [Reactive Jobs], [Assets With Breakdowns] )`
2. Build a page with: a row of KPI cards across the top (PM Compliance %, Reactive Jobs, Breakdown Hrs, MTTR Hrs, Reactive Labour %), a bar chart of `PM Compliance %` by Zone, a column chart of `Breakdown Hrs` by `Calendar[Month]`, and slicers for Zone and Criticality.
3. Check: slice to **Primary Packing** and the compliance card should drop to **66.4 %** over all two years. (If you also filter the Calendar, it filters on *raised* date for now. Week 19 switches PM compliance to the due-date relationship properly.)

---

## Watch

- **SQLBI**: the free *Introducing DAX* video course. Register at [sqlbi.com/p/introducing-dax-video-course](https://www.sqlbi.com/p/introducing-dax-video-course/) and watch the first three modules this week.
- **Guy in a Cube**: *"Guy in a Cube measures vs calculated columns"*.
- Reference: [dax.guide](https://dax.guide) has every DAX function with examples. Bookmark it.

---

## Check yourself

1. Why does `Asset Age Yrs` work as a column but not as a measure?
2. Why use `DIVIDE(a, b)` instead of `a / b`?
3. You need to slice by "Has had a breakdown: Yes/No". Column or measure?
4. Your `PM Compliance %` card shows 79.5 %. You add a slicer on WO Type and pick *Reactive*. What happens, and why?

<details>
<summary><strong>Answers</strong></summary>

1. A column is evaluated on each row of `Assets`, so `Assets[install_date]` has a value. A measure is evaluated over a *set* of rows (for example, all assets in a zone), so there's no single install date. You'd need an aggregate like `MIN` or `AVERAGE`.
2. `DIVIDE` returns BLANK (or an alternate value you choose) when the denominator is 0 or blank, instead of an error. Cards and tables stay clean.
3. A **column** on `Assets` (because you slice by it). For example: `Had Breakdown = IF ( CALCULATE ( COUNTROWS ( WorkOrders ), WorkOrders[WO Type] = "Reactive" ) > 0, "Yes", "No" )`. Inside a calculated column, `CALCULATE` turns the current row into a filter. This is called *context transition*, and you'll see it next week.
4. It goes **blank**. The slicer leaves only Reactive rows, and there are no PMs among them, so `PMs Due` = 0 and `DIVIDE` returns blank. A measure always respects the filters around it, which is usually what you want.

</details>

---

## Tick off

- [ ] `_Measures` table with 12+ formatted measures, all matching the reference values
- [ ] Age Band calculated column plus a chart
- [ ] `MTTR Hrs` written with VAR/RETURN (1.86 h)
- [ ] KPI page v1 with cards, charts and slicers
- [ ] SQLBI *Introducing DAX*, modules 1–3
