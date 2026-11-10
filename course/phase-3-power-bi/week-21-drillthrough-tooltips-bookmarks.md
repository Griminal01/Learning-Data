# Week 21: Interactivity, drill-through, tooltips and bookmarks

**Phase 3 · Power BI** · Mon 22 Mar – Sun 28 Mar 2027 · about 5 hours

A good dashboard answers the first question on the page and lets people **click through to the next one** without you in the room. *"Which asset is worst?"* → click → *"What's been happening on it?"* That's drill-through. This week makes the report self-service.

**By Sunday you'll be able to:**

- build a **drill-through** page from any asset to its work order history
- create **report page tooltips** (a mini page that appears on hover)
- use **bookmarks** and buttons to toggle views and reset filters
- control visual interactions and **sync slicers** across pages
- use **field parameters** to let users switch the measure on a chart

---

## Session 1 (1.5 h): Drill-through to asset history

### Do it

1. Add a new page called **Asset Detail**.
2. In the Visualizations pane → *Drill through* section, drag `Assets[asset_id]` into **Add drill-through fields here**. A back-arrow button appears automatically.
3. Build the page:
   - **Header cards**: Asset name (`SELECTEDVALUE ( Assets[Asset] )` in a measure), zone, criticality, type, install date.
   - **KPI cards**: Reactive Jobs, Breakdown Hrs, MTTR Hrs, MTBF Hrs (per asset), PM Compliance % (Due).
   - **Table**: work order history (`wo_id`, Raised Date, WO Type, description, failure code, labour hrs, status), sorted newest first.
   - **Column chart**: breakdowns by month.
   - **Bar chart**: breakdowns by failure code.
4. Go back to your Pareto page, right-click **LD-PPK-005** → **Drill through** → Asset Detail. You should see 37 breakdowns, mostly *Operational - jam*, *Mechanical - jaws* and *Electrical - sensor*.
5. Add a dynamic title measure:

   ```dax
   Asset Title = "Asset history: " & SELECTEDVALUE ( Assets[asset_id] ) & " – " & SELECTEDVALUE ( Assets[Asset] )
   ```

### Why it works

Drill-through carries the clicked value (and by default all other filters, which you can switch off with *Keep all filters*) to the target page as a page filter. One detail page serves all 292 assets.

`SELECTEDVALUE ( column, "alternate" )` returns the value when exactly one is selected, otherwise the alternate. It's the standard way to show "what am I looking at?".

---

## Session 2 (1.5 h): Tooltips and interactions

### Report page tooltip

1. New page **TT Asset**. Format → Page information → **Allow use as tooltip** = On. Canvas settings → Type = **Tooltip** (a small page).
2. Put three cards on it (Reactive Jobs, Breakdown Hrs, MTTR Hrs) and a tiny column chart of breakdowns by month.
3. Hide the page (right-click the tab → Hide).
4. On the Pareto chart → Format → General → Tooltips → Type = **Report page** → Page = *TT Asset*.
5. Hover over a bar. The mini page appears, filtered to that asset.

### Visual interactions

Select a visual → Format ribbon → **Edit interactions**. Each other visual shows *Filter*, *Highlight* or *None* icons. Set KPI cards so clicking a bar *filters* them, and set the Pareto so clicking the zone chart *filters* (not highlights) it.

### Sync slicers

View → **Sync slicers**. Make the Zone and Date slicers sync across the Compliance, Trend and Pareto pages, so a choice on one page sticks when you move to the next.

---

## Weekend task (2 h): Bookmarks and field parameters

1. **Chart/table toggle**:
   - Put a chart and a table showing the same data in exactly the same position.
   - View → Bookmarks pane and View → Selection pane.
   - Hide the table and add a bookmark called *Show chart*. Then hide the chart, show the table, and add a bookmark called *Show table*.
   - In each bookmark's options, untick **Data** so the toggle doesn't reset filters.
   - Insert two buttons ("Chart", "Table") → Action → Bookmark.
2. **Reset filters button**: clear all slicers, add a bookmark *Reset* (with Data ticked), and add a button "Reset filters" that uses it.
3. **Field parameter**: Modeling → New parameter → **Fields** → add `Breakdown Hrs`, `Reactive Jobs`, `Minor Stop Hrs` and `Labour Hrs`. A slicer appears. Use the parameter as the column value in your zone bar chart. Now users pick the metric.
4. **Navigation**: add a page navigator (Insert → Buttons → Navigator → Page navigator) to the top of every visible page.
5. Test the whole report as a stranger would: start on page 1, click everything, and get lost on purpose. Fix anything confusing.

---

## Watch

- **Guy in a Cube**: *"Guy in a Cube drillthrough"* and *"Guy in a Cube report page tooltips"*.
- **Guy in a Cube**: *"Guy in a Cube bookmarks"*.
- **Microsoft Learn**: search *"Use field parameters to change dimensions Power BI"*.

---

## Check yourself

1. What's the difference between drill-*through* and drill-*down*?
2. Why untick *Data* on a show/hide bookmark?
3. Why hide tooltip pages?
4. A manager says "I clicked packing and the trend chart didn't change." What would you check?

<details>
<summary><strong>Answers</strong></summary>

1. **Drill-down** moves down a hierarchy *within the same visual* (Year → Month → Day). **Drill-through** jumps to *another page* that's filtered to what you clicked.
2. With Data ticked, the bookmark saves and restores filter and slicer states, so toggling the chart would reset whatever the user had selected. Untick it, so it only changes what's visible.
3. They're fragments that make no sense on their own. Hiding them keeps the page tabs clean for users.
4. Edit interactions (it may be set to *None*), whether the slicer is synced or applied to that page, and whether the chart's measure uses `REMOVEFILTERS` or `ALL` on Zones (like the "line" comparison measures).

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 5 (the Asset Detail drill-through, tested on LD-PPK-005), the Session 2 report page tooltip, edited interactions and synced slicers, and weekend items 1 to 3 (chart/table bookmark toggle, Reset button and the field parameter).
- **On your phone (10 min a day):** Watch the three Guy in a Cube videos on drillthrough, report page tooltips and bookmarks, read the "Why it works" note on `SELECTEDVALUE`, and answer Check yourself in your head.
- **Safe to skip this week:** Weekend item 4 (the page navigator, which the Week 22 header adds anyway) and extra detail visuals on Asset Detail beyond the cards and history table can wait.

---

## Tick off

- [ ] Asset Detail drill-through page works from any asset visual
- [ ] Report-page tooltip on the Pareto
- [ ] Interactions edited and slicers synced
- [ ] Chart/table bookmark toggle and a Reset button
- [ ] Field parameter metric switcher
