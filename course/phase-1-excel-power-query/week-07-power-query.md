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

1. Make a new workbook, `week07_powerquery.xlsx`.
2. Data → Get Data → From File → **From Folder**.
3. Browse to `data\exports\work_orders` → Open.

   **You should see:** a list of the CSV files in the folder.
4. Click **Combine → Combine & Transform Data**.
5. Leave the first file picked as the sample → OK. The **Power Query Editor** opens.
6. **Look around the editor.** Find the **Queries** pane on the left and the data preview in the middle.
7. Find **Applied Steps** on the right. Every click you make becomes a step here. Click an earlier step to see the data at that point, then click the last step again.
8. Find the `Source.Name` column (the filename). Keep it for now; it's handy for checking.
9. **Remove Excel's guess.** In Applied Steps, click the ✕ next to the last step, *Changed Type*. That's Excel guessing the types, and it can read UK dates as US ones. You'll set them yourself.
10. **Dates, UK style.** Right-click the `Raised` heading → Change Type → **Using Locale…** → Data Type: *Date/Time*, Locale: *English (United Kingdom)* → OK.
11. Do the same for `Due` and `Completed`, with Data Type *Date*.
12. Right-click `Labour Hrs` → Change Type → **Decimal Number**.
13. Right-click `Downtime Mins` → Change Type → **Whole Number**.

    **You should see:** no `Error` cells in the date columns. If Excel asks whether to replace the current step, pick **Replace current**.
14. In the Query Settings pane on the right, rename the query to `WorkOrders`.
15. **Home → Close & Load.**

    **You should see:** a green Table with 11,902 rows. The Queries & Connections pane shows the count.

### Why it works

Power Query separates **what you want** (the steps) from **the data** (the files). Refreshing re-runs every step on whatever files are in the folder *now*. Under the hood each step is a line of the **M language**. View → Advanced Editor shows it. You don't need to write M, but it's worth seeing that it's just a recipe.

**Locale matters.** `03/02/2026` is 3 February in the UK and 2 March in the US. Setting the type *using locale* removes the ambiguity regardless of whose PC refreshes the file.

---

## Session 2 (1.5 h): Clean, merge, add columns

### Do it

1. Open the editor again: Data → Queries & Connections → double-click `WorkOrders`.
2. **`Is PM` column.** Add Column → **Conditional Column**. Name it `Is PM`: if `WO Type` equals `PM` then `1`, else `0` → OK.
3. **`On Time` column.** Add Column → **Custom Column**. Name it `On Time` and type:

   ```
   if [WO Type] = "PM" and [Completed] <> null and [Completed] <= [Due] then 1 else 0
   ```

   M is case-sensitive: `null`, `and`, `if … then … else` must be lower case.
4. **`Due Month` column.** Click the `Due` heading → Add Column → Date → Month → **Start of Month**.
5. Double-click the new column's heading and rename it `Due Month`.
6. Home → **Close & Load**.
7. **Import the asset register.** Data → Get Data → From Text/CSV → `assets.csv` → **Transform Data**.
8. Rename the query `Assets`.
9. Home → Close & Load **To…** → **Only Create Connection** → OK. (You don't need it on a sheet.)
10. Do steps 7 to 9 again for `pm_tasks.csv`, naming the query `PMTasks`.
11. **Merge PM details into WorkOrders** (this is XLOOKUP in Power Query). Open `WorkOrders` in the editor → Home → **Merge Queries**.
12. Choose `PMTasks` in the second drop-down. Click `PM Ref` in the top table and `pm_id` in the bottom one. Join Kind: **Left Outer** → OK.

    **You should see:** a new column full of the word *Table*.
13. Click the expand icon (↔) on that column's heading. Tick only `frequency_days` and `task_type`, untick **Use original column name as prefix** → OK.
14. **Merge the asset details.** Home → Merge Queries → `Assets`, matching `Asset` to `asset_id`, Left Outer → OK.
15. Expand it and keep only `manufacturer`, `asset_type` and `install_date`, with no prefix.
16. Home → **Close & Load**.

    **You should see:** still 11,902 rows. If the count went up, your lookup table had duplicate keys. Always check the row count after a merge.

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

1. Data → Get Data → From Text/CSV → `zone_downtime_by_week_wide.csv` → **Transform Data**.
2. Look at it: one row per zone and **a column per week**. It reads fine to a person, but it's terrible for analysis. You can't easily filter by date, and next week's data adds a column, not a row.
3. Right-click the `Zone` heading → **Unpivot Other Columns**.

   **You should see:** three columns: `Zone`, `Attribute` (the week header) and `Value`.
4. Rename `Attribute` to `Week` and `Value` to `Downtime Mins`.
5. Click the `Week` heading → Transform → **Replace Values**. Value to find: `w/c ` (with the space). Replace with: nothing → OK.
6. Right-click `Week` → Change Type → Using Locale → *Date*, *English (United Kingdom)* → OK.
7. Home → **Close & Load**.

   **You should see:** 182 rows (7 zones × 26 weeks).
8. Add a total under the Table, or use `=SUM()` on the `Downtime Mins` column.

   **You should see:** 26,837 minutes.
9. Click in the Table → Insert → PivotChart → Line. Put `Week` on the axis, `Zone` in *Legend*, and `Downtime Mins` in *Values*.

### Parameters

10. Open the Power Query Editor → Home → Manage Parameters → **New Parameter**.
11. Name: `FolderPath`. Type: *Text*. Current Value: your full folder path, e.g. `C:\Users\YourName\Documents\Learning-Data\data\exports\work_orders` → OK.
12. Click the `WorkOrders` query → click its **Source** step in Applied Steps.
13. In the formula bar, replace the typed-in path (and its quotes) with `FolderPath`, so it reads `= Folder.Files(FolderPath)` → Enter.

    **You should see:** the same data as before, with no errors.
14. Manage Parameters → New Parameter → Name: `ReportDate`, Type: *Date*, Current Value: `30/06/2026` → OK.
15. Click `WorkOrders` → Add Column → Custom Column → name it `Overdue`:

    ```
    if [WO Type] = "PM" and [Completed] = null and [Due] < ReportDate then 1 else 0
    ```

16. Close & Load. Now if you move the folder, or want to report "as at" another date, you change one value.

### Final test

17. Copy `WO_Export_2026-06.csv` and rename the copy `WO_Export_TEST.csv`, in the same folder.
18. Data → **Refresh All**.

    **You should see:** the row count jumps by 394, to 12,296.
19. Delete `WO_Export_TEST.csv` and Refresh All again.

    **You should see:** back to 11,902. **That's the whole point of this week.**

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

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 15 (From Folder, UK locale types, 11,902 rows), Session 2 steps 3 and 7 to 16 (the `On Time` column, the Assets and PMTasks merges with the row count unchanged), then weekend steps 1 to 8 (the unpivot to 182 rows) and 10 to 19 (both parameters and the drop-a-file test). That is more than 90 minutes, so split it across two sittings if you need to, but don't drop any of it: Week 8 is built on this.
- **On your phone (10 min a day):** Watch the Leila Gharani Power Query beginner and combine-from-folder videos, read the "Why it works" parts on locale and on join kinds, and answer all five Check yourself questions in your head.
- **Safe to skip this week:** Session 2 steps 2, 4 and 5 (the `Is PM` and `Due Month` columns), the weekend step 9 line chart after the unpivot and the *M Is for (Data) Monkey* book can all wait.

---

## Tick off

- [ ] All 24 files combined from a folder, 11,902 rows, correct UK dates
- [ ] PM frequency and asset details merged in, with the row count unchanged
- [ ] Wide sheet unpivoted to 182 rows
- [ ] `FolderPath` and `ReportDate` parameters working
- [ ] "Drop a file in, Refresh All" test passed
