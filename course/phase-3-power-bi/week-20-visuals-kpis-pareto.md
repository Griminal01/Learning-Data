# Week 20: Visuals, KPI cards, Pareto and matrix formatting

**Phase 3 · Power BI** · Mon 15 Mar – Sun 21 Mar 2027 · about 5 hours

You have the numbers. Now make them **readable in five seconds**. A maintenance review has about 30 seconds per page before people start talking. This week is about choosing the right visual for each question and formatting it so the answer jumps out.

**By Sunday you'll be able to:**

- pick the right chart for the question (the table below)
- build KPI cards with targets and trends
- build a DAX-driven Pareto chart
- use conditional formatting (backgrounds, icons, data bars) in matrices
- use the decomposition tree to explore causes

---

## Session 1 (1.5 h): Choosing and formatting visuals

### Which visual?

| Question | Visual |
|---|---|
| What's the number right now? | Card, with a target and a trend |
| How do zones compare? | Bar chart (horizontal, sorted) |
| How is it changing over time? | Line chart (continuous) or column chart (monthly totals) |
| What causes most of the loss? | Pareto (sorted columns + cumulative line) |
| Detail by two dimensions | Matrix with conditional formatting |
| Part of a whole with 2–4 parts | 100 % stacked bar (avoid pies with more than 3 slices) |
| Why is this number high? | Decomposition tree |

### Do it

1. **KPI cards**: use the new **Card** visual (Insert → Card). Put `PM Compliance % (Due)` in it, then add `Target Compliance` as a reference label. Do the same for `Breakdown Hrs YTD` vs `Breakdown Hrs PY YTD`.
2. **Zone bar chart**: `PM Compliance % (Due)` by Zone, sorted ascending so the worst is at the top. Use the `Compliance Colour` measure from last week for the bar colours. Add a constant line at 90 %.
3. **Remove clutter on every visual**: no gridlines unless you need them, axis titles off where the title explains it, and data labels on when there are fewer than ~12 bars.
4. **Titles state findings.** Use *"Packing is 15 points below line compliance"*, not *"PM Compliance by Zone"*. You can make dynamic titles with a measure:

   ```dax
   Title Compliance =
   VAR worst = TOPN ( 1, VALUES ( Zones[Zone] ), [PM Compliance % (Due)], ASC )
   RETURN "Lowest PM compliance: " & CONCATENATEX ( worst, Zones[Zone] ) &
          " (" & FORMAT ( MINX ( worst, [PM Compliance % (Due)] ), "0%" ) & ")"
   ```

   Visual → Format → Title → *fx* → Field value → `Title Compliance`.

---

## Session 2 (1.5 h): A DAX Pareto

### Do it

```dax
Breakdown Hrs Cumulative % =
VAR CurrentHrs = [Breakdown Hrs]
VAR AllAssets =
    ADDCOLUMNS ( ALLSELECTED ( Assets[Asset] ), "@hrs", [Breakdown Hrs] )
VAR Cumulative =
    SUMX ( FILTER ( AllAssets, [@hrs] >= CurrentHrs ), [@hrs] )
VAR Total = SUMX ( AllAssets, [@hrs] )
RETURN
    DIVIDE ( Cumulative, Total )
```

1. Insert a **Line and clustered column chart**. X-axis = `Assets[Asset]`, column = `[Breakdown Hrs]`, line = `[Breakdown Hrs Cumulative %]`.
2. Sort by Breakdown Hrs, descending.
3. Use the Filters pane on the visual: `Assets[Asset]` → *Top N* → 15 by `Breakdown Hrs`.
4. Set the secondary axis to 0–100 %.
5. Slice to **Q2 2026** with a Calendar slicer and check it against your Week 6 Excel Pareto: LD-FLK-010 first (9.6 h ≈ 575 min), LD-FLK-018 second.

### Why it works

For each asset on the axis, the measure builds a little table of every asset **visible in the current selection** (`ALLSELECTED`) with its hours. It then adds up the hours of all assets with **at least as many** hours as this one. That's the running total down the sorted list. `ALLSELECTED` (rather than `ALL`) means slicers still apply, so the Pareto respects the chosen period and zone.

(Ties share a cumulative value. That's fine for a Pareto.)

---

## Weekend task (2 h): Matrix and decomposition tree

1. **Heat-map matrix**: rows = Zone, columns = `Calendar[Month Name]` (filtered to 2026), values = `PM Compliance % (Due)`. Format → Cell elements → **Background colour** → *Gradient*, red (low) to green (high). It shows instantly which zone and month went wrong.
2. **Icons**: add `Breakdown Hrs YoY %` to a table by zone with icon rules: ▲ red if > 0 (more breakdowns), ▼ green if < 0.
3. **Data bars** on `Reactive Jobs` in a top-20 assets table.
4. **Decomposition tree** (Insert → Decomposition tree): Analyze = `Breakdown Hrs`, Explain by = Zone, Asset Type, Failure Code, Criticality, Asset. Click through: **Flaking → Flaking roll → Mechanical - roll wear / bearing**. Use the "high value" AI split (the lightbulb) to let Power BI pick the next split.
5. **Small multiples**: a line chart of monthly `Reactive Jobs` with Zone in *Small multiples*. Seven mini charts on one shared scale.

---

## Watch

- **Guy in a Cube**: *"Guy in a Cube Power BI conditional formatting"*.
- **How to Power BI (Basim)**: *"How to Power BI Pareto chart DAX"*.
- **Storytelling with Data**: revisit the declutter idea from Week 2. Book (strongly recommended, short): *Storytelling with Data* by Cole Nussbaumer Knaflic.

---

## Check yourself

1. Why sort the compliance bar chart *ascending*?
2. Why use `ALLSELECTED` and not `ALL` in the Pareto measure?
3. When is a pie chart acceptable?
4. Your heat-map has a white cell for Forming in March. What does that mean, and how should it look?

<details>
<summary><strong>Answers</strong></summary>

1. The question is "where's the problem?", so the worst zone should be the first thing the eye lands on (at the top).
2. `ALL` ignores slicers, so the cumulative % would be calculated over all time and all zones while the bars show only the selection. `ALLSELECTED` keeps the user's slicer choices but ignores the asset on the current axis position.
3. Rarely: 2–3 parts of one whole, where the exact values don't matter, like "Planned vs Reactive". A bar is almost always easier to read.
4. The measure returned blank, so there were no PMs due (or a filter excludes them). Show it as a grey "–" or make the formatting treat blanks as neutral, so a blank isn't mistaken for "good" or "bad".

</details>

---

## Tick off

- [ ] KPI cards with targets
- [ ] Sorted zone bar chart with a dynamic finding-style title
- [ ] DAX Pareto matching the Excel and SQL Q2 results
- [ ] Heat-map matrix and icon formatting
- [ ] Explored a decomposition tree down to failure code
