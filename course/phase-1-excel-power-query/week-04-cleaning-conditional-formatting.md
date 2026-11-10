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

1. Open the dirty file, copy everything into a new workbook `week04_cleaning.xlsx` on a sheet `Raw`, and make it a Table called `tblRaw`.
2. **Profile it before touching anything.** Add a sheet `Checks` and work out:
   - Row count: `=ROWS(tblRaw)` gives **1,499**.
   - Unique WO numbers: `=COUNTA(UNIQUE(tblRaw[WO Number]))` gives **1,470**. So there are 29 duplicate rows.
   - Zone spellings: `=UNIQUE(tblRaw[Zone])`. This *spills* a list of every distinct value. You'll see *Prim Pack*, *EOL*, *end of line* and *Primary Packing* with a trailing space…
3. **Use filters to look.** Turn on the filter on the Asset column and scroll the drop-down list. You'll see lower-case codes, codes with spaces, and codes with no dashes.
4. **Find numbers stored as text.** Add a column `Labour OK?` with `=ISNUMBER([@[Labour Hrs]])`, then filter it to FALSE. You'll find `1.5h`-style entries and blanks.
5. **Find impossible combinations.** Add `Status Check`:

   ```
   =IF(AND([@Status]="Completed",[@Completed]=""),"Completed but no date","")
   ```

   Count them: **44**.

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
2. **Check it worked**: add a column with `=XLOOKUP([@[Asset (clean)]],tblAssets[asset_id],tblAssets[asset_id],"NOT FOUND")`. (Copy `assets.csv` into the workbook as `tblAssets` first.) Filter for NOT FOUND. You want zero.
3. **Zone (clean)**: the best fix isn't a clever formula, it's **looking it up from the asset**, which is the trusted source:

   ```
   =XLOOKUP([@[Asset (clean)]],tblAssets[asset_id],tblAssets[zone])
   ```

4. **Labour (clean)**: `=IFERROR(VALUE(SUBSTITUTE([@[Labour Hrs]],"h","")),"")`
5. **Remove duplicates**: copy the whole Table to a new sheet `Clean` (paste as values: `Ctrl+Alt+V` → Values). Then Data → Remove Duplicates → tick all columns. Excel should report 29 removed, leaving **1,470**.
6. **Reconcile**: total `Labour (clean)` on the Clean sheet. Then open the three clean monthly exports and total their Labour Hrs (**1,142.17**). Yours will be about **1,124**. The ~18 h gap is the blank labour entries, which can't be recovered. Write that down: knowing what you *couldn't* fix is part of the job.

### Why it works

The order of operations matters: **trim → standardise case → standardise separators → rebuild structure**. And whenever there's a trusted master list (the asset register), *look values up from it* rather than trying to repair free text. That's the same principle as a CMMS using a pick-list instead of free typing, and it's why data migration projects spend so much time on master data.

---

## Weekend build (2 h): Conditional formatting with formulas

Use the clean June export from Week 3 (`week03_lookups.xlsx`), or reload `WO_Export_2026-06.csv` into a Table.

1. **Highlight whole rows for late PMs.** Select the whole Table body (click the top-left corner of the Table, avoiding the header). Go to Home → Conditional Formatting → New Rule → *Use a formula to determine which cells to format*:

   ```
   =AND($F2="PM",$L2<>"",$L2>$K2)
   ```

   (F = WO Type, K = Due, L = Completed. Adjust the letters to match your sheet.) Choose a light red fill. **The `$` before the column letter is the trick**: it locks the column but lets the row move, so every cell in a row checks the same columns.
2. **Highlight PMs not done at all**: `=AND($F2="PM",$M2<>"Completed")` with an amber fill. Put this rule *below* the red one in Manage Rules.
3. **Data bars on Downtime Mins**: select the column → Conditional Formatting → Data Bars.
4. **Icon sets for criticality**: not every rule needs a formula. Try Conditional Formatting → Highlight Cells Rules → *Text that Contains* "A" on the Criticality column.
5. **One more formula rule**: highlight any asset whose code appears more than twice in the month: `=COUNTIF($B:$B,$B2)>2`. These are your repeat offenders.

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

- **Must do (about 90 min at a PC):** Session 1 steps 1, 2, 4 and 5 (profile the rows, uniques, spellings and text-numbers), Session 2 steps 1 to 6 (clean asset, zone and labour, remove duplicates to 1,470, reconcile and write down the gap), and weekend step 1, the whole-row late PM rule. That is a full 90 minutes, so don't stop to polish.
- **On your phone (10 min a day):** Watch the Leila Gharani video on conditional formatting for an entire row, read both "Why it works" parts (profile first and reconcile, then trim, case, separators, structure), and answer Check yourself questions 1, 2 and 4 in your head.
- **Safe to skip this week:** Session 1 step 3 (scrolling the filter drop-downs) and weekend steps 3 to 5 (data bars, the "Text that Contains" rule and the repeat offender rule) can be dropped this week.

---

## Tick off

- [ ] Profiled the raw file: rows, uniques, spellings, text-numbers
- [ ] Asset, zone and labour cleaned with formulas, zero NOT FOUND
- [ ] Duplicates removed (1,470 rows), labour reconciled, and the gap explained
- [ ] Row-highlighting conditional formatting with `$`-locked formulas
