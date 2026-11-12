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

1. Add a new sheet called `Summary`.
2. Type the headers: `Zone` in `A1`, `Events` in `B1`, `Minutes` in `C1`, `Avg mins` in `D1`.
3. In `A2:A8` type the seven zones **exactly** as they appear in the data, one per cell: Cooking, Drying, Flaking, Forming, Baking, Primary Packing, End of Line.
4. In `B2` type this and press Enter:

   ```
   =COUNTIF(Sheet1!$D:$D,A2)
   ```

   If your data sheet has a different name, use that instead of `Sheet1`. The easiest way is to type `=COUNTIF(`, click across to the data sheet, click column D, and let Excel write the reference for you.
5. In `C2` type `=SUMIF(Sheet1!$D:$D,A2,Sheet1!$I:$I)`.
6. In `D2` type `=AVERAGEIF(Sheet1!$D:$D,A2,Sheet1!$I:$I)`.
7. Select `B2:D2` and drag the fill handle down to row 8.

   **You should see:** a number in every cell of `B2:D8`.
8. **Check the totals.** In `A9` type `Total`. In `B9` type `=SUM(B2:B8)` and in `C9` type `=SUM(C2:C8)`.

   **You should see:** Events 124 and Minutes 1931. If they don't match, a zone name in column A is misspelt.
9. **Two conditions.** In `E1` type `Breakdown mins`, and in `F1` type `Minor stop mins`.
10. In `E2` type this and press Enter:

    ```
    =SUMIFS(Sheet1!$I:$I,Sheet1!$D:$D,$A2,Sheet1!$G:$G,"Breakdown")
    ```
11. In `F2` type the same formula with `"Minor stop"` in place of `"Breakdown"`.
12. Select `E2:F2` and drag the fill handle down to row 8.

    **You should see:** each row's Breakdown and Minor stop minutes add up to its Minutes in column C.

### Why it works

`COUNTIF(range, criteria)` counts cells that match. `SUMIF(range, criteria, sum_range)` adds up the numbers alongside the matches. The **S** versions (`COUNTIFS`, `SUMIFS`, `AVERAGEIFS`) take as many condition pairs as you like, all of which must be true (AND logic).

Watch the argument order: **`SUMIFS` puts the sum range first**, but `SUMIF` puts it last. Microsoft made that choice years ago and it trips everyone up. Just use `SUMIFS` everywhere; it works with one condition too.

Criteria can be comparisons in quotes: `COUNTIF(Sheet1!I:I,">=30")` counts stops of 30 minutes or more.

---

## Session 2 (1.5 h): Text, dates and drop-downs

### Do it

1. Back on the data sheet, add a column headed `Zone Code` with `=MID(E2,4,3)` and fill it down.

   **You should see:** `LD-PPK-021` become `PPK`. `MID(text, start, length)` takes 3 characters starting at character 4.
2. Add a column headed `Day` with `=TEXT(A2,"ddd")` and fill it down.

   **You should see:** `Mon`, `Tue` and so on.

   If you get `#VALUE!`, your dates were read as text (real dates sit on the right of the cell, text on the left). Check yourself, Q5 shows the fix.
3. Add a column headed `Weekend?` with `=IF(WEEKDAY(A2,2)>5,"Weekend","Weekday")` and fill it down. `WEEKDAY(...,2)` numbers Monday as 1 and Sunday as 7.
4. Add a column headed `Label` with `=E2&" - "&F2` and fill it down. The `&` joins the asset code and description.
5. **Drop-down filter.** Go to your `Summary` sheet. In `H1` type `Pick a shift:`.
6. Select `I1`, then go to Data → Data Validation.
7. Set Allow to *List*, type `Days,Nights` in Source, and press OK.

   **You should see:** a drop-down arrow beside `I1`. Pick *Days* from it.
8. In `H3` type `Minutes for that shift`.
9. In `I3` type `=SUMIFS(Sheet1!$I:$I,Sheet1!$C:$C,I1)`.

   **You should see:** 851.
10. Change the drop-down in `I1` to *Nights*.

    **You should see:** `I3` change to 1080. This is the seed of every dashboard you'll ever build.

### Why it works

Dates in Excel are **numbers**: 1 June 2026 is 46174, which is the number of days since 1 January 1900. Formatting just changes how that number is displayed. That's why you can subtract one date from another to get the days between them, and why `TEXT(A2,"ddd")` can turn it into a day name.

Text functions (`LEFT`, `RIGHT`, `MID`, `LEN`, `TRIM`, `UPPER`) let you slice up codes. Asset numbering schemes almost always have structure, like site-zone-number here, and pulling that structure out is a daily task in maintenance data.

---

## Weekend build (2 h): Two-week downtime summary

On the `Summary` sheet:

1. Select `A1:F8`, then go to Data → Sort, and sort by Minutes, Largest to Smallest.

   **You should see:** Primary Packing at the top with 660 minutes.
2. Select the Zone and Minutes columns. (Hold `Ctrl` while you select the second column, because they're not next to each other.)
3. Go to Insert → Clustered Column.

   **You should see:** a bar chart with seven bars, tallest on the left.
4. **Format it properly**, because this is what separates a chart people read from one they ignore. Click the chart title and type a title that says the finding, not the topic: *"Primary Packing lost the most time (1–14 June)"*, not *"Minutes by Zone"*.
5. Click one of the gridlines and press Delete. Do the same for the legend (you only have one series).
6. Click the `+` next to the chart and tick **Data Labels**.
7. Click a bar once to select all the bars, then choose a grey fill (Format → Shape Fill).
8. Click the top bar again so only that bar is selected, and give it a strong colour.

   **You should see:** six grey bars and one coloured bar, each with its number on top.
9. Add a second chart: select the Zone, Breakdown mins and Minor stop mins columns, then go to Insert → Stacked Column.
10. Write two sentences under the charts: what you'd tell the shift manager.

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

## Short on time?

- **Must do (about 90 min at a PC):** This is the Phase 0 done-when, so the tick-off list is not skippable: Session 1 steps 1 to 8 with totals reconciling to 124 / 1931, Session 2 steps 1, 2 and 5 to 10 (`MID`, `TEXT`, the drop-down driving `SUMIFS`), and weekend steps 1 to 8 for one clean, titled chart.
- **On your phone (10 min a day):** Watch the Leila Gharani `SUMIFS` video and the Storytelling with Data declutter talk, read the "Why it works" parts on argument order and dates as numbers, and answer Check yourself in your head.
- **Safe to skip this week:** The second chart (weekend step 9, the stacked column), the `Weekend?` and `Label` columns (Session 2 steps 3 and 4) and the two written sentences are polish you can come back to.

---

## Tick off

- [ ] Zone summary built with `COUNTIF`/`SUMIFS`, totals reconcile to 124 / 1931
- [ ] Extracted zone code with `MID` and day name with `TEXT`
- [ ] Drop-down that drives a formula
- [ ] One clean, titled, decluttered chart
- [ ] Phase 0 done. Next week you start the real course.
