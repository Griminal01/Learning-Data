# Week 3: Structured Tables and XLOOKUP

**Phase 1 · Advanced Excel & Power Query** · Mon 16 Nov – Sun 22 Nov 2026 · about 5 hours

**Phase 1 goal:** stop hand-editing spreadsheets. By Week 8 you'll drop a new export into a folder, press *Refresh All*, and the whole PM compliance workbook updates itself.

This week you meet the two features that make that possible: **Tables**, which grow automatically, and **XLOOKUP**, which joins information from one list onto another. Every CMMS export is missing something you need, like asset criticality or PM frequency, and XLOOKUP is how you bring it in.

**By Sunday you'll be able to:**

- turn a range into a named Table and use structured references like `[@Minutes]`
- use `XLOOKUP` to pull asset and PM details into a work order list
- handle "not found" results cleanly
- calculate days late and asset age with date arithmetic

**Files:** `data/exports/work_orders/WO_Export_2026-06.csv` (one month of work orders, 394 rows), `data/csv/assets.csv` (292 assets) and `data/csv/pm_tasks.csv` (475 PM routines).

---

## Session 1 (1.5 h): Tables

### Do it

1. Open a new blank workbook and save it as `week03_lookups.xlsx`.
2. Open `WO_Export_2026-06.csv`, select all, copy it, and paste it into `A1` of a sheet called `WOs`. Do the same for `assets.csv` → sheet `Assets` and `pm_tasks.csv` → sheet `PMs`.
3. On the `WOs` sheet, click any cell in the data and press **`Ctrl+T`** → tick *My table has headers* → OK.
4. **Name the Table** (this matters): with a cell selected, go to Table Design → Table Name and type `tblWO`. Do the same for the other two sheets: `tblAssets` and `tblPM`.
5. Try out what a Table gives you:
   - Scroll down. The column letters are replaced by your headers.
   - Table Design → tick **Total Row**. In the total under *Labour Hrs*, pick *Sum* from the drop-down: **316.16** hours in June.
   - Type anything in the first empty row below the Table. The Table grows to include it. Press `Ctrl+Z` to undo.
6. **Structured references.** In the first empty column to the right of the Table, type the header `Labour Mins`. In the cell below it, type `=` and then click the *Labour Hrs* cell in the same row. Excel writes `=[@[Labour Hrs]]`. Finish it as `=[@[Labour Hrs]]*60` and press Enter. The formula fills the whole column by itself.

### Why it works

A Table is a list that Excel **knows** is a list. It knows where the list starts and ends, and what each column is called. So:

- formulas that refer to `tblWO[Labour Hrs]` always cover the whole column, however many rows you add, so you never need to update `I2:I125` again
- calculated columns fill automatically and stay consistent
- PivotTables, charts and Power Query that point at the Table grow with it

`[@Column]` means "this row's value in Column". `tblWO[Column]` means "the whole column". Everything from here on uses Tables.

---

## Session 2 (1.5 h): XLOOKUP

### Do it

The export has the asset code but not the manufacturer, install date or PM frequency. You'll bring those in.

1. Add a column to `tblWO` called `Manufacturer`:

   ```
   =XLOOKUP([@Asset], tblAssets[asset_id], tblAssets[manufacturer])
   ```

   Read it as: *look for this row's Asset in the asset_id column, and return the matching manufacturer.*
2. Add `Install Date` the same way, returning `tblAssets[install_date]`. Format the column as a date. (If it shows text like `2018-12-01`, that's fine for now. Week 4 deals with it.)
3. Add `PM Frequency (days)`:

   ```
   =XLOOKUP([@[PM Ref]], tblPM[pm_id], tblPM[frequency_days], "")
   ```

   The fourth argument is what to return **if not found**. Reactive jobs have no PM Ref, so without it you'd get a column full of `#N/A`.
4. Add `Days Late` for PM rows:

   ```
   =IF(OR([@[WO Type]]<>"PM", [@Completed]=""), "", [@Completed]-[@Due])
   ```

   A positive number means late, and zero or negative means on time.
5. Add `Asset Age (yrs)`: `=ROUND((DATE(2026,6,30)-[@[Install Date]])/365.25,1)`.
6. **Look something up the other way.** On a new sheet, type `WO-111700` in `A1`. In `B1`, return the asset description for that work order. In `C1`, return its failure code. (Hint: XLOOKUP can return from any column; it doesn't care which side of the lookup column it's on.)

### Why it works

`XLOOKUP(lookup_value, lookup_array, return_array, [if_not_found], [match_mode], [search_mode])`

It's the modern replacement for `VLOOKUP`. You'll still see VLOOKUP in old spreadsheets at work, so here's why XLOOKUP is better:

| | VLOOKUP | XLOOKUP |
|---|---|---|
| Return column | counted by number (breaks if you insert a column) | points at the actual column |
| Look left | no | yes |
| Exact match by default | no (you must add `FALSE`) | yes |
| Not-found value | wrap in `IFERROR` | built in |

The idea that matters more than the function is the **key**. `asset_id` uniquely identifies an asset, so it can link the work order list to the asset list. Phase 2 is all about keys, and this is your first taste.

---

## Weekend build (2 h): June work order fact sheet

Build a `Summary` sheet that uses formulas pointing at the Table columns (`tblWO[...]`) to answer:

1. How many work orders of each type (PM, Reactive, Corrective)?
2. Total labour hours by zone for Reactive work only.
3. How many PMs were completed late, and what was the average days late of those?
4. Which manufacturer's assets had the most work orders?
5. How many June work orders were on assets installed after 1 July 2024 (new kit)?

Then **test that it's robust**: copy 10 rows from `WO_Export_2026-05.csv` and paste them directly under the last row of `tblWO`. The Table should grow, the calculated columns should fill, and your Summary totals should all change. If any didn't, that formula was pointing at a fixed range. Fix it, then undo the paste.

---

## Watch

- **Leila Gharani**: *"Leila Gharani Excel tables"* and *"Leila Gharani XLOOKUP"*.
- **Excel Campus**: *"Excel Campus structured references"*.
- **Microsoft Support**: search *"XLOOKUP function Microsoft Support"* for the official page with examples.

---

## Check yourself

1. Write a formula that returns the zone **code** (e.g. `PPK`) for an asset, using `tblAssets`.
2. Your XLOOKUP returns `#N/A` for asset `ld-ppk-005`, but `LD-PPK-005` exists. Why, and what's the quick fix?
3. What's the difference between `tblWO[Labour Hrs]` and `[@[Labour Hrs]]`?
4. Write a single formula that counts PM work orders in `tblWO` that were completed late. (Use your `Days Late` column.)
5. Why is a Table better than `A1:P395` as the source for a chart you'll update monthly?

<details>
<summary><strong>Answers</strong></summary>

1. `=XLOOKUP([@Asset], tblAssets[asset_id], tblAssets[zone_code])`
2. Actually, XLOOKUP isn't case-sensitive, so case alone won't cause it. The real culprit is usually **hidden spaces** (`" LD-PPK-005"`) or different separators (`LDPPK005`). Use `=XLOOKUP(TRIM([@Asset]), …)` for spaces. Week 4 covers cleaning properly.
3. `tblWO[Labour Hrs]` is the whole column (use it in `SUM`, `COUNTIFS` and so on). `[@[Labour Hrs]]` is the value on the current row (use it in calculated columns).
4. `=COUNTIFS(tblWO[WO Type],"PM",tblWO[Days Late],">0")`
5. The Table grows with new rows, so the chart picks up new data automatically. A fixed range has to be edited by hand every month, and someone always forgets.

**Weekend reference numbers (June 2026):**

| Question | Answer |
|---|---|
| WO types | PM 336 · Reactive 47 · Corrective 11 (total 394) |
| Reactive labour by zone | add up `Labour Hrs` with `SUMIFS`; the total is 86.44 h |
| Late PMs | 30, averaging 5.6 days late (worst 18 days) |
| Most WOs by manufacturer | Northgate (69) |
| New-kit WOs | 19 |

For `WO-111700`: *End of Line Case packer 3*, failure code *Operational - jam*.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 4 and 6 (three named Tables and one structured reference), Session 2 steps 1 to 5 (the XLOOKUP columns, Days Late, Asset Age), and the weekend Summary sheet for questions 1 to 3 followed by the "paste more rows" test.
- **On your phone (10 min a day):** Watch the Leila Gharani Excel tables and XLOOKUP videos, read the VLOOKUP versus XLOOKUP table in "Why it works", and answer Check yourself questions 2, 3 and 5 in your head.
- **Safe to skip this week:** Session 2 step 6 (the `WO-111700` lookup), Session 1 step 5 (trying out the Total Row) and weekend questions 4 and 5 can be skipped; the Tables and XLOOKUP pattern are what later weeks need.

---

## Tick off

- [ ] Three named Tables: `tblWO`, `tblAssets`, `tblPM`
- [ ] XLOOKUP columns for manufacturer, install date and PM frequency, with no `#N/A`
- [ ] Days Late and Asset Age calculated
- [ ] Summary sheet survives the "paste more rows" test
