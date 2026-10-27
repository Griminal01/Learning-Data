# Week 18: DAX 2, CALCULATE and filter context

**Phase 3 · Power BI** · Mon 1 Mar – Sun 7 Mar 2027 · about 5 hours

This is the week DAX "clicks", or the week people give up. Take it slowly. Everything in DAX comes back to one idea: **every number is calculated inside a filter context**, and `CALCULATE` is how you change that context.

**By Sunday you'll be able to:**

- explain filter context and row context in your own words
- use `CALCULATE` with filters, `ALL`/`REMOVEFILTERS` and `KEEPFILTERS`
- calculate % of total and "zone vs line" comparisons
- use `FILTER` and iterators (`SUMX`, `AVERAGEX`) where you need row-by-row logic
- build an **MTBF** measure that respects the selected time period

---

## Session 1 (1.5 h): Filter context, by experiment

### Do it

1. Make a **Matrix**: Zones[Zone] on rows, `[Breakdown Hrs]` in values.
2. Each cell shows a different number from the same measure. Ask yourself: *what filters are active in this cell?* For the Primary Packing row, it's `Zones[Zone] = "Primary Packing"`, plus anything from slicers. That set of filters is the **filter context**.
3. Now add a measure that **ignores** the zone filter:

   ```dax
   Breakdown Hrs (All Zones) =
   CALCULATE ( [Breakdown Hrs], REMOVEFILTERS ( Zones ) )
   ```

   It shows **1,321.4** on every row.
4. **% of line**:

   ```dax
   Breakdown % of Line = DIVIDE ( [Breakdown Hrs], [Breakdown Hrs (All Zones)] )
   ```

   You should see Flaking **21.4 %**, Primary Packing **17.1 %**, Drying 13.4 %…
5. Add a Criticality slicer and pick **A**. The % still adds up to 100 %, because `REMOVEFILTERS ( Zones )` only removes the zone filter; the criticality filter stays. Change it to `REMOVEFILTERS ( Zones, Assets )` and see what happens. Then change it back.

### Why it works

`CALCULATE ( expression, filter1, filter2, … )` does three things:

1. takes the current filter context (rows, columns, slicers)
2. **modifies** it with the filter arguments: adding, replacing or removing filters
3. evaluates the expression in that new context

A filter like `Downtime[category] = "Breakdown"` **replaces** any existing filter on that column. `REMOVEFILTERS ( Zones )` clears filters on the Zones table. `KEEPFILTERS ( … )` adds to the existing filter instead of replacing it. You'll need it less often, but know that it exists.

---

## Session 2 (1.5 h): Iterators, FILTER and MTBF

### Iterators

`SUM ( column )` adds up a column. **`SUMX ( table, expression )`** walks a table row by row, evaluates the expression on each row, and adds up the results. Use X functions when you need maths *per row* before aggregating.

```dax
Downtime Cost £ =
SUMX (
    FILTER ( Downtime, Downtime[category] = "Breakdown" ),
    Downtime[Duration Hrs] * 2500          -- assume £2,500 per hour of lost production
)
```

(That gives £3.3m over two years. Find out what your site's real cost per hour is; it's a powerful number in meetings.)

### Counting with a measure condition

"How many assets had more than 5 breakdowns?" You can't put a measure in a slicer, so iterate over assets:

```dax
Assets > 5 Breakdowns =
COUNTROWS (
    FILTER ( Assets, [Reactive Jobs] > 5 )
)
```

That gives **39** (and 15 with more than 10). `FILTER` walks every asset, and for each one `[Reactive Jobs]` is evaluated **for that asset only**. That's *context transition*: a measure called inside a row context automatically filters to the current row.

### MTBF that respects the date filter

```dax
Period Hours =
VAR FirstDay = MIN ( Calendar[Date] )
VAR LastDay  = MIN ( MAX ( Calendar[Date] ), DATE ( 2026, 6, 30 ) )   -- data ends 30 Jun 2026
RETURN
    ( LastDay - FirstDay + 1 ) * 24

Asset Count = COUNTROWS ( Assets )

MTBF Hrs (per asset) =
DIVIDE ( [Period Hours] * [Asset Count], [Reactive Jobs] )
```

With no filters, that's about **4,981 h** per asset. Slice by zone and Primary Packing drops to about **2,580 h**. Pick H1 2026 on the Calendar and the whole line is about 5,375 h.

> **Why "per asset"?** "Line MTBF" can mean several things. Here it's *operating hours × number of assets ÷ failures*, which is the average asset's MTBF. Write the definition on the report's About page. Unlabelled reliability KPIs cause arguments.

---

## Weekend task (2 h): Comparison measures

Build these and put them in a matrix by Zone:

1. `Reactive Jobs (Line)`: ignores the zone filter.
2. `Reactive Jobs vs Line Avg`: the zone's jobs ÷ (line jobs ÷ 7).
3. `PM Compliance % (Line)` and `PM Compliance Gap = [PM Compliance %] - [PM Compliance % (Line)]`. Use conditional formatting (red/green) on the gap.
4. `Top Asset by Downtime`: the name of the worst asset in the current context:

   ```dax
   Top Asset by Downtime =
   VAR t = TOPN ( 1, VALUES ( Assets[Asset] ), [Breakdown Hrs], DESC )
   RETURN CONCATENATEX ( t, Assets[Asset], ", " )
   ```

5. `Repeat Asset Count`: assets with 2 or more breakdowns in the selected period (`FILTER` + `COUNTROWS`).

Put the matrix on a page with a Calendar slicer and test it on several periods.

---

## Watch

- **SQLBI**: *Introducing DAX*, the modules on CALCULATE and filter context. Watch them twice; it's normal.
- **SQLBI article**: search *"SQLBI filter context in DAX"*.
- **Guy in a Cube**: *"Guy in a Cube CALCULATE explained"*.
- Book (when you're ready): *The Definitive Guide to DAX* by Russo & Ferrari. It's the bible, but heavy; dip in, don't read it cover to cover.

---

## Check yourself

1. In your own words, what is filter context?
2. What's the difference between `CALCULATE ( [x], Assets[criticality] = "A" )` and `CALCULATE ( [x], KEEPFILTERS ( Assets[criticality] = "A" ) )` when the user has picked criticality **B** in a slicer?
3. Why does `Assets > 5 Breakdowns` need `FILTER ( Assets, … )` and not just `[Reactive Jobs] > 5`?
4. When should you use `SUMX` instead of `SUM`?

<details>
<summary><strong>Answers</strong></summary>

1. The set of filters active when a measure is calculated: from rows and columns of the visual, slicers, other visuals' cross-filtering, and page and report filters. The same measure gives different answers in different cells because each cell has a different filter context.
2. The plain version **replaces** the slicer's B with A, so it shows A's numbers regardless. The KEEPFILTERS version **intersects** B and A, which is empty, so the result is blank.
3. `[Reactive Jobs] > 5` on its own is a single TRUE/FALSE for the whole current context. You need to test each asset separately, so you iterate over the Assets table, and context transition evaluates the measure per asset.
4. When the calculation needs a per-row step first: price × quantity, duration × cost rate, or anything where you'd otherwise need a calculated column just to add it up.

</details>

---

## Tick off

- [ ] `% of Line` measures with REMOVEFILTERS
- [ ] Understand why filters on one column replace and others stay
- [ ] `SUMX` cost measure and `FILTER`-based count (39 assets)
- [ ] MTBF measure that responds to Calendar and Zone
- [ ] Comparison matrix with conditional formatting
