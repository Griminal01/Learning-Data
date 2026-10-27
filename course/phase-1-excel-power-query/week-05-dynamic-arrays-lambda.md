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

Make a new sheet `Live`.

1. **Every PM not completed in June**: in `A3`:

   ```
   =FILTER(tblWO[[WO Number]:[Asset Description]], (tblWO[WO Type]="PM")*(tblWO[Status]<>"Completed"))
   ```

   **37 rows** spill out. You typed one formula and got an entire report.
2. **Filter to one zone with a drop-down.** In `B1`, add a Data Validation list with source `=UNIQUE(tblWO[Zone])`. (Validation can't point at a spill directly, so first put `=SORT(UNIQUE(tblWO[Zone]))` in a spare cell, say `Z1`, and use `=$Z$1#` as the list source.) Now change the formula in `A3` to add a third condition:

   ```
   =FILTER(tblWO[[WO Number]:[Asset Description]],
     (tblWO[WO Type]="PM")*(tblWO[Status]<>"Completed")*(tblWO[Zone]=B1),
     "Nothing outstanding")
   ```

   Pick *Primary Packing*: **9 rows**.
3. **Top 5 downtime jobs**: in a new area:

   ```
   =TAKE(SORTBY(tblWO[[WO Number]:[Asset Description]], tblWO[Downtime Mins], -1), 5)
   ```

   The top row should be `LD-EOL-016`, End of Line Conveyor 6, with 253 minutes.
4. **The `#` reference**: if your UNIQUE zone list spilled from `Z1`, then `=ROWS(Z1#)` returns 7. `Z1#` means "the whole spill, however big it is today".

### Why it works

`FILTER(array, include, [if_empty])`: the *include* part is a column of TRUE/FALSE values. **Multiplying** conditions means AND (TRUE×TRUE = 1, anything×FALSE = 0). **Adding** them means OR. That's the same Boolean logic as series and parallel contacts on a PLC rung.

If the spill area isn't empty, you get `#SPILL!`. Clear the cells in the way.

---

## Session 2 (1.5 h): LET, SEQUENCE and a live calendar

### Do it

1. **SEQUENCE** builds lists of numbers. Try `=SEQUENCE(10)`, then `=SEQUENCE(1,7)`, then `=SEQUENCE(5,7,1,1)`.
2. **A June calendar of PMs due per day**: in a new sheet:
   - `A2`: `=SEQUENCE(30,1,DATE(2026,6,1),1)`, formatted as dates. That's 30 days.
   - `B2`: `=COUNTIFS(tblWO[WO Type],"PM",tblWO[Due],A2#)`

     Because `A2#` is a list, `COUNTIFS` returns a list too: one count per day. This is called **lifting**.
   - `C2`: `=COUNTIFS(tblWO[WO Type],"PM",tblWO[Due],A2#,tblWO[Status],"Completed")`
   - Add a line chart of B and C.
3. **LET for readable formulas.** This calculates on-time PM compliance for June:

   ```
   =LET(
     isPM,   tblWO[WO Type]="PM",
     due,    SUM(--isPM),
     ontime, SUM(isPM*(tblWO[Completed]<>"")*(tblWO[Completed]<=tblWO[Due])),
     ontime/due
   )
   ```

   Each name is defined once and used later. The `--` converts TRUE/FALSE to 1/0. Format as %. You should get about **80 %**.

> Note: this counts PMs **raised** in June (that's what the export contains). Proper compliance counts PMs **due** in the period, which needs several months of data combined. You'll do that properly with Power Query in Week 7.

### Why it works

`LET(name1, value1, name2, value2, …, result)` works like declaring tags before the logic. It makes long formulas readable, and faster too, because each step is calculated once.

---

## Weekend build (2 h): Your own functions with LAMBDA

1. Go to Formulas → Name Manager → New.
   - Name: `ZONECODE`
   - Refers to: `=LAMBDA(asset, MID(asset,4,3))`
2. Now `=ZONECODE("LD-PPK-005")` returns `PPK` anywhere in the workbook.
3. Create `DAYSLATE`:

   ```
   =LAMBDA(due, done, IF(OR(due="",done=""), "", done-due))
   ```

4. Create `ONTIME`, which returns TRUE if done is on or before due:

   ```
   =LAMBDA(due, done, AND(done<>"", due<>"", done<=due))
   ```

5. Create a `CLEANASSET` function from last week's asset-cleaning `LET` formula. Test it on `"ld ppk 005"`, `" LD-PPK-005 "` and `"LDPPK005"`.
6. **Build a "Live" summary panel** on one sheet using only dynamic array formulas:
   - outstanding PMs for the zone picked in a drop-down (FILTER)
   - the top 5 downtime jobs (TAKE + SORTBY)
   - the list of assets that had a breakdown this month: `=SORT(UNIQUE(FILTER(tblWO[Asset],tblWO[WO Type]="Reactive")))` should give **44 assets**

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

## Tick off

- [ ] FILTER with a zone drop-down and an "if empty" message
- [ ] Top-5 list with TAKE + SORTBY
- [ ] SEQUENCE-driven June calendar with a chart
- [ ] Compliance calculated with LET
- [ ] At least three LAMBDA functions in Name Manager
