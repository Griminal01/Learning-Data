# Week 22: Report design, and building the Model Line dashboard

**Phase 3 · Power BI** · Mon 29 Mar – Sun 4 Apr 2027 · about 5 hours

You've learned the pieces. This week you design the real thing: the **Line D Maintenance Dashboard**, five pages, one question per page, in a consistent layout. Design is what decides whether people use it or politely ignore it.

**By Sunday you'll have:**

- a theme (colours, fonts) applied across the report
- a layout grid used on every page
- all five dashboard pages built, as below

---

## Session 1 (1.5 h): Design system

### Do it

1. **A theme file.** Save this as `lined_theme.json`, then go to View → Themes → Browse for themes:

   ```json
   {
     "name": "Line D",
     "dataColors": ["#1F4E79", "#9E9E9E", "#C62828", "#2E7D32", "#F9A825", "#5C6BC0", "#8D6E63", "#26A69A"],
     "background": "#FFFFFF",
     "foreground": "#212121",
     "tableAccent": "#1F4E79",
     "good": "#2E7D32",
     "bad": "#C62828",
     "neutral": "#F9A825",
     "textClasses": {
       "title":  { "fontFace": "Segoe UI Semibold", "fontSize": 14, "color": "#212121" },
       "label":  { "fontFace": "Segoe UI", "fontSize": 10, "color": "#424242" },
       "callout": { "fontFace": "Segoe UI Semibold", "fontSize": 28, "color": "#1F4E79" }
     }
   }
   ```

2. **The colour rules.** On your About page, write: *Navy = the thing you're looking at. Grey = context. Red = bad, and only bad. Green = on target.*
3. Add the second rule: *Never use red or green just for decoration. If a colour doesn't mean something, use grey.*
4. **The layout grid.** Use the standard 1280 × 720 canvas. Turn on View → *Snap to grid* and *Gridlines* while you build.
5. **Header band** at 0–60 px: the title, the last refresh date and the navigator.
6. **KPI row** at 70–170 px: 4 or 5 cards of equal width.
7. **Main visual** on the left two-thirds; **supporting visual** on the right third.
8. **Slicers** in one place, either a left rail or the top right. Pick one and never move it.
9. Build the **header** once on a page, then copy it to every page so they all match.

### Why it matters

Users learn a report's "grammar" on the first page. If the date slicer is top-right on page 1, they'll look for it there on page 4. Consistency is cheap, and it's the biggest single factor in whether people trust a report.

---

## Session 2 and weekend (3.5 h): Build the five pages

Each page answers **one question**. Write the question as a subtitle under the page title.

### Page 1: PM Compliance
*Are we doing our PMs on time, and where aren't we?*
- KPI cards: PM Compliance % (Due) vs 90 % target, PMs Due, PMs Late, PMs Missed
- Bar chart: compliance by zone, sorted worst first, with the target line
- Heat-map matrix: zone × month
- Table: the top 10 **overdue** PMs as at the last data date (Status = Open, due before the date), oldest first

### Page 2: Planned vs Reactive
*How much of our work is planned?*
- KPI cards: Planned % (count), Reactive Labour %, Reactive Jobs R13W
- 100 % stacked column: labour hours by WO Type by month
- Bar chart: reactive labour % by zone
- Line: Reactive Jobs vs PY

### Page 3: Reliability (MTBF & MTTR)
*Are assets getting more or less reliable?*
- KPI cards: MTBF Hrs (per asset), MTTR Hrs, Breakdown Hrs YTD vs PY
- Line chart: Breakdown Hrs R13W by week
- Scatter: assets with x = MTBF, y = MTTR, size = Breakdown Hrs. Top-left is "fails often, quick fix" and bottom-right is "rare but long". Label the quadrants with text boxes.
- Bar chart: MTBF by asset type (worst 10)

### Page 4: Top-10 Loss Assets
*Which assets cost us the most, and why?*
- The Pareto from Week 20 (top 15, with cumulative line)
- Table: top 10 with breakdowns, hours, MTTR and PM compliance (Due). This is your Phase 2 done-when query as a visual.
- Right-click drill-through to **Asset Detail** (Week 21), and the report tooltip on hover

### Page 5: Condition Monitoring Rollout
*Where are we with the vibration sensor rollout?*

Measures (the `SensorRollout` table has 105 sensors):

```dax
Sensors Planned = COUNTROWS ( SensorRollout )
Sensors Commissioned = CALCULATE ( [Sensors Planned], SensorRollout[status] = "Commissioned" )
Sensors Overdue = CALCULATE ( [Sensors Planned], SensorRollout[status] = "Overdue" )
Rollout % = DIVIDE ( [Sensors Commissioned], [Sensors Planned] )
```

- KPI cards: Planned **105**, Commissioned **52**, Overdue **28**, Rollout % **49.5 %**
- Stacked bar: status by rollout wave (Wave 2 has the most overdue: 16)
- Stacked bar: status by zone
- Table: overdue sensors with asset, planned date and days overdue

(Relate `SensorRollout[planned_date]` to the Calendar if you want a planned-vs-actual S-curve. Make it inactive and use USERELATIONSHIP, as in Week 19.)

### About page (hidden from the navigator, linked by an ⓘ button)
Data sources, last refresh, every KPI definition (*on time*, *MTBF per asset*, *planned %*), and the colour rules.

---

## Watch

- **Guy in a Cube**: *"Guy in a Cube report design tips"*.
- **SQLBI / Tabular Editor blog**: search *"Power BI report design best practices layout"*.
- **Microsoft Learn**: search *"Tips for designing a great Power BI dashboard"*.

---

## Check yourself

1. What should a page title say?
2. Why must red only ever mean "bad"?
3. Name two things that should be in the same place on every page.
4. The rollout page shows 49.5 % commissioned. What extra visual would tell a manager whether that's good or bad?

<details>
<summary><strong>Answers</strong></summary>

1. The question the page answers, or better, the finding ("Packing PM compliance is 15 points below the line").
2. So the eye can scan for red and trust that every red thing needs attention. Decorative red trains people to ignore it.
3. Any of: the date slicer, other slicers, navigation, the last-refreshed date, KPI card positions, the title, and the ⓘ info button.
4. **Plan vs actual over time** (an S-curve of planned and commissioned sensors cumulatively by week), or **commissioned vs plan to date**. 49.5 % of the total means nothing without knowing how many *should* be done by now. Wave 3 isn't due until later.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 (theme JSON applied, colour rules written, layout grid and one header copied to every page), then all five pages and the About page. This is the dashboard Week 24 tests, so none of the pages are optional, and it needs well over 90 minutes: give each page its own short sitting.
- **On your phone (10 min a day):** Watch the Guy in a Cube report design tips video, read the Microsoft Learn *Tips for designing a great Power BI dashboard* page and "Why it matters", and sketch the 1280 × 720 grid and each page's one-question subtitle on paper before you build.
- **Safe to skip this week:** The optional planned-versus-actual S-curve on page 5 and the quadrant text-box labels on the page 3 scatter are polish you can add later.

---

## Tick off

- [ ] Theme JSON applied, colour rules written down
- [ ] Layout grid and header consistent across pages
- [ ] Pages 1–5 built
- [ ] About page with KPI definitions
