# Week 7: Power Query, import, clean and combine automatically

**Phase 1 · Advanced Excel & Power Query** · Mon 14 Dec – Sun 20 Dec 2026 · about 5 hours

This is the most important week of Phase 1. **Power Query** records your cleaning steps once and replays them on every refresh. Last week you copied and pasted three files together. This week you'll combine all 24 monthly exports in one go, and next month's file will be picked up just by dropping it in the folder.

The same tool is built into Power BI, so everything you learn here carries straight into Phase 3.

**By Sunday you'll be able to:**

- import a whole folder of CSVs as one table
- set data types correctly, including UK dates
- clean columns (trim, replace, split, conditional columns)
- **merge** (look up) and **append** (stack) queries
- **unpivot** a wide sheet into a proper list
- use a **parameter** so the folder path or report date lives in one place

**Files:** the whole folder `data/exports/work_orders/` (24 files, July 2024 to June 2026), `data/csv/assets.csv`, `data/csv/pm_tasks.csv` and `data/week07/zone_downtime_by_week_wide.csv`.

---

## Session 1 (1.5 h): Import from Folder

### Do it

1. New workbook `week07_powerquery.xlsx`. Go to Data → Get Data → From File → **From Folder** → browse to `data\exports\work_orders` → Open.
2. Excel shows the file list. Click **Combine → Combine & Transform Data**, pick the first file as the sample → OK. The **Power Query Editor** opens.
3. Look around the editor:
   - **Queries** pane on the left
   - the data preview in the middle
   - **Applied Steps** on the right. Every click you make becomes a step here. Click an earlier step to see the data at that point.
4. You'll see a `Source.Name` column (the filename). Keep it for now; it's handy for checking.
5. **Set data types properly:**
   - Select `Raised` → right-click → Change Type → **Using Locale…** → *Date/Time*, *English (United Kingdom)*. Do the same for `Due` and `Completed` with type *Date*.
   - `Labour Hrs` → Decimal Number. `Downtime Mins` → Whole Number.
   - **Delete** any automatic *Changed Type* step that ran before yours if it turned dates into errors (it can happen when the sample file guessed US dates).
6. Rename the query (right pane, Properties) to `WorkOrders`.
7. **Home → Close & Load**. A green Table appears with **11,902 rows**. Check the row count in the Queries & Connections pane.

### Why it works

Power Query separates **what you want** (the steps) from **the data** (the files). Refreshing re-runs every step on whatever files are in the folder *now*. Under the hood each step is a line of the **M language**. View → Advanced Editor shows it. You don't need to write M, but it's worth seeing that it's just a recipe.

**Locale matters.** `03/02/2026` is 3 February in the UK and 2 March in the US. Setting the type *using locale* removes the ambiguity regardless of whose PC refreshes the file.

---

## Session 2 (1.5 h): Clean, merge, add columns

### Do it

Open the editor again (Data → Queries & Connections → double-click `WorkOrders`).

1. **Add a custom column** `Is PM`: Add Column → Conditional Column → if `WO Type` equals `PM` then `1` else `0`.
2. **Add a column** `On Time` (Add Column → Custom Column):

   ```
   if [WO Type] = "PM" and [Completed] <> null and [Completed] <= [Due] then 1 else 0
   ```

   (M is case-sensitive: `null`, `and`, `if … then … else`.)
3. **Due Month**: select `Due` → Add Column → Date → Month → **Start of Month**. Rename it `Due Month`.
4. **Import the asset register**: Data → Get Data → From Text/CSV → `assets.csv` → **Transform Data**. Name it `Assets`. Then Close & Load To… → **Only Create Connection** (you don't need it on a sheet).
5. Do the same for `pm_tasks.csv` → query `PMTasks`, connection only.
6. **Merge** (this is XLOOKUP in Power Query): in `WorkOrders`, go to Home → Merge Queries → choose `PMTasks` → click `PM Ref` in the top table and `pm_id` in the bottom → Join Kind **Left Outer** → OK. A new column of nested tables appears. Click its expand icon (↔) → tick only `frequency_days` and `task_type` → untick *Use original column name as prefix*.
7. Merge `Assets` on `Asset` = `asset_id` and bring in `manufacturer`, `asset_type` and `install_date`.
8. Close & Load. Still **11,902 rows**. (If the count went up, your lookup table had duplicate keys. Always check the row count after a merge.)

### Why it works

**Merge** puts tables side by side by matching a key, which is the same idea as XLOOKUP but done once for the whole table, and it can bring back several columns. **Append** stacks tables with the same columns on top of each other. From Folder is really an automatic append of every file.

Join kinds are a big idea that comes back in SQL (Phase 2):

| Join | Keeps |
|---|---|
| Left Outer | all rows from the first table, and matches from the second if they exist |
| Inner | only rows that match in both |
| Left Anti | rows in the first table with **no** match, which is great for finding orphans |

---

## Weekend build (2 h): Unpivot and parameters

### Unpivot

1. Get Data → From Text/CSV → `zone_downtime_by_week_wide.csv` → Transform. Look at it: one row per zone, and **a column per week**. It looks fine to a person, but it's terrible for analysis. You can't easily filter by date, and next week's data adds a column, not a row.
2. Select the `Zone` column → right-click → **Unpivot Other Columns**. You get `Attribute` (the week header) and `Value`.
3. Rename them `Week` and `Downtime Mins`. Clean `Week`: Transform → Replace Values `w/c ` with nothing → Change Type Using Locale → Date (UK).
4. Load it. You should have **182 rows** (7 zones × 26 weeks), and the minutes should total **26,837**. Make a PivotChart: line chart of downtime by week, one line per zone.

### Parameters

1. In the editor: Home → Manage Parameters → New → Name `FolderPath`, Type *Text*, Current Value = your full folder path, e.g. `C:\Users\Josh\Documents\Learning-Data\data\exports\work_orders`.
2. Open the `WorkOrders` query's **Source** step (the gear icon or the formula bar) and replace the hard-coded path with `FolderPath`. In the formula bar it becomes `= Folder.Files(FolderPath)`.
3. Create a second parameter `ReportDate`, type *Date*, value `30/06/2026`. Add a custom column `Overdue` to `WorkOrders`:

   ```
   if [WO Type] = "PM" and [Completed] = null and [Due] < ReportDate then 1 else 0
   ```

4. Now if you move the folder, or want to report "as at" another date, you change one value.

**Final test:** copy `WO_Export_2026-06.csv`, rename the copy `WO_Export_TEST.csv`, put it in the folder and Refresh All. The row count should jump by 394. Delete the test file and refresh again to get back to 11,902. **That's the whole point of this week.**

---

## Watch

- **Leila Gharani**: *"Leila Gharani Power Query beginner"* and *"Leila Gharani combine files from folder"*.
- **MyOnlineTrainingHub**: *"MyOnlineTrainingHub unpivot Power Query"*.
- **Microsoft Learn**: search *"Power Query documentation Microsoft Learn"* for the official reference.
- Book (optional): *M Is for (Data) Monkey* by Ken Puls and Miguel Escobar, the classic Power Query book.

---

## Check yourself

1. Your refreshed query shows errors in the `Due` column for some rows. What's the likely cause, and how do you investigate it?
2. When would you use **Append** instead of **Merge**?
3. You merge `WorkOrders` with `Assets` and the row count rises from 11,902 to 12,050. What happened?
4. How would you find work orders whose asset doesn't exist in the asset register?
5. Why is a "one column per week" layout bad for analysis?

<details>
<summary><strong>Answers</strong></summary>

1. A US-locale type change was applied to UK dates, so 13/01/2026 can't be month 13. Click the column's error count, or use Keep Rows → Keep Errors to see the bad rows, then fix the Change Type step to use the UK locale.
2. **Append** when the tables have the same columns and you want more rows (January + February). **Merge** when you want more columns from a related table (work orders + asset details).
3. The `Assets` table has duplicate `asset_id` values, so some work orders matched twice. Remove duplicates on the key in `Assets` first, then merge again.
4. Merge `WorkOrders` with `Assets` using **Left Anti** join. The result is only the orphans. (With this data you should get zero, but try it on last week's dirty file.)
5. Every new week adds a column, so formulas and charts must be edited; you can't filter or group by date; and tools like PivotTables, Power BI and SQL all expect **one row per observation**. That idea is called *tidy data*.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 7 (From Folder, UK locale types, 11,902 rows), Session 2 steps 2 and 4 to 8 (the `On Time` column, the Assets and PMTasks merges with the row count unchanged), then the weekend unpivot to 182 rows, both parameters and the drop-a-file test. That is more than 90 minutes, so split it across two sittings if you need to, but don't drop any of it: Week 8 is built on this.
- **On your phone (10 min a day):** Watch the Leila Gharani Power Query beginner and combine-from-folder videos, read the "Why it works" parts on locale and on join kinds, and answer all five Check yourself questions in your head.
- **Safe to skip this week:** Session 2 steps 1 and 3 (the `Is PM` and `Due Month` columns), the PivotChart line chart after the unpivot and the *M Is for (Data) Monkey* book can all wait.

---

## Tick off

- [ ] All 24 files combined from a folder, 11,902 rows, correct UK dates
- [ ] PM frequency and asset details merged in, with the row count unchanged
- [ ] Wide sheet unpivoted to 182 rows
- [ ] `FolderPath` and `ReportDate` parameters working
- [ ] "Drop a file in, Refresh All" test passed
