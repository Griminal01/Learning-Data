# Week 16: Modelling, star schema, relationships and the date table

**Phase 3 · Power BI** · Mon 15 Feb – Sun 21 Feb 2027 · about 5 hours

The model is the foundation. Get it right and DAX is easy. Get it wrong and every measure turns into a fight. You designed this star schema on paper in Week 9; now you build it.

**By Sunday you'll be able to:**

- create one-to-many relationships with single-direction filtering
- explain **cardinality** and **cross-filter direction**
- mark a proper **date table**
- handle **two dates on one fact** (raised vs due) with an inactive relationship
- hide technical columns and organise the field list

---

## Session 1 (1.5 h): Build the star

### Do it

1. Go to **Model view**. If Power BI auto-created relationships, **delete them all**. You'll build them deliberately. (Also turn off File → Options → Current File → Data Load → *Autodetect new relationships* and *Auto date/time*.)
2. Drag to create these relationships, **dimension → fact**:

   | From (1 side) | To (* side) |
   |---|---|
   | `Zones[zone_code]` | `Assets[zone_code]` |
   | `Assets[asset_id]` | `WorkOrders[asset_id]` |
   | `Assets[asset_id]` | `Downtime[asset_id]` |
   | `Assets[asset_id]` | `PMTasks[asset_id]` |
   | `Assets[asset_id]` | `SensorRollout[asset_id]` |
   | `Calendar[Date]` | `WorkOrders[Raised Date]` |
   | `Calendar[Date]` | `Downtime[Start Date]` |

3. Double-click each relationship and check it's *Many to one (\*:1)* with cross-filter direction **Single**.
4. **Second date relationship**: create `Calendar[Date]` → `WorkOrders[due_date]`. Power BI makes it **inactive** (a dotted line), because there can only be one active path between two tables. That's what you want: you'll switch it on in DAX for PM compliance (Week 19).
5. **Mark as date table**: select `Calendar` in Table view → Table tools → *Mark as date table* → choose `Date`.
6. Tidy the field list:
   - Hide the key columns on the fact tables (right-click → *Hide in report view*): `WorkOrders[asset_id]`, `Downtime[asset_id]` and so on. Users should pick asset fields from `Assets`, not from the facts.
   - Hide `raised_datetime` and `start_datetime` if you don't need them on visuals.
   - Set `Calendar[Month Name]` → *Sort by column* → `Month`, so months sort Jan, Feb, Mar instead of alphabetically.
7. Now re-check last week's zone bar chart. Each zone now shows its own count. 🎉

### Why it works

Filters flow **from the 1 side to the many side**, down the arrow. Click "Primary Packing" in a slicer and:

```
Zones (PPK) → Assets (PPK assets) → WorkOrders (their jobs)
                                   → Downtime (their stops)
```

Facts never filter dimensions (with Single direction), and facts never filter each other directly. That's deliberate: it stops ambiguous paths and wrong totals.

**Why not just merge everything into one big table?** You could, but then downtime and work orders (two facts at different grains) would have to be squashed together, and you'd get fan-out (Week 11). A star keeps each fact at its natural grain and lets the dimensions slice both.

**Why turn off Auto date/time?** It silently creates a hidden calendar for *every* date column. That bloats the file and doesn't work with proper time intelligence. One explicit Calendar is the professional way.

---

## Session 2 (1.5 h): Test the model

### Do it

Build a **Matrix** visual: `Zones[zone]` on Rows, `Calendar[Year]` on Columns, Count of `WorkOrders[wo_id]` in Values. Then test the model:

1. Add `Downtime[duration_min]` (Sum). Both facts slice correctly by zone and year, because they share dimensions.
2. Add a slicer on `Assets[criticality]`. Both facts respond.
3. Try putting `Downtime[category]` in a slicer. Do work order counts change? (They shouldn't. Downtime can't filter WorkOrders.) That's correct behaviour, so make sure you understand why.
4. Put `WorkOrders[wo_type]` on the rows of a new matrix with `Downtime` minutes. Every row shows the same total. Explain why to yourself.

---

## Weekend task (2 h): Model hygiene and documentation

1. **Rename for humans** (in the model, not in Power Query): `asset_name` → *Asset*, `zone` → *Zone*, `wo_type` → *WO Type*, `labour_hours` → *Labour Hrs*, and so on. Report users should never see underscores.
2. **Set data categories and formats**: percentages, whole numbers, date formats `dd/mm/yyyy`.
3. **Default summarisation**: set `priority`, `frequency_days` and `rollout_wave` to *Don't summarize*. Nobody wants a "Sum of priority".
4. **Display folders**: in Model view, group `Assets` columns into folders like *Identity* and *Classification*.
5. Take a screenshot of your Model view and save it as `model.png` for your portfolio.
6. Read *"Understand star schema and the importance for Power BI"* on Microsoft Learn (search that title). It's the single best page on this topic.

---

## Watch

- **Guy in a Cube**: *"Guy in a Cube star schema Power BI"*.
- **SQLBI**: *"SQLBI relationships Power BI"*. It's precise and goes deeper.
- **Microsoft Learn**: PL-300 module *Design a semantic model in Power BI*.

---

## Check yourself

1. What does the arrow on a relationship line show?
2. Why can't there be two active relationships between `Calendar` and `WorkOrders`?
3. A slicer on `Downtime[category]` doesn't change your work order card. Is that a bug?
4. When might you need a **bidirectional** filter, and why is it risky?
5. Why hide `WorkOrders[asset_id]` but keep `Assets[asset_id]` visible?

<details>
<summary><strong>Answers</strong></summary>

1. The direction filters travel, from the "1" (dimension) to the "many" (fact).
2. If both were active, a date filter would be ambiguous: does 1 June mean raised on 1 June or due on 1 June? Power BI forces one active path, and you activate the other one in specific measures with `USERELATIONSHIP`.
3. No. Downtime is a fact, and facts don't filter other facts. If you need "work orders on assets that had breakdown stops", that's a measure-level question (Week 18).
4. For example, if you want a slicer of *assets* to only list assets that have downtime in the selected period. Bidirectional filters can create ambiguous paths and slow, surprising results, so avoid them. If you must, use `CROSSFILTER` inside one measure.
5. Users should always slice by the **dimension's** column, which filters every fact. The fact's copy only filters that one fact, which causes confusing results.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 7 (seven active relationships plus the inactive due date one, Auto date/time off, Calendar marked as date table, months sorted, keys hidden) and the four Session 2 model tests, then weekend step 1 (rename for humans) and step 5 (`model.png`).
- **On your phone (10 min a day):** Watch the Guy in a Cube star schema video, read the "Why it works" part on filters flowing from the 1 side and on Auto date/time, read the Microsoft Learn page *Understand star schema and the importance for Power BI*, and answer Check yourself in your head.
- **Safe to skip this week:** Weekend steps 2 to 4 (formats, default summarisation and display folders) are tidy-up you can do in a lighter week, and the SQLBI relationships video and PL-300 modelling module can wait.

---

## Tick off

- [ ] Star schema built: 7 active relationships plus 1 inactive (due date)
- [ ] Auto date/time off, Calendar marked as date table, months sort correctly
- [ ] Model tested with two facts sliced by shared dimensions
- [ ] Columns renamed, formatted and foldered; keys hidden
- [ ] `model.png` saved
