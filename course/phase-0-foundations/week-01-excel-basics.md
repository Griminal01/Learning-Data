# Week 1: Excel basics, your first look at downtime data

**Phase 0 · Foundations** · Mon 2 Nov – Sun 8 Nov 2026 · about 5 hours

You're starting from scratch, so this week is about getting comfortable: opening a data file, moving around it quickly, and getting Excel to do sums for you. Nothing here is hard, but everything later is built on it.

**By Sunday you'll be able to:**

- open a CSV file and save it as a proper Excel workbook
- sort, filter and freeze headers so a big list is easy to read
- write formulas with `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT` and `IF`
- explain the difference between `A1`, `$A$1` and `A$1`, and why it matters

**You need:** Excel (Microsoft 365) and the file `Documents\Learning-Data\data\week01\shift_downtime_log.csv`. If you haven't got the course files yet, do [Week 0: Set up](../week-00-setup.md) first. It takes about 30 minutes.

---

## Session 1 (1.5 h): Find your way around

### Do it

Each step is one thing to do. Where there's a **You should see** line, check it before you move on. If it doesn't match, redo that step.

1. Double-click `shift_downtime_log.csv` and it opens in Excel. This is two weeks of downtime from a fictional cereal line, the same kind of log a shift team fills in.
2. **Save it as a workbook straight away:** File → Save As → choose *Excel Workbook (\*.xlsx)* → name it `week01_downtime.xlsx`.

   A CSV can't hold formulas, formatting or extra sheets, so always save a working copy as `.xlsx`.
3. **Make it readable.** Press `Ctrl+A` to select everything.
4. On the Home tab, choose Format → AutoFit Column Width.

   **You should see:** every column wide enough to read its contents.
5. Click cell `A2`.
6. Go to View → Freeze Panes → *Freeze Panes*. Scroll down a little.

   ![The View tab with the Freeze Panes menu open](../img/w1-freeze-panes.png)

   **You should see:** the header row stays put while the data scrolls.
7. Click the row number **1** on the left and press `Ctrl+B` to make the headers bold.

**Checkpoint:** the title bar says `week01_downtime.xlsx`, every column is readable, and the bold header row stays on screen when you scroll. If the title bar still says `.csv`, redo step 2. If the header scrolls away, go back to step 5.

8. **Learn to move fast.** Click any cell in the data, then press `Ctrl+↓`, then `Ctrl+↑`.

   **You should see:** the cursor jump to the last row of data, then back to the top.
9. Press `Ctrl+End`, then `Ctrl+Home`.

   **You should see:** the cursor jump to the last used cell, then back to `A1`.
10. Click `I2` and press `Ctrl+Shift+↓`.

    **You should see:** everything from `I2` down to the bottom of the data selected.
11. **Use the status bar.** Click the column letter **I** (Minutes) at the top of the column, then look at the bottom-right of the Excel window.

    ![The status bar at the bottom right showing Average, Count and Sum](../img/w1-status-bar.png)

    **You should see:** Average ≈ 15.6, Count 125 (124 rows plus the header) and Sum 1931.
12. Right-click the status bar and tick **Minimum** and **Maximum**.

    **You should see:** Min 2 and Max 177 added to the status bar.

**Checkpoint:** with column I selected, the status bar shows Sum 1931, Count 125, Min 2 and Max 177. If it doesn't, go back to step 11.

13. **Sort.** Click any cell in the Minutes column, then go to Data → Sort Largest to Smallest.

    **You should see:** the worst stop at the top: a vacuum pump bearing in Forming, 177 minutes.
14. **Filter.** Go to Data → Filter.

    **You should see:** a small arrow in every header cell.
15. Click the arrow on **Category**, untick everything except *Breakdown*, and press OK.

    ![The Category filter list with only Breakdown ticked](../img/w1-filter-list.png)
16. Click the column letter **I** again and read the status bar.

    **You should see:** Sum 976. That's 14 breakdowns.
17. Clear the filter: Data → Clear.

    **You should see:** all 124 rows back.

### If your numbers don't match

- **Count says 124, not 125.** You selected from `I2` down instead of clicking the column letter. That's fine: the header just isn't counted. The Sum should still be 1931.
- **The Sum is lower than 1931.** A filter is still on, and the status bar only adds up the rows you can see. Go to Data → Clear (step 17), then check again.
- **The sort only moved the Minutes column.** If Excel asked about *expanding the selection* and you chose *Continue with the current selection*, the rows no longer line up. Press `Ctrl+Z` straight away. If it's too late, close without saving, reopen `shift_downtime_log.csv` and start again from step 2.
- **The header row scrolls away, or the wrong rows are frozen.** Go to View → Freeze Panes → *Unfreeze Panes*, click `A2`, and redo step 6.
- **The filtered Sum isn't 976.** Open the Category filter again and check that only *Breakdown* is ticked (step 15), then click the column letter **I** (step 16). The bottom-left of the window should say *14 of 124 records found*.

### Why it works

Excel stores data in a **grid of cells**: columns are letters, rows are numbers, so `I2` is column I, row 2. A data file like this is a **list**: one header row, then one row per event, with no gaps. Sort, filter and the status bar all work by detecting that list, so **a blank row or column in the middle breaks them.** Keep lists solid.

The status bar is the quickest sanity check in Excel. Before trusting any formula, select the column and see if the sum looks right.

---

## Session 2 (1.5 h): Formulas and cell references

### Do it

1. Scroll to the bottom of the data, which ends on row 125. Leave row 126 empty: the gap keeps your totals apart from the list, so sort, filter and the fill handle don't mix them in.
2. In `H127` type `Total`. In `I127` type `=SUM(I2:I125)` and press Enter.

   **You should see:** 1931.
3. In `H128` type `Average`. In `I128` type `=AVERAGE(I2:I125)` and press Enter.

   **You should see:** 15.57…
4. In `H129` type `Longest`. In `I129` type `=MAX(I2:I125)`.

   **You should see:** 177.
5. In `H130` type `Shortest`. In `I130` type `=MIN(I2:I125)`.

   **You should see:** 2.
6. In `H131` type `Events`. In `I131` type `=COUNT(I2:I125)`.

   **You should see:** 124.

**Checkpoint:** `I127` to `I131` show 1931, 15.57…, 177, 2 and 124, with their labels in column H, and row 126 is still empty. If a result is off, click it and compare the formula bar with steps 2 to 6: the range should be `I2:I125`.

7. **Add a calculated column.** In `J1` type `Hours`.
8. In `J2` type `=I2/60` and press Enter.
9. Click `J2`, then double-click the tiny square at the bottom-right corner of the cell (the *fill handle*).

   ![Close-up of the fill handle, the small square at the bottom right of the selected cell](../img/w1-fill-handle.png)

   **You should see:** the formula filled down to the bottom of the data.
10. Click `J3` and look at the formula bar, above the column letters.

    **You should see:** `=I3/60`, not `=I2/60`. Excel moved the reference down one row for you. That's a **relative reference**.
11. **Percent of total.** In `K1` type `% of total`.
12. In `K2` type `=I2/I127`, press Enter, then fill it down with the fill handle.

    **You should see:** the results go wrong straight away. `K3` divides by `I128`, `K4` by `I129`… The total moved too.
13. **Fix it.** In `K2` type `=I2/$I$127` instead, press Enter, and fill down again.

    **You should see:** sensible small numbers all the way down. The `$` signs lock the reference, so every row divides by the total.
14. Select column K and press the `%` button on the Home tab.

    **You should see:** the column shown as percentages.

**Checkpoint:** columns J and K stop at row 125, the same as the data. Select `K2:K125` and the status bar's Sum says 100%. If it doesn't, redo step 13.

15. **Your first decision formula.** In `L1` type `Long stop?`.
16. In `L2` type this and press Enter, then fill it down:

    ```
    =IF(I2>=30,"Long","Short")
    ```
17. Filter column L to *Long*. (If L has no filter arrow, turn Data → Filter off and on again.)

    **You should see:** 12 rows.

### If your numbers don't match

- **The SUM isn't 1931.** Click `I127` and check the formula bar says `=SUM(I2:I125)`. A range that stops early, like `I2:I12`, gives a smaller total.
- **AVERAGE shows 15.6 or 16.** That's only how many decimals Excel shows. The value is still 15.57…
- **Column J carries on past row 125, into your totals.** Row 126 wasn't left empty, so the fill handle kept going. Delete the extra cells in J, K and L below row 125, and make sure row 126 is blank (step 1).
- **`#DIV/0!` in column K.** The `$I$127` in your formula points at an empty cell. Check your total really is in `I127` (step 2), then redo step 13.
- **Column K shows numbers like 0.002 instead of percentages.** Select column K again and press `%` (step 14).
- **The Long filter shows more than 12 rows.** The filter has picked up your totals. Click a cell inside the data, turn Data → Filter off and on again, and filter again. Also check that `L2` says `>=30` (step 16).

### Why it works

Every formula starts with `=`. When you copy a formula, Excel shifts its references by the same amount you moved, which is why copying down "just works" most of the time.

| Reference | Copy down | Copy across | Use it for |
|---|---|---|---|
| `I2` | changes row | changes column | row-by-row calculations |
| `$I$127` | stays | stays | a single fixed cell like a total or a target |
| `I$127` | stays | changes column | a header row you look across |
| `$I2` | changes row | stays | a column you look down |

Press `F4` while your cursor is on a reference to cycle through these four.

`IF` reads like a PLC rung: *if* the condition is true, output this, *else* output that. `IF(I2>=30,"Long","Short")` is the formula version of a comparator feeding a coil.

---

## Weekend build (2 h): Shift handover questions

Add a new sheet (the `+` at the bottom), name it `Answers`, and use sort, filter, the status bar and formulas to answer these. Write the answer **and how you got it** next to each one.

1. Which zone had the most events? (Filter Zone one at a time, or sort by Zone and count.)
2. Which zone lost the most minutes?
3. How many minor stops were there, and how many minutes did they cost in total?
4. Were Days or Nights worse, by minutes?
5. Which single asset appears most often?
6. What percentage of total minutes came from breakdowns?

Then tidy the sheet: bold headers, a fill colour on the header row, borders around the data, and numbers with sensible decimals (Home → Increase/Decrease Decimal).

---

## Watch

Watch these **after** you've tried the tasks. They'll make more sense once you've hit the problems yourself.

- **Kevin Stratvert** (YouTube): search *"Kevin Stratvert Excel tutorial for beginners"*. A complete beginner walkthrough, about an hour. Watch at 1.25× speed.
- **Leila Gharani** (YouTube): search *"Leila Gharani absolute relative references"*. A short, clear explanation of the `$` signs.
- **ExcelJet**: [exceljet.net/shortcuts](https://exceljet.net/shortcuts) lists the shortcuts. Learn five a week.

---

## Check yourself

1. You type `=B2*C2` in `D2` and copy it to `D5`. What formula is in `D5`?
2. You have a target downtime in cell `F1`. Write a formula for `G2` that you can fill down to show `"Over"` if `I2` is above the target, otherwise `"OK"`.
3. Why does a blank row in the middle of your data cause problems?
4. You select a column and the status bar shows *Count* but no *Sum*. What does that tell you about the data?
5. Write a formula that converts the minutes in `I2` to hours and rounds to 1 decimal place. (Hint: look up `ROUND`.)

<details>
<summary><strong>Answers</strong> (try first)</summary>

1. `=B5*C5`. Both references are relative, so both move down 3 rows.
2. `=IF(I2>$F$1,"Over","OK")`. The target must be locked with `$`, or it'll slide down as you fill.
3. Excel treats the blank row as the end of the list. Sort, filter, the fill-handle double-click and later Tables and PivotTables all stop at the gap, so part of your data silently gets left out.
4. The cells contain **text**, not numbers. They might look like numbers, but they're stored as text, often because of a stray space or because the data came from an export. You'll learn to fix this in Week 4.
5. `=ROUND(I2/60,1)`

**Weekend answers:** 1) Primary Packing, 49 events · 2) Primary Packing, 660 min · 3) 110 minor stops, 955 min · 4) Nights, 1080 min vs Days 851 · 5) LD-EOL-016, 5 times · 6) 976 / 1931 = **50.5 %**. Half the time lost came from 14 breakdowns, and the other half from 110 small stops. That's a good thing to notice: the minor stops add up.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 2 to 7 and 11 to 17 (save as `.xlsx`, freeze headers, check the status bar, sort, filter to breakdowns) and Session 2 steps 1, 2 and 7 to 17 (`SUM`, the fill handle, the `$I$127` fix and the `IF` column). Then answer the six weekend handover questions, even if roughly.
- **On your phone (10 min a day):** Watch the Leila Gharani video on absolute and relative references, read both "Why it works" parts, and go through the Check yourself questions in your head.
- **Safe to skip this week:** The shortcut practice (Session 1 steps 8 to 10), the hour-long Kevin Stratvert walkthrough, the ExcelJet shortcuts list and the weekend tidy-up (fill colours, borders, decimals) can all wait.

---

## Tick off

- [ ] Saved the CSV as `.xlsx` with frozen headers and filters
- [ ] Used the status bar to check a total
- [ ] Wrote `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `IF`
- [ ] Used `$` to lock a reference and know why
- [ ] Answered all six handover questions
