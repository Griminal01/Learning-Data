# Week 2: Summarising and charting

**Phase 0 · Foundations** · Mon 9 Nov – Sun 15 Nov 2026 · about 5 hours

Last week you answered questions by filtering and reading the status bar. That works once, but next week you'd have to do it all again. This week you build formulas that do the summarising for you, so new data means new answers automatically.

**By Sunday you'll be able to:**

- summarise a list with `COUNTIF(S)`, `SUMIF(S)` and `AVERAGEIFS`
- pull pieces out of text and dates (`LEFT`, `MID`, `TEXT`, `WEEKDAY`)
- add a drop-down list with Data Validation
- build and format a clear column chart

**You need:** your `week01_downtime.xlsx` from last week. If anything went wrong, start again from `data/week01/shift_downtime_log.csv`.

---

## Session 1 (1.5 h): Conditional sums and counts

### Do it

1. Add a new sheet called `Summary`. In `A1` type `Zone`, in `B1` `Events`, in `C1` `Minutes`, in `D1` `Avg mins`.
2. In `A2:A8` type the seven zones **exactly** as they appear in the data: Cooking, Drying, Flaking, Forming, Baking, Primary Packing, End of Line.
3. In `B2` type:

   ```
   =COUNTIF(Sheet1!$D:$D,A2)
   ```

   (If your data sheet has a different name, use that instead of `Sheet1`. The easiest way is to type `=COUNTIF(`, click across to the data sheet, click column D, and Excel writes the reference for you.)
4. In `C2`: `=SUMIF(Sheet1!$D:$D,A2,Sheet1!$I:$I)`
5. In `D2`: `=AVERAGEIF(Sheet1!$D:$D,A2,Sheet1!$I:$I)`
6. Select `B2:D2` and fill down to row 8. Add totals in row 9 with `SUM`. Check that **total Events = 124** and **total Minutes = 1931**. If they don't match, a zone name is misspelt.
7. **Two conditions.** Add `E1` = `Breakdown mins` and `F1` = `Minor stop mins`. In `E2`:

   ```
   =SUMIFS(Sheet1!$I:$I,Sheet1!$D:$D,$A2,Sheet1!$G:$G,"Breakdown")
   ```

   In `F2` use the same formula with `"Minor stop"`. Fill down.

### Why it works

`COUNTIF(range, criteria)` counts cells that match. `SUMIF(range, criteria, sum_range)` adds up the numbers alongside the matches. The **S** versions (`COUNTIFS`, `SUMIFS`, `AVERAGEIFS`) take as many condition pairs as you like, all of which must be true (AND logic).

Watch the argument order: **`SUMIFS` puts the sum range first**, but `SUMIF` puts it last. Microsoft made that choice years ago and it trips everyone up. Just use `SUMIFS` everywhere; it works with one condition too.

Criteria can be comparisons in quotes: `COUNTIF(Sheet1!I:I,">=30")` counts stops of 30 minutes or more.

---

## Session 2 (1.5 h): Text, dates and drop-downs

### Do it

1. Back on the data sheet, add a column `Zone Code` with `=MID(E2,4,3)`. The asset `LD-PPK-021` becomes `PPK`. `MID(text, start, length)` takes 3 characters starting at character 4.
2. Add `Day` with `=TEXT(A2,"ddd")`, which gives `Mon`, `Tue` and so on.
   - If you get `#VALUE!`, your dates were read as text. Check that they're right-aligned in the cell; real dates are numbers, and numbers align right. Excel set to UK regional settings reads `01/06/2026` as 1 June. If yours didn't, see Check yourself, Q5.
3. Add `Weekend?` with `=IF(WEEKDAY(A2,2)>5,"Weekend","Weekday")`. `WEEKDAY(...,2)` numbers Monday as 1 and Sunday as 7.
4. Add `Label` with `=E2&" - "&F2`, which joins the asset code and description with `&`.
5. **Drop-down filter on your Summary sheet:**
   - In `H1` type `Pick a shift:`. Select `I1`, go to Data → Data Validation → Allow: *List*, Source: `Days,Nights`.
   - In `H3` type `Minutes for that shift`, and in `I3`: `=SUMIFS(Sheet1!$I:$I,Sheet1!$C:$C,I1)`.
   - Change the drop-down and watch the number change. This is the seed of every dashboard you'll ever build.

### Why it works

Dates in Excel are **numbers**: 1 June 2026 is 46174, which is the number of days since 1 January 1900. Formatting just changes how that number is displayed. That's why you can subtract one date from another to get the days between them, and why `TEXT(A2,"ddd")` can turn it into a day name.

Text functions (`LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `UPPER`) let you slice up codes. Asset numbering schemes almost always have structure, like site-zone-number here, and pulling that structure out is a daily task in maintenance data.

---

## Weekend build (2 h): Two-week downtime summary

On the `Summary` sheet:

1. Sort your zone table by Minutes, largest first (select `A1:F8`, then Data → Sort by Minutes, Largest to Smallest).
2. **Insert a chart:** select the Zone and Minutes columns (hold `Ctrl` to select non-adjacent columns), then Insert → Clustered Column.
3. **Format it properly**, because this is what separates a chart people read from one they ignore:
   - Title that says the finding, not the topic: *"Primary Packing lost the most time (1–14 June)"*, not *"Minutes by Zone"*.
   - Delete the gridlines and the legend (you only have one series).
   - Add data labels (the `+` next to the chart → Data Labels).
   - Make all the bars grey except the top one, which gets a strong colour: click once to select all bars, then click again to select only one bar.
4. Add a second chart: a **stacked column** of Breakdown mins vs Minor stop mins by zone.
5. Write two sentences under the charts: what you'd tell the shift manager.

---

## Watch

- **Leila Gharani**: search *"Leila Gharani SUMIFS COUNTIFS"*.
- **Excel Campus (Jon Acampora)**: search *"Excel Campus data validation drop down list"*.
- **Storytelling with Data (Cole Nussbaumer Knaflic)**: search *"storytelling with data declutter chart"*. A 10-minute talk on why the grey-bars-plus-one-colour trick works. You'll use this idea for the rest of the course.

Function reference when you get stuck: [exceljet.net/functions](https://exceljet.net/functions).

---

## Check yourself

1. Count the stops in Primary Packing that lasted 10 minutes or more.
2. Total minutes for **Breakdowns on Nights**.
3. From `LD-EOL-016`, extract just the number `016` as text.
4. What does `=DATE(2026,6,14)-DATE(2026,6,1)` return, and why?
5. Your dates came in as text like `01/06/2026` and are left-aligned. Give one way to fix them.

<details>
<summary><strong>Answers</strong></summary>

1. `=COUNTIFS(Sheet1!D:D,"Primary Packing",Sheet1!I:I,">=10")`
2. `=SUMIFS(Sheet1!I:I,Sheet1!G:G,"Breakdown",Sheet1!C:C,"Nights")`
3. `=RIGHT(E2,3)`, or `=MID(E2,8,3)`
4. `13`: dates are day numbers, so subtracting gives the days between them.
5. Select the column, go to Data → Text to Columns → Next → Next → choose *Date: DMY* → Finish. (Or use `=DATEVALUE(A2)` in a helper column. In Week 7 Power Query will do this properly every time.)

**Reference numbers** so you can check your Summary sheet:

| Zone | Events | Minutes |
|---|---|---|
| Primary Packing | 49 | 660 |
| End of Line | 32 | 467 |
| Forming | 22 | 420 |
| Drying | 3 | 148 |
| Flaking | 7 | 145 |
| Baking | 5 | 58 |
| Cooking | 6 | 33 |
| **Total** | **124** | **1931** |

Shifts: Days 851 min, Nights 1080 min. The worst day of the week was Tuesday (392 min).

</details>

---

## Tick off

- [ ] Zone summary built with `COUNTIF`/`SUMIFS`, totals reconcile to 124 / 1931
- [ ] Extracted zone code with `MID` and day name with `TEXT`
- [ ] Drop-down that drives a formula
- [ ] One clean, titled, decluttered chart
- [ ] Phase 0 done. Next week you start the real course.
