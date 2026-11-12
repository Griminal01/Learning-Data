# Week 5: Dynamic arrays, LET and LAMBDA

**Phase 1 · Advanced Excel & Power Query** · Mon 30 Nov – Sun 6 Dec 2026 · about 5 hours

Old Excel worked one cell at a time. Modern Excel can return a whole list from **one formula**: an overdue list, a top-10 or a calendar, and it updates the moment the data changes. This is how you build "live" report sheets without PivotTables or copy-pasting.

**By Sunday you'll be able to:**

- use `FILTER`, `UNIQUE`, `SORT`, `SORTBY`, `TAKE` and `SEQUENCE`
- reference a spilled range with `#`
- tidy long formulas with `LET`
- write your own reusable function with `LAMBDA`

**File:** your `week03_lookups.xlsx` with `tblWO` (June 2026). If you don't have it, load `WO_Export_2026-06.csv` into a Table called `tblWO`.

---

## Session 1 (1.5 h): FILTER, UNIQUE, SORT

### Do it

1. Open `week03_lookups.xlsx` and add a new sheet called `Live`.
2. **Every PM not completed in June.** In `A3`, type:

   ```
   =FILTER(tblWO[[WO Number]:[Asset Description]], (tblWO[WO Type]="PM")*(tblWO[Status]<>"Completed"))
   ```

   **You should see:** 37 rows spill out. One formula, a whole report.
3. **Make a zone list for a drop-down.** In a spare cell, `Z1`, type `=SORT(UNIQUE(tblWO[Zone]))`.

   **You should see:** the zone names spill down from `Z1`.
4. **Add the drop-down.** Click `B1` → Data → Data Validation → Allow: *List* → Source: `=$Z$1#` → OK. (Validation can't use a formula that spills, but it can point at a spill with `#`.)
5. Pick *Primary Packing* in `B1`.
6. **Filter by the drop-down.** Change the formula in `A3` to add a third condition and an "if empty" message:

   ```
   =FILTER(tblWO[[WO Number]:[Asset Description]],
     (tblWO[WO Type]="PM")*(tblWO[Status]<>"Completed")*(tblWO[Zone]=B1),
     "Nothing outstanding")
   ```

   **You should see:** 9 rows for Primary Packing.
7. Pick a few other zones in `B1` and watch the list change.
8. **Top 5 downtime jobs.** In an empty area to the right, type:

   ```
   =TAKE(SORTBY(tblWO[[WO Number]:[Asset Description]], tblWO[Downtime Mins], -1), 5)
   ```

   **You should see:** the top row is `LD-EOL-016`, End of Line Conveyor 6, with 253 minutes.
9. **The `#` reference.** In any empty cell, type `=ROWS(Z1#)`.

   **You should see:** 7. `Z1#` means "the whole spill, however big it is today".

### Why it works

`FILTER(array, include, [if_empty])`: the *include* part is a column of TRUE/FALSE values. **Multiplying** conditions means AND (TRUE×TRUE = 1, anything×FALSE = 0). **Adding** them means OR. That's the same Boolean logic as series and parallel contacts on a PLC rung.

If the spill area isn't empty, you get `#SPILL!`. Clear the cells in the way.

---

## Session 2 (1.5 h): LET, SEQUENCE and a live calendar

### Do it

1. **SEQUENCE warm-up.** On a scratch sheet, try `=SEQUENCE(10)`, then `=SEQUENCE(1,7)`, then `=SEQUENCE(5,7,1,1)`. Delete them when you've seen what each does.
2. Add a new sheet called `Calendar`.
3. **30 days of June.** In `A2`, type `=SEQUENCE(30,1,DATE(2026,6,1),1)`.
4. Format `A2:A31` as dates (Home → Number Format → Short Date).

   **You should see:** 01/06/2026 down to 30/06/2026.
5. **PMs due each day.** In `B2`, type:

   ```
   =COUNTIFS(tblWO[WO Type],"PM",tblWO[Due],A2#)
   ```

   **You should see:** 30 counts spill down, one per day. Because `A2#` is a list, `COUNTIFS` returns a list too. This is called **lifting**.
6. **PMs completed each day.** In `C2`, type:

   ```
   =COUNTIFS(tblWO[WO Type],"PM",tblWO[Due],A2#,tblWO[Status],"Completed")
   ```

7. Type headers in row 1: `Date`, `Due`, `Completed`.
8. Select `A1:C31` → Insert → Line chart.
9. **On-time compliance with LET.** In an empty cell, type:

   ```
   =LET(
     isPM,   tblWO[WO Type]="PM",
     due,    SUM(--isPM),
     ontime, SUM(isPM*(tblWO[Completed]<>"")*(tblWO[Completed]<=tblWO[Due])),
     ontime/due
   )
   ```

   Each name is defined once and used later. The `--` turns TRUE/FALSE into 1/0.
10. Format the cell as %.

    **You should see:** about 80 %.

> Note: this counts PMs **raised** in June (that's what the export contains). Proper compliance counts PMs **due** in the period, which needs several months of data combined. You'll do that properly with Power Query in Week 7.

### Why it works

`LET(name1, value1, name2, value2, …, result)` works like declaring tags before the logic. It makes long formulas readable, and faster too, because each step is calculated once.

---

## Weekend build (2 h): Your own functions with LAMBDA

1. Go to Formulas → Name Manager → **New**.
2. Name it `ZONECODE`. In *Refers to*, type `=LAMBDA(asset, MID(asset,4,3))` → OK.
3. In any cell, type `=ZONECODE("LD-PPK-005")`.

   **You should see:** `PPK`. Your function now works anywhere in the workbook.
4. Name Manager → New → name `DAYSLATE`, refers to:

   ```
   =LAMBDA(due, done, IF(OR(due="",done=""), "", done-due))
   ```

5. Name Manager → New → name `ONTIME` (TRUE if done is on or before due), refers to:

   ```
   =LAMBDA(due, done, AND(done<>"", due<>"", done<=due))
   ```

6. Test `DAYSLATE` and `ONTIME` on a row of `tblWO`, e.g. `=DAYSLATE(tblWO[@Due],tblWO[@Completed])` in a cell next to the Table.
7. **`CLEANASSET`.** Name Manager → New → name `CLEANASSET`. This is last week's asset-cleaning formula wrapped in a `LAMBDA`:

   ```
   =LAMBDA(asset, LET(
     a, UPPER(TRIM(asset)),
     b, SUBSTITUTE(a," ","-"),
     IF(MID(b,3,1)="-", b, LEFT(b,2)&"-"&MID(b,3,3)&"-"&RIGHT(b,3))
   ))
   ```

8. Test it on `"ld ppk 005"`, `" LD-PPK-005 "` and `"LDPPK005"`.

   **You should see:** `LD-PPK-005` all three times.
9. **Build a Live summary panel.** Add a sheet called `Panel`. You'll fill it using only dynamic array formulas.
10. Copy the zone drop-down and the outstanding-PMs FILTER from Session 1 onto `Panel`.
11. Copy the top 5 downtime formula (TAKE + SORTBY) onto `Panel`.
12. **Assets with a breakdown this month.** Type:

    ```
    =SORT(UNIQUE(FILTER(tblWO[Asset],tblWO[WO Type]="Reactive")))
    ```

    **You should see:** 44 assets.

**Bonus:** if your Excel has `GROUPBY` (newer Microsoft 365 builds do), try `=GROUPBY(tblWO[Zone], tblWO[Downtime Mins], SUM)`. It's a PivotTable in one formula.

---

## Watch

- **Leila Gharani**: *"Leila Gharani FILTER function"* and *"Leila Gharani LAMBDA"*.
- **ExcelJet**: [exceljet.net/articles/dynamic-array-formulas-in-excel](https://exceljet.net/articles/dynamic-array-formulas-in-excel).
- **Excel Off The Grid**: *"Excel Off The Grid LET function"*.

---

## Check yourself

1. Write a FILTER that returns Reactive work orders in June with more than 60 downtime minutes.
2. How do you write OR logic inside FILTER? Give the include argument for "Reactive OR Corrective".
3. What causes `#SPILL!` and how do you fix it?
4. Write a formula that returns the **3** most frequent failure codes in June. (Hint: `UNIQUE`, then `COUNTIF` against it, then `SORTBY` and `TAKE`.)
5. Why is a LAMBDA in Name Manager better than copying the same long formula into 20 sheets?

<details>
<summary><strong>Answers</strong></summary>

1. `=FILTER(tblWO, (tblWO[WO Type]="Reactive")*(tblWO[Downtime Mins]>60))`
2. `(tblWO[WO Type]="Reactive")+(tblWO[WO Type]="Corrective")`. Use `+` for OR.
3. Something is already in the cells the result wants to spill into, or the result is inside a Table (spills aren't allowed in Tables). Clear the cells or move the formula outside the Table.
4. ```
   =LET(fc, UNIQUE(FILTER(tblWO[Failure Code], tblWO[Failure Code]<>"")),
        n,  COUNTIF(tblWO[Failure Code], fc),
        TAKE(SORTBY(HSTACK(fc,n), n, -1), 3))
   ```
   Top three in June: *Mechanical - belt/chain* (13), *Electrical - sensor* (9), *Mechanical - bearing* (8). These counts include Corrective rows as well as Reactive, because both carry a failure code. Filter to Reactive only and belt/chain drops to 9.
5. One definition, one place to fix. If you change the rule (say, on time now means within 2 days of due), you edit it once and every sheet updates. It's the same reason you'd use a subroutine or an AOI in a PLC instead of copying the same logic onto 20 rungs.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 2 to 8 (FILTER with the zone drop-down and "Nothing outstanding", then the top 5 with TAKE and SORTBY), Session 2 steps 2 to 10 (the SEQUENCE calendar with its chart and the LET compliance formula), and weekend steps 1 to 6 for three LAMBDA functions.
- **On your phone (10 min a day):** Watch the Leila Gharani FILTER and LAMBDA videos, read the "Why it works" note on multiplying for AND and adding for OR, and answer Check yourself questions 2, 3 and 5 in your head.
- **Safe to skip this week:** The Session 2 step 1 SEQUENCE warm-up, weekend steps 7 and 8 (`CLEANASSET`), the steps 9 to 12 Live summary panel and the `GROUPBY` bonus can all be left for another week.

---

## Tick off

- [ ] FILTER with a zone drop-down and an "if empty" message
- [ ] Top-5 list with TAKE + SORTBY
- [ ] SEQUENCE-driven June calendar with a chart
- [ ] Compliance calculated with LET
- [ ] At least three LAMBDA functions in Name Manager
