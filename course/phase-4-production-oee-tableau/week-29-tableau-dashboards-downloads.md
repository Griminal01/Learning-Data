# Week 29: Tableau 3, dashboards, and getting data *out* of Tableau

**Phase 4 · Production data: OEE, Redzone & Tableau** · Mon 17 May – Sun 23 May 2027 · about 5 hours

Two skills this week. First, assembling sheets into an **interactive dashboard** with actions and parameters. Second, the one you'll use at work straight away: **downloading data from a Tableau dashboard and turning it into something you can analyse**, because what comes out is rarely analysis-ready.

**By Sunday you'll be able to:**

- build a dashboard with layout containers, filter actions and highlight actions
- use a **parameter** to let users switch measures or set a target
- explain the download options on Tableau Server/Cloud, and what each one really gives you
- clean a Tableau crosstab download in Power Query

---

## Session 1 (1.5 h): Build a dashboard

### Do it

Using your Week 27–28 sheets (OEE by month, OEE by shift, the reason Pareto, the shift-OEE histogram):

1. **Dashboard → New Dashboard**. Size: *Automatic*, or fixed 1366 × 768.
2. Drag in a **Horizontal** container for a KPI row: four small sheets each showing one number (OEE, A, P, Q) as large text.
3. Below it, OEE by month (left, wide) and the Pareto (right).
4. **Filter action**: Dashboard → Actions → Add Action → *Filter*. Source = *OEE by month*, Target = *Pareto*, run on **Select**. Click a month, and the Pareto shows that month's reasons.
5. **Highlight action** on Shift, so hovering over Days highlights Days everywhere.
6. **Parameter: target OEE.** Create Parameter → *Target OEE*, float, current value 0.75 → Show Parameter. Then add a calculated field `IF [OEE] >= [Target OEE] THEN "On target" ELSE "Below" END`, put it on Color in the monthly chart, and add a **reference line** at the parameter value.
7. Titles that state findings, consistent colours (red only for "bad"), and no unnecessary gridlines. The Phase 3 design rules all apply.
8. Save to Tableau Public.

### Why it works

Actions turn separate charts into one tool: *select here → filter there*. Parameters are user inputs that any calculation can use, much like Power BI's what-if parameters and field parameters.

---

## Session 2 (1.5 h): Getting data out of Tableau at work

On Tableau Server or Tableau Cloud, the **Download** button (top toolbar of a view) typically offers the options below. Which ones you see depends on the permissions the site admin has given you.

| Option | What you get | Watch out for |
|---|---|---|
| **Image / PDF / PowerPoint** | a picture | no data |
| **Data** | the *summary* data behind one sheet, and sometimes the *full* (underlying) rows | full data may be restricted; summary is already aggregated |
| **Crosstab** | the sheet as a table (CSV or Excel), exactly as laid out | **pre-aggregated, formatted text** (`72.5%`, `1,304`), filters already applied, sometimes a **Grand Total** row |
| **Tableau Workbook** | the .twb/.twbx | often disabled for viewers |

**Golden rules for downloads:**

1. Note **which filters were applied** when you downloaded. Write them in the file name, e.g. `OEE_weekly_LineD_2026H1_allshifts.csv`.
2. Prefer the **lowest grain** you can get (shift or event rows, not weekly percentages), so you can re-aggregate correctly yourself.
3. **Never average downloaded percentages.** If you only have percentages, ask for the underlying minutes and counts.
4. Treat downloads as **company data**: keep them on work systems and follow the data policy.

### Do it: clean a realistic crosstab download

`data/production/tableau_crosstab_weekly_oee.csv` is shaped like a weekly OEE crosstab download for H1 2026. Open it in Notepad first and look at it:

- dates as text: `5 January 2026`
- percentages as text: `73.8%`
- numbers with thousands commas, in quotes: `"1,304"`
- a **Grand Total** row at the bottom
- the last row before the total, **29 June 2026**, is a **partial week** (just 2 days: 525 minutes of downtime)

In Excel → **Power Query** (Data → From Text/CSV → Transform):

1. Filter out `Grand Total` (Text Filters → does not equal).
2. `Week of Production Date` → Change Type → **Using Locale** → Date, English (UK).
3. For the % columns: Replace Values `%` → nothing, change the type to Decimal, then Transform → Standard → **Divide by 100**.
4. `Downtime (min)` and `Good Packs`: Replace `,` → nothing, then change to Whole Number.
5. Add a column `Partial week` that flags the last week. (Hint: weeks with much lower downtime and good packs. Better, compare with the number of shifts in `shifts.csv` for that week.)
6. Load it and chart weekly OEE. Check that the Grand Total row you removed said **71.9 %**. That matches your own calculation from raw shifts, which proves the download and your method agree.

---

## Weekend (2 h): Your first real download (with permission)

1. Check your site's data policy, or ask your manager: *"Can I download the weekly OEE and downtime data for Line D to analyse in Excel on my work laptop?"*
2. If yes: download the **lowest-grain** view you can find (shift-level or event-level if available), with a clear file name, and keep it on your work PC/OneDrive. Build the Week 25 minute bridge from it. Does your OEE match the dashboard's? If not, which definition differs (planned stops, target rates, short stops)?
3. If not yet: repeat the Power Query cleaning on the synthetic crosstab until you can do it in under 10 minutes, and write your request to the CI/production lead for event-level access.

---

## Watch

- Tableau free training: *Dashboards and Stories → Getting Started with Dashboards*, *Dashboard Interactivity Using Actions*.
- Search *"Tableau download crosstab vs data"* for a short explainer of the download options.
- Search *"Tableau parameters tutorial"*.

---

## Check yourself

1. You download a weekly crosstab with OEE % per week and average the 26 weeks. What two problems might you have?
2. What's the difference between *Download → Data* and *Download → Crosstab*?
3. Why put the filter settings in the file name?
4. When would you use a highlight action instead of a filter action?

<details>
<summary><strong>Answers</strong></summary>

1. (a) Averaging percentages gives equal weight to unequal weeks, and the partial final week (2 days) counts as a whole week. (b) The Grand Total row might be included in the average. Use the underlying minutes and counts instead, and exclude the total row.
2. *Data* gives the data behind the marks: summary values, or with permission the underlying rows, as a clean table. *Crosstab* reproduces the visible table layout, often with formatted text values and totals. It's convenient for reading, but awkward for analysis.
3. A downloaded file has no memory of the filters that produced it. Months later, nobody (including you) will know whether it was one line or all lines, or all shifts or Days only. Getting that wrong produces confidently wrong conclusions.
4. Highlight when the user should see the selected item *in context* (all the other bars dimmed but visible). Filter when the other views should show *only* the selection, for example drilling from a month into that month's reasons.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 6 and 8 (KPI row, filter action, highlight action, the Target OEE parameter with its reference line, saved), and Session 2 steps 1 to 6 cleaning the crosstab in Power Query until your total matches the removed Grand Total of 71.9 %.
- **On your phone (10 min a day):** Watch the Tableau training modules on dashboards and actions, read the download options table and the four golden rules, and answer Check yourself in your head. At work, ask your manager the weekend step 1 question about downloading Line D data.
- **Safe to skip this week:** Session 1 step 7 (finding-style titles and colour polish) and weekend step 3 (repeating the crosstab clean until it takes under 10 minutes) can wait.

---

## Tick off

- [ ] Dashboard with KPI row, filter action, highlight action and target parameter
- [ ] Can explain each Tableau download option and its traps
- [ ] Crosstab cleaned in Power Query: total row removed, types fixed, partial week flagged
- [ ] Downloaded total (71.9 %) matches my own calculation
- [ ] Asked about (or done) a first real, permitted download
