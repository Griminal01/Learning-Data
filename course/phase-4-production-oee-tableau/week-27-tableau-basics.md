# Week 27: Tableau 1, getting started with Tableau Public

**Phase 4 · Production data: OEE, Redzone & Tableau** · Mon 3 May – Sun 9 May 2027 · about 5 hours

Your production data lives in Tableau, so you need to be fluent in it, at least as a power user who can read, filter, download and rebuild views. You've already done Power BI, and the ideas transfer: a data model, measures, visuals, filters. Tableau's vocabulary and drag-and-drop logic are different, though. This week covers the basics.

**By Sunday you'll be able to:**

- install Tableau Public and connect to CSV files
- explain dimensions vs measures, and discrete (blue) vs continuous (green) fields
- build bar, line and table views with the Marks card
- use filters, sorting and *Show Me*

**Install:** **Tableau Public** (free) from [public.tableau.com](https://public.tableau.com), then *Create → Download the app*. Its one limitation: you can only **save workbooks to your public Tableau Public profile**, not to your PC. That's fine for this course's synthetic data, but **never open work data in Tableau Public.**

> **Tableau for Students:** if your HNC college counts as an accredited institution, you may qualify for a free Tableau Desktop licence, which saves locally. Search *"Tableau for Students"* and check eligibility.

---

## Session 1 (1.5 h): Connect and first views

### Do it

1. Open Tableau Public → **Connect → Text file** → `data/production/shifts.csv`.
2. On the **Data Source** page, check the field types: `production_date` should be a **date** (calendar icon), and the counts should be **numbers** (#). Fix any that aren't by clicking the icon.
3. Click **Sheet 1** at the bottom. Look at the Data pane: fields above the line are **dimensions** (things you slice by: shift, crew, SKU, date), and fields below are **measures** (things you add up: counts, minutes).
4. **First view**: drag `SKU` to **Rows**, and `Good Count` to **Columns**. Tableau sums it automatically (`SUM(Good Count)`). Click the sort icon on the axis.
5. **Over time.** Click the New Worksheet tab. Drag `Production Date` to **Columns**.

   **You should see:** the pill reads `YEAR(Production Date)`.
6. Click the `+` on the pill to drill down to quarter, then click the new `+` to get month.
7. Drag `Downtime Min` to **Rows**.

   **You should see:** a line chart of downtime by month.
8. Right-click the date pill and switch between **Month (discrete, blue)** and **Month (continuous, green)**. Watch the axis change from separate headers to a continuous timeline.

### Why it works

| | Blue (discrete) | Green (continuous) |
|---|---|---|
| Creates | headers / labels | an axis |
| Typical | categories, date *parts* (May) | numbers, date *values* (May 2026) |

**Every pill on Rows or Columns is aggregated** unless it's a dimension. Tableau decides "SUM of what, grouped by what" from what's on the shelves, much like a PivotTable. That's where the aggregation trap from Week 25 bites: putting a pre-calculated OEE % column on a shelf gives `SUM(OEE)` or `AVG(OEE)`, both wrong. Next week you'll build OEE as a proper calculated field.

---

## Session 2 (1.5 h): The Marks card, filters and Show Me

### Do it

1. **Marks card**: on the downtime-by-month line, drag `Shift` to **Color**. Now you have two lines, Days vs Nights. Drag `SUM(Downtime Min)` to **Label**.
2. **Bar chart by crew and SKU**: `Crew` on Columns, `SKU` on Color, `Downtime Min` on Rows. Then try `SKU` on Columns too (nested headers).
3. **Filters**: drag `Production Date` to the **Filters** shelf → *Range of dates* → 1 Jan – 30 Jun 2026. Right-click the filter → **Show Filter**, and a slider appears for the user.
4. **Show Me** (top right): select `Production Date` and `Good Count`, then click different chart types to see what Tableau suggests and which fields each needs.
5. **Connect the downtime log too**: Data → New Data Source → `redzone_downtime.csv`. Build a horizontal bar of `SUM(Duration Min)` by `Reason Category`, sorted, filtered to H1 2026. Check it against Week 26: Mechanical **11,358**, Operational **11,050**.
6. **Save** to your Tableau Public profile as *Line D OEE Practice*. You can hide it from your public profile in its settings if you'd rather.

---

## Weekend (2 h)

1. Do Tableau's free **official training videos**: search *"Tableau free training videos getting started"* and work through *Getting Started*, *Connecting to Data* and *Visual Analytics → Filtering and Sorting*.
2. Rebuild **three** of your Power BI visuals from Phase 3 in Tableau, using `shifts.csv` and `redzone_downtime.csv`: a KPI-style big number, a bar chart sorted worst-first, and a monthly trend. Write down three things that are easier in Tableau and three that are easier in Power BI.
3. **At work (view only):** open one Redzone dashboard and, for each chart, write down which fields are on Rows, Columns, Color and Filters. You'll start "reading" dashboards as structures, not pictures.

---

## Watch

- **Tableau's official free training** (above). It's short and good.
- **Andy Kriebel** (YouTube): *"Andy Kriebel Tableau tip"*. Hundreds of short, practical tips.
- **Tableau Tim** (YouTube): *"Tableau Tim beginner tutorial"*.

---

## Check yourself

1. What's the difference between a blue `MONTH(Date)` and a green `MONTH(Date)` pill?
2. Why must you never open work data in Tableau Public?
3. You drag a pre-calculated `OEE` column onto Rows and Tableau shows `SUM(OEE)` = 1,025. What's happened?
4. In Power BI terms, what's the closest equivalent of a Tableau measure on Rows?

<details>
<summary><strong>Answers</strong></summary>

1. Blue is discrete. It treats each month as a separate header and groups by month name (or month-year, depending on the option). Green is continuous. It plots dates on a timeline axis.
2. Tableau Public saves everything to a **public** website. Anything you save is published and searchable. Use it only for synthetic or public data.
3. Tableau summed the per-shift OEE fractions across about 1,460 shifts. That's meaningless. OEE has to be calculated from summed minutes and counts (next week).
4. An implicit measure, such as dragging a numeric column into Values (Sum). The DAX equivalent of a deliberate calculation is a Tableau **calculated field** with an aggregate inside it, like `SUM([Good Count]) / SUM([...])`.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 8 (connect `shifts.csv` with correct types, first bar and line, blue against green dates), Session 2 steps 1, 3, 5 and 6 (Color and Label, a filter shown to the user, the reason category bar matching Week 26, saved to your profile), and weekend step 2, three Phase 3 visuals rebuilt with your notes.
- **On your phone (10 min a day):** Watch Tableau's free *Getting Started* training videos and a few Andy Kriebel tips, read the blue versus green table in "Why it works", and answer Check yourself in your head. At work, view one Redzone dashboard and note what's on Rows, Columns, Color and Filters for each chart.
- **Safe to skip this week:** Session 2 steps 2 and 4 (the nested crew and SKU bar, clicking through Show Me), the Tableau Tim tutorial and the *Filtering and Sorting* training module can be skipped.

---

## Tick off

- [ ] Tableau Public installed, both CSVs connected with correct types
- [ ] Can explain dimension/measure and discrete/continuous
- [ ] Line, bar and table views built with Color, Label and filters
- [ ] H1 2026 reason Pareto matches Week 26
- [ ] Three Phase 3 visuals rebuilt in Tableau, with notes on the differences
