# Week 1: Excel basics, your first look at downtime data

**Phase 0 · Foundations** · Mon 2 Nov – Sun 8 Nov 2026 · about 5 hours

You're starting from scratch, so this week is about getting comfortable: opening a data file, moving around it quickly, and getting Excel to do sums for you. Nothing here is hard, but everything later is built on it.

**By Sunday you'll be able to:**

- open a CSV file and save it as a proper Excel workbook
- sort, filter and freeze headers so a big list is easy to read
- write formulas with `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT` and `IF`
- explain the difference between `A1`, `$A$1` and `A$1`, and why it matters

**You need:** Excel (Microsoft 365) and the file `data/week01/shift_downtime_log.csv` from this repo. To get the files, open the repo on GitHub, click the green **Code** button, then **Download ZIP**, and unzip it somewhere like `Documents\Learning-Data`.

---

## Session 1 (1.5 h): Find your way around

### Do it

1. Double-click `shift_downtime_log.csv`. It opens in Excel. This is two weeks of downtime from a fictional cereal line, the same kind of log a shift team fills in.
2. **Save it as a workbook straight away:** File → Save As → choose *Excel Workbook (\*.xlsx)* → name it `week01_downtime.xlsx`. A CSV can't hold formulas, formatting or extra sheets, so always save a working copy as `.xlsx`.
3. **Make it readable.**
   - Select all (`Ctrl+A`), then on the Home tab choose Format → AutoFit Column Width.
   - Click cell `A2`, then View → Freeze Panes → *Freeze Panes*. Now the headers stay put when you scroll.
   - Make row 1 bold (`Ctrl+B`).
4. **Learn to move fast.** Try each of these and watch where the cursor lands:
   - `Ctrl+↓` jumps to the bottom of the data, `Ctrl+↑` jumps back up.
   - `Ctrl+Home` goes to A1, and `Ctrl+End` goes to the last used cell.
   - `Ctrl+Shift+↓` selects from where you are down to the bottom.
5. **Use the status bar.** Click the column letter **I** (Minutes). Look at the bottom-right of the window: Excel shows Average, Count and Sum. Right-click the status bar and tick Minimum and Maximum as well.
   - You should see **Sum 1931**, **Average ≈ 15.6**, **Count 125** (124 rows plus the header), **Min 2**, **Max 177**.
6. **Sort.** Click any cell in the Minutes column, then go to Data → Sort Largest to Smallest. The top row is the worst stop: a vacuum pump bearing in Forming, 177 minutes.
7. **Filter.** Data → Filter. Little arrows appear in the headers. Filter **Category** to *Breakdown* only. Select column I again and check the status bar: **14 breakdowns, 976 minutes.** Clear the filter afterwards (Data → Clear).

### Why it works

Excel stores data in a **grid of cells**: columns are letters, rows are numbers, so `I2` is column I, row 2. A data file like this is a **list**: one header row, then one row per event, with no gaps. Sort, filter and the status bar all work by detecting that list, so **a blank row or column in the middle breaks them.** Keep lists solid.

The status bar is the quickest sanity check in Excel. Before trusting any formula, select the column and see if the sum looks right.

---

## Session 2 (1.5 h): Formulas and cell references

### Do it

1. Go to the first empty cell under the Minutes column (`I126`, since the data ends on row 125). Type `=SUM(I2:I125)` and press Enter. You get **1931**.
2. In the cells below, add:

   | Cell | Type this | Result |
   |---|---|---|
   | H127 | `Average` | |
   | I127 | `=AVERAGE(I2:I125)` | 15.57… |
   | H128 | `Longest` | |
   | I128 | `=MAX(I2:I125)` | 177 |
   | H129 | `Shortest` | |
   | I129 | `=MIN(I2:I125)` | 2 |
   | H130 | `Events` | |
   | I130 | `=COUNT(I2:I125)` | 124 |

3. **Add a calculated column.** In `J1` type `Hours`. In `J2` type `=I2/60` and press Enter. Now copy it down: select `J2`, then double-click the tiny square at the bottom-right corner of the cell (the *fill handle*). Excel fills the formula to the bottom of the data.
4. Click `J3` and look at the formula bar. It says `=I3/60`, not `=I2/60`. Excel moved the reference down one row for you. That's a **relative reference**.
5. **Percent of total.** In `K1` type `% of total`. In `K2` type `=I2/I126` and fill down. The results go wrong straight away: `K3` divides by `I127`, `K4` by `I128`… The total moved too.
   - Fix it: in `K2` type `=I2/$I$126` and fill down again. The `$` signs lock the reference. Now every row divides by the total.
   - Format column K as a percentage: Home → `%` button.
6. **Your first decision formula.** In `L1` type `Long stop?`. In `L2` type:

   ```
   =IF(I2>=30,"Long","Short")
   ```

   Fill it down. Filter column L to *Long*: you should get **12 rows**.

### Why it works

Every formula starts with `=`. When you copy a formula, Excel shifts its references by the same amount you moved, which is why copying down "just works" most of the time.

| Reference | Copy down | Copy across | Use it for |
|---|---|---|---|
| `I2` | changes row | changes column | row-by-row calculations |
| `$I$126` | stays | stays | a single fixed cell like a total or a target |
| `I$126` | stays | changes column | a header row you look across |
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

- **Must do (about 90 min at a PC):** Session 1 steps 2, 3, 5 and 7 (save as `.xlsx`, freeze headers, check the status bar, filter to breakdowns) and Session 2 steps 1, 3, 5 and 6 (`SUM`, the fill handle, the `$I$126` fix and the `IF` column). Then answer the six weekend handover questions, even if roughly.
- **On your phone (10 min a day):** Watch the Leila Gharani video on absolute and relative references, read both "Why it works" parts, and go through the Check yourself questions in your head.
- **Safe to skip this week:** The hour-long Kevin Stratvert walkthrough, the ExcelJet shortcuts list and the weekend tidy-up (fill colours, borders, decimals) can all wait.

---

## Tick off

- [ ] Saved the CSV as `.xlsx` with frozen headers and filters
- [ ] Used the status bar to check a total
- [ ] Wrote `SUM`, `AVERAGE`, `MIN`, `MAX`, `COUNT`, `IF`
- [ ] Used `$` to lock a reference and know why
- [ ] Answered all six handover questions
