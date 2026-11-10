# Week 28: Tableau 2, calculated fields, LOD expressions and table calculations

**Phase 4 · Production data: OEE, Redzone & Tableau** · Mon 10 May – Sun 16 May 2027 · about 5 hours

This is Tableau's "DAX week". You'll build OEE as a correct calculated field, learn **Level of Detail (LOD)** expressions (Tableau's answer to "calculate at a different grain"), and use **table calculations** for running totals, Paretos and moving averages.

**By Sunday you'll be able to:**

- write row-level and aggregate calculated fields, and know the difference
- calculate OEE, A, P and Q correctly at any level of the view
- use `{FIXED …}` LOD expressions to calculate per shift, then summarise
- use table calculations: running total, percent of total and moving average

---

## Session 1 (1.5 h): OEE as calculated fields

### Do it

Use `shifts.csv`. Analysis → **Create Calculated Field** for each of these:

```
// Availability
SUM([Run Min]) / SUM([Planned Production Min])

// Performance
SUM([Total Count]) / SUM([Run Min] * [Ideal Rate Ppm])

// Quality
SUM([Good Count]) / SUM([Total Count])

// OEE  (fully productive time ÷ planned time)
SUM([Good Count] / [Ideal Rate Ppm]) / SUM([Planned Production Min])
```

Format each one as a percentage (right-click → Default Properties → Number Format).

1. Put `OEE` on Text with no dimensions. You should see **70.3 %** (all data). Filter to H1 2026 and it should read **71.9 %**.
2. Drag `Shift` to Rows: Days 71.8 %, Nights 72.0 % (H1 2026). Then `SKU`, then `MONTH(Production Date)`: Jan 72.2 %, Feb 71.6 %, Mar 73.6 %, Apr 71.8 %, May 70.3 %, Jun 71.8 %.
3. Because every calculation aggregates **inside** (SUM … / SUM …), the answer is right at **any** level: total, month, shift, crew. That's exactly the Week 25 rule, built into the field.

### Why it works

- `[Ideal Rate Ppm] * [Run Min]` with no aggregate is **row-level**: it's calculated per shift row, then you `SUM` it.
- `SUM(...)/SUM(...)` is an **aggregate** calculation: it's calculated per mark in the view.
- You can't mix them unaggregated: `SUM([Good Count]) / [Planned Production Min]` gives *"cannot mix aggregate and non-aggregate"*. Tableau is protecting you from the averaging trap.

---

## Session 2 (1.5 h): LOD expressions

**Question:** *how many H1 2026 shifts had OEE below 60 %?* You need OEE **per shift**, and then a **count** of shifts. That's two levels of detail.

```
// Shift OEE: fixed at the shift level, whatever is in the view
{ FIXED [Shift Id] : SUM([Good Count] / [Ideal Rate Ppm]) / SUM([Planned Production Min]) }

// Low-OEE shift flag
IF { FIXED [Shift Id] : SUM([Good Count] / [Ideal Rate Ppm]) / SUM([Planned Production Min]) } < 0.6
THEN 1 ELSE 0 END
```

1. Put `SUM(Low-OEE shift flag)` on Text, filtered to H1 2026: **50 of 362 shifts** were below 60 %.
2. Create **bins** on the Shift OEE field (right-click → Create → Bins, size 0.1) and make a histogram. In H1 2026: 27 shifts below 50 %, 23 at 50–60 %, 59 at 60–70 %, 142 at 70–80 % and 111 above 80 %.
3. Drag `Shift` to Color. Are low shifts more often Nights? (They aren't, here.)

### The three LODs

| Expression | Calculates at | Typical use |
|---|---|---|
| `{FIXED [dim] : agg}` | exactly that dimension, ignoring the view (but not context filters) | per-shift or per-asset values, then count or bin them |
| `{INCLUDE [dim] : agg}` | the view's level **plus** that dimension | average of per-shift values by month |
| `{EXCLUDE [dim] : agg}` | the view's level **minus** that dimension | each zone vs the line total |

**Filter gotcha:** normal dimension filters are applied **after** `FIXED`. If your FIXED calculation ignores a filter you expected it to respect, right-click the filter → **Add to Context**. This is Tableau's order of operations, which is worth searching for and bookmarking.

---

## Weekend (2 h): Table calculations, a Pareto and a moving average

Using `redzone_downtime.csv`, filtered to H1 2026 and to reason category Mechanical or Electrical:

1. **Pareto by reason**: `Reason` on Columns (sorted by `SUM(Duration Min)` descending), `SUM(Duration Min)` on Rows as bars.
2. Drag `SUM(Duration Min)` onto Rows again. Right-click it → **Quick Table Calculation → Running Total**. Then **Edit Table Calculation** → tick *Add secondary calculation* → **Percent of Total**. That's your cumulative %.
3. Right-click the second pill → **Dual Axis**, set its mark to Line, then right-click the right axis → *Edit axis* → 0 to 1 (100 %).
4. **Moving average**: back on `shifts.csv`, plot `OEE` by **week** (continuous), then add a Quick Table Calculation **Moving Average** (edit: previous 3 values plus the current one). The weekly line is noisy, and the 4-week average shows the trend.
5. **"Compute using"**: change it from *Table (across)* to *Pane*, and see what happens with Shift on Color. Table calculations always depend on *what they compute along*. That's the source of most Tableau confusion, so practise it.

---

## Watch

- Tableau free training: *Calculations → Getting Started with Calculations*, *LOD Expressions* and *Table Calculations*.
- Search *"Tableau LOD expressions FIXED INCLUDE EXCLUDE explained"*.
- Search *"Tableau order of operations"*.

---

## Check yourself

1. Why does `AVG([OEE column])` give a different answer from the OEE calculated field?
2. Write a calculated field for **Speed loss (min)**.
3. When would you use `FIXED` instead of a table calculation?
4. Your running-total % restarts at 0 halfway along the chart. What's wrong?

<details>
<summary><strong>Answers</strong></summary>

1. AVG weights every shift equally, whatever its planned time. The calculated field sums minutes and counts first, so a shift's influence matches its size (Week 25).
2. `SUM([Run Min] - [Total Count] / [Ideal Rate Ppm])`. In H1 2026 that's **28,989 minutes**.
3. Use FIXED when you need a value at a specific grain that you'll then filter, count or bin (per-shift OEE, per-asset failures). It's computed in the data. Use a table calculation when the result depends on the **order or layout of the view**: running totals, rank, % of total and moving averages.
4. The table calculation's *Compute Using* partitions the data, for example by a dimension on Color or Rows. Change it to compute along the whole table, or along the dimension you intend.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1's four calculated fields (70.3 % all data, 71.9 % H1 2026) checked by shift and month, Session 2 steps 1 and 2 (the FIXED shift OEE, 50 of 362 shifts below 60 %, and the binned histogram), and weekend steps 1 to 4 for the dual-axis Pareto and the 4-week moving average.
- **On your phone (10 min a day):** Watch the Tableau training modules on calculations, LOD expressions and table calculations, read the three LODs table and the filter gotcha, look up "Tableau order of operations", and answer Check yourself in your head.
- **Safe to skip this week:** Session 2 step 3 (Shift on Color in the histogram) and weekend step 5 (the *Compute Using* experiment, though do read Check yourself question 4) can wait.

---

## Tick off

- [ ] A, P, Q and OEE calculated fields, correct at every level (71.9 % H1 2026)
- [ ] FIXED LOD for shift OEE; 50 shifts under 60 % found
- [ ] Bins and histogram of shift OEE
- [ ] Dual-axis Pareto with a running % of total
- [ ] Moving average, with *Compute Using* understood
