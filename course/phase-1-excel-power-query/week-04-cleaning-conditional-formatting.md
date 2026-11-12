# Week 4: Cleaning messy data and formula-based conditional formatting

**Phase 1 · Advanced Excel & Power Query** · Mon 23 Nov – Sun 29 Nov 2026 · about 5 hours

Real exports are messy. Someone types `ld-ppk-005`, another person types `LD PPK 005`, a zone gets abbreviated, labour gets entered as `1.5h`. Every one of those breaks a lookup or a total without warning you. This week you learn to **find** mess, **fix** it with formulas, and **highlight** problems automatically.

**By Sunday you'll be able to:**

- spot dirty data quickly (filters, `COUNTIF` checks, `ISNUMBER`)
- clean text with `TRIM`, `UPPER`, `SUBSTITUTE`, `CLEAN` and `VALUE`
- remove duplicates safely
- write conditional formatting rules **with formulas**, such as highlighting a whole row if a PM is overdue

**File:** `data/dirty/wo_export_q1_2026_dirty.csv`. This is January to March 2026, deliberately broken. The clean version is the three monthly exports `WO_Export_2026-01/02/03.csv`, so you can check your work against them.

---

## Session 1 (1.5 h): Find the mess

### Do it

1. Open the dirty file and copy everything into a new workbook, `week04_cleaning.xlsx`, on a sheet called `Raw`.
2. Make it a Table (`Ctrl+T`) and name it `tblRaw` (Table Design → Table Name).
3. **Profile it before touching anything.** Add a sheet called `Checks`.
4. **Row count.** On `Checks`, type `Rows` in `A1` and `=ROWS(tblRaw)` in `B1`.

   **You should see:** 1,499.
5. **Unique WO numbers.** Type `Unique WOs` in `A2` and `=COUNTA(UNIQUE(tblRaw[WO Number]))` in `B2`.

   **You should see:** 1,470. So there are 29 duplicate rows.

**Checkpoint:** on `Checks`, `B1` says 1,499 and `B2` says 1,470.

6. **Zone spellings.** In `D1`, type `=UNIQUE(tblRaw[Zone])`. This *spills* a list of every distinct value down the column.

   **You should see:** *Prim Pack*, *EOL*, *end of line*, and *Primary Packing* with a trailing space, among others.
7. **Use filters to look.** On `Raw`, click the filter arrow on the Asset column and scroll through its list.

   **You should see:** lower-case codes, codes with spaces, and codes with no dashes.
8. **Find numbers stored as text.** Add a column to `tblRaw` called `Labour OK?` with `=ISNUMBER([@[Labour Hrs]])`.
9. Filter `Labour OK?` to FALSE.

   **You should see:** `1.5h`-style entries and blanks. Clear the filter when you've looked.
10. **Find impossible combinations.** Add a column called `Status Check`:

    ```
    =IF(AND([@Status]="Completed",[@Completed]=""),"Completed but no date","")
    ```
11. Count them. On `Checks`, type `No date` in `A3` and `=COUNTIF(tblRaw[Status Check],"Completed but no date")` in `B3`.

    **You should see:** 44.

### If your numbers don't match

- **`ROWS` isn't 1,499.** The Table doesn't cover all the data. Click in it, go to Table Design → Resize Table, and check the range ends on row 1500. If only part of the file was copied, copy it again with `Ctrl+A`.
- **`#NAME?` on `ROWS`, `UNIQUE` or `COUNTIF`.** The Table isn't called `tblRaw` (step 2).
- **`#SPILL!` in `D1`.** Something is in the cells below `D1`. Clear them and the list appears.
- **The No date count isn't 44.** The text in the formula must match the Status Check column exactly: `"Completed but no date"` (steps 10 and 11).

### Why it works

Messy data rarely throws an error. It just gives you **wrong totals that look right**. `SUMIFS` by zone will quietly skip the ~70 rows spelt "Prim Pack" or "primary packing", and the ~50 "EOL" ones, and your packing figures will be too low. So the habit to build is: **profile first, count everything, and reconcile** (does my cleaned total match the source total?).

`UNIQUE` is a *dynamic array* function: one formula that returns many cells, which "spill" down the sheet. You'll use more of these next week.

---

## Session 2 (1.5 h): Fix it with formulas

### Do it

Add these cleaning columns to `tblRaw`. Never overwrite the raw column: keep raw, add clean. That way you can always see what you changed.

1. **Asset (clean)**:

   ```
   =LET(
     a, UPPER(TRIM([@Asset])),
     b, SUBSTITUTE(a," ","-"),
     IF(MID(b,3,1)="-", b, LEFT(b,2)&"-"&MID(b,3,3)&"-"&RIGHT(b,3))
   )
   ```

   `LET` lets you name steps inside a formula (`a`, `b`). Read it top to bottom: trim the spaces and upper-case, swap spaces for dashes, and if there are no dashes at all, rebuild the code as `LD-XXX-NNN`.
2. Copy `assets.csv` into the workbook on a sheet called `Assets`, and make it a Table called `tblAssets`.
3. **Check it worked.** Add a column to `tblRaw` with:

   ```
   =XLOOKUP([@[Asset (clean)]],tblAssets[asset_id],tblAssets[asset_id],"NOT FOUND")
   ```
4. Filter that column for NOT FOUND.

   **You should see:** no rows. Clear the filter.

**Checkpoint:** filtering the check column for NOT FOUND shows no rows, so every cleaned asset code is in the asset register.

5. **Zone (clean)**: the best fix isn't a clever formula, it's **looking it up from the asset**, which is the trusted source:

   ```
   =XLOOKUP([@[Asset (clean)]],tblAssets[asset_id],tblAssets[zone])
   ```

6. **Labour (clean)**: `=IFERROR(VALUE(SUBSTITUTE([@[Labour Hrs]],"h","")),"")`
7. **Remove duplicates.** Click any cell in `tblRaw`, press `Ctrl+A` twice (data, then headers too), and press `Ctrl+C`.
8. Add a sheet called `Clean`, click `A1`, and paste as values: `Ctrl+Alt+V` → Values → OK.
9. Go to Data → Remove Duplicates, leave all columns ticked, and press OK.

   **You should see:** Excel report 29 duplicates removed and 1,470 left.
10. **Reconcile.** Under the `Labour (clean)` column on the `Clean` sheet, add a `SUM` of the column.

    **You should see:** about 1,124.
11. Open the three clean monthly exports (`WO_Export_2026-01`, `-02` and `-03`) and total their Labour Hrs.

    **You should see:** 1,142.17 across the three.
12. Write the gap down in a note on the `Checks` sheet. The ~18 h difference is the blank labour entries, which can't be recovered. Knowing what you *couldn't* fix is part of the job.

### If your numbers don't match

- **Some rows say NOT FOUND.** Compare the raw Asset in those rows with the `LET` formula in step 1. The usual slip is a missing `TRIM` or `UPPER`.
- **Remove Duplicates found 0.** You pasted formulas, not values. Redo step 8 with `Ctrl+Alt+V` → Values.
- **It removed more than 29.** Some columns were unticked. Press `Ctrl+Z` and redo step 9 with every column ticked.
- **The labour SUM is well under 1,124.** You summed the raw `Labour Hrs` column, where `SUM` skips text like `1.5h`. Sum `Labour (clean)` instead. About 1,124 is right: the 26 blank entries account for the gap to 1,142.17.

### Why it works

The order of operations matters: **trim → standardise case → standardise separators → rebuild structure**. And whenever there's a trusted master list (the asset register), *look values up from it* rather than trying to repair free text. That's the same principle as a CMMS using a pick-list instead of free typing, and it's why data migration projects spend so much time on master data.

---

## Weekend build (2 h): Conditional formatting with formulas

Use the clean June export from Week 3 (`week03_lookups.xlsx`), or reload `WO_Export_2026-06.csv` into a Table.

1. **Highlight whole rows for late PMs.** Select the whole Table body: click the top-left corner of the Table, avoiding the header.
2. Go to Home → Conditional Formatting → New Rule → *Use a formula to determine which cells to format*.

   ![The New Formatting Rule window with Use a formula to determine which cells to format selected](../img/w4-cf-formula-rule.png)
3. Type this formula:

   ```
   =AND($F2="PM",$L2<>"",$L2>$K2)
   ```

   (F = WO Type, K = Due, L = Completed. Adjust the letters to match your sheet.) **The `$` before the column letter is the trick**: it locks the column but lets the row move, so every cell in a row checks the same columns.
4. Click Format, choose a light red fill, and press OK twice.

   **You should see:** whole rows turn red where a PM was completed after its due date.
5. **Highlight PMs not done at all.** Add another formula rule, `=AND($F2="PM",$M2<>"Completed")`, with an amber fill.
6. Go to Conditional Formatting → Manage Rules and move the amber rule *below* the red one.
7. **Data bars on Downtime Mins.** Select that column, then Conditional Formatting → Data Bars.
8. **Not every rule needs a formula.** Select the Criticality column and use Conditional Formatting → Highlight Cells Rules → *Text that Contains* "A".
9. **One more formula rule:** highlight any asset whose code appears more than twice in the month with `=COUNTIF($B:$B,$B2)>2`. These are your repeat offenders.

### If your numbers don't match

- **Every row turns red, or none do.** The formula must point at row 2, the first row of data (`$F2`), and the selection must start on row 2 (step 1).
- **Nothing changes colour at all.** Your columns aren't F, K and L. Click the headers to see which letters hold WO Type, Due and Completed, and change the formula to match (step 3).
- **The Criticality rule colours other columns.** Select only the Criticality column before adding it (step 8).

---

## Watch

- **Leila Gharani**: *"Leila Gharani conditional formatting formula entire row"*.
- **MyOnlineTrainingHub (Mynda Treacy)**: *"MyOnlineTrainingHub clean data Excel"*.
- **ExcelJet**: [exceljet.net/functions/let-function](https://exceljet.net/functions/let-function).

---

## Check yourself

1. Why should you keep the raw column and add a clean column, rather than fixing data in place?
2. A conditional formatting rule `=$L2>$K2` highlights the wrong rows: it's off by one. What's the likely cause?
3. Write a formula that returns TRUE if an asset code is in the correct `LD-XXX-NNN` format. (Hint: check `LEN`, and check the dashes are at positions 3 and 7.)
4. After cleaning, your Primary Packing reactive count goes **up** from 25 to 31. Is that good or bad news?
5. How many distinct assets appear in the Q1 data after cleaning?

<details>
<summary><strong>Answers</strong></summary>

1. You can audit what changed, re-run the cleaning if the rules were wrong, and prove to someone else that your numbers come from the source. Fixing in place destroys the evidence.
2. The rule was written for row 2, but you selected the range starting at row 1 (the header), or the other way round. Excel's formula is relative to the **active cell** of your selection. Select from the first data row and write the formula for that row.
3. `=AND(LEN(A2)=10, MID(A2,3,1)="-", MID(A2,7,1)="-", LEFT(A2,2)="LD")`
4. Good news for the data, bad news for packing. The extra jobs were always there but hidden by bad zone spellings. Any report built on the dirty data was **under-reporting** packing problems.
5. **278**. (Before cleaning, the same assets appear under several spellings, so a naive `UNIQUE` count is much higher.)

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 6 and 8 to 11 (profile the rows, uniques, spellings and text-numbers), Session 2 steps 1 to 12 (clean asset, zone and labour, remove duplicates to 1,470, reconcile and write down the gap), and weekend steps 1 to 4, the whole-row late PM rule. That is a full 90 minutes, so don't stop to polish.
- **On your phone (10 min a day):** Watch the Leila Gharani video on conditional formatting for an entire row, read both "Why it works" parts (profile first and reconcile, then trim, case, separators, structure), and answer Check yourself questions 1, 2 and 4 in your head.
- **Safe to skip this week:** Session 1 step 7 (scrolling the filter drop-downs) and weekend steps 7 to 9 (data bars, the "Text that Contains" rule and the repeat offender rule) can be dropped this week.

---

## Tick off

- [ ] Profiled the raw file: rows, uniques, spellings, text-numbers
- [ ] Asset, zone and labour cleaned with formulas, zero NOT FOUND
- [ ] Duplicates removed (1,470 rows), labour reconciled, and the gap explained
- [ ] Row-highlighting conditional formatting with `$`-locked formulas
