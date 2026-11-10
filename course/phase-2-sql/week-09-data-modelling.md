# Week 9: Data modelling, how a CMMS stores its data

**Phase 2 · Data modelling & SQL** · Mon 28 Dec 2026 – Sun 3 Jan 2027 · about 5 hours (New Year week, so go easy)

**Phase 2 goal:** answer *"which 10 assets lost the most hours to reactive work last quarter, and were their PMs on time?"* in **one query**.

Most self-taught analysts skip this phase, and it's why their dashboards break. Every maintenance system (and nearly every business system) stores data in **related tables**, not one big spreadsheet. Once you understand how, you'll understand your CMMS, you'll be useful on any system migration, and Power BI will make far more sense.

**By Sunday you'll be able to:**

- explain *grain*, *primary key*, *foreign key*, *fact* and *dimension*
- draw the Line D data model as a star schema
- create tables with keys in SQLite and import CSV data into them
- open the database in DB Browser and browse it

**Install:** DB Browser for SQLite from [sqlitebrowser.org](https://sqlitebrowser.org/dl/). Pick the Windows *Standard installer* (64-bit). It's free and needs no server.

---

## Session 1 (1.5 h): Explore a real model

### Do it

1. Open DB Browser → **Open Database** → `data/line_d.db`.
2. **Database Structure** tab: expand each table and look at its columns. There are five tables: `zones`, `assets`, `pm_tasks`, `work_orders` and `downtime_events`.
3. **Browse Data** tab: look through each table. For every one, answer on paper:
   - What does **one row** represent? (This is the *grain*.)
   - Which column **uniquely identifies** a row? (This is the *primary key*.)
   - Which columns **point at another table**? (These are *foreign keys*.)
4. Draw the model on paper: a box per table, and lines between the key columns. Mark each line `1` at one end and `*` (many) at the other.
5. Open the **Execute SQL** tab, type the line below, and press `Ctrl+Return`:

   ```sql
   SELECT * FROM assets LIMIT 10;
   ```

   That's your first SQL query. You'll learn it properly next week.

### Why it works

| Table | Grain (one row is…) | Primary key | Foreign keys | Type |
|---|---|---|---|---|
| `zones` | one zone | `zone_code` | | dimension |
| `assets` | one asset | `asset_id` | `zone_code` → zones | dimension |
| `pm_tasks` | one PM routine on one asset | `pm_id` | `asset_id` → assets | dimension |
| `work_orders` | one work order | `wo_id` | `asset_id` → assets, `pm_id` → pm_tasks | **fact** |
| `downtime_events` | one stoppage | `event_id` | `asset_id` → assets, `wo_id` → work_orders | **fact** |

- **Facts** are things that *happen*: jobs, stops, readings. They're long (thousands of rows) and have numbers you add up (hours, minutes).
- **Dimensions** *describe* things: assets, zones, dates. They're short and have text you group by.
- A **star schema** puts facts in the middle with dimensions around them. Power BI is designed for exactly this shape.

Why not one big table? If every work order row carried the asset's zone, name and criticality, then changing an asset's criticality would mean editing hundreds of rows, and one missed row means a wrong report. Storing each fact once and *relating* it is called **normalisation**.

---

## Session 2 (1.5 h): Build the database yourself

You'll rebuild `line_d.db` from the CSVs, so you understand every part of it.

### Do it

1. DB Browser → **New Database** → save as `my_cmms.db` (in your own folder, not `data/`).
2. Close the table-creation dialog that pops up, then go to **Execute SQL** and run:

   ```sql
   CREATE TABLE zones (
       zone_code TEXT PRIMARY KEY,
       zone      TEXT NOT NULL
   );

   CREATE TABLE assets (
       asset_id     TEXT PRIMARY KEY,
       asset_name   TEXT NOT NULL,
       zone_code    TEXT NOT NULL REFERENCES zones(zone_code),
       asset_type   TEXT,
       criticality  TEXT CHECK (criticality IN ('A','B','C')),
       manufacturer TEXT,
       install_date TEXT
   );

   CREATE TABLE pm_tasks (
       pm_id            TEXT PRIMARY KEY,
       asset_id         TEXT NOT NULL REFERENCES assets(asset_id),
       task_description TEXT,
       task_type        TEXT,
       frequency_days   INTEGER,
       est_minutes      INTEGER
   );
   ```

3. Write the `CREATE TABLE` for `work_orders` and `downtime_events` **yourself**, using the column list in `data/README.md` and the keys in the table above. Then check your version against the answer below.
4. **Import the data**: File → Import → Table from CSV file → `data/csv/zones.csv`. Tick *Column names in first line*, set the table name to `zones` (the existing one), and confirm that you want to add to the existing table. Repeat for each CSV **in this order**: zones, assets, pm_tasks, work_orders, downtime_events.
5. **Write Changes** (`Ctrl+S`). SQLite doesn't save until you do.
6. Check the counts:

   ```sql
   SELECT 'assets', COUNT(*) FROM assets
   UNION ALL SELECT 'work_orders', COUNT(*) FROM work_orders
   UNION ALL SELECT 'downtime_events', COUNT(*) FROM downtime_events;
   ```

   You should get **292**, **11,902** and **6,177**.

### Why the import order matters

A foreign key says *"this value must exist in that table"*. You can't record a work order against an asset that doesn't exist yet, so parents (zones, assets) go in before children (work orders). That's also how a CMMS stops you raising a job on a non-existent asset.

> **Blank vs NULL.** CSV imports bring empty cells in as empty text `''`, not `NULL`. The provided `line_d.db` uses proper `NULL`s. To fix yours, run `UPDATE work_orders SET completed_date = NULL WHERE completed_date = '';` and the same for `pm_id`, `due_date`, `failure_code`, `technician` and `shift`. Then use `line_d.db` for the rest of the phase so your answers match the lessons.

---

## Weekend task (2 h): Model your own world

1. In `data/README.md`, read the data dictionary for every table.
2. Draw the **star schema** neatly (paper, PowerPoint or [draw.io](https://app.diagrams.net) are all fine): facts in the middle, dimensions around them, `1` and `*` on every line. Add a **Calendar** dimension. Which columns in the facts would connect to it?
3. **Design exercise.** Line D is getting vibration sensors. Design a table `sensor_readings` for them: decide its grain, primary key, foreign keys and columns, and write its `CREATE TABLE`. Then design `technicians` (a dimension) and work out what changes in `work_orders`.
4. Think about your real CMMS at work (don't export anything). What do you think its asset, work order and PM tables look like? Which fields are free text that *should* be pick-lists?

---

## Watch

- **Alex The Analyst**: *"Alex the Analyst SQL basics"*. Start this series now; it carries into next week.
- **Lucidchart**: *"Lucidchart what is an entity relationship diagram"*, a clear ERD explainer.
- **Guy in a Cube**: *"Guy in a Cube star schema"*. It's the Power BI view of the same idea, and you'll meet it again in Phase 3.

---

## Check yourself

1. What's the grain of `downtime_events`?
2. Why is `wo_id` sometimes empty in `downtime_events`?
3. Can one asset have many PM tasks? Can one PM task belong to many assets? What does that make the relationship?
4. Is `labour_hours` a fact or a dimension attribute? What about `criticality`?
5. Write the `CREATE TABLE` for `work_orders`.

<details>
<summary><strong>Answers</strong></summary>

1. One stoppage of one asset (start, end and duration).
2. Minor stops are cleared by operators and don't get a work order. Breakdowns do. That makes it an **optional** foreign key, and it's why you'll need a `LEFT JOIN` to keep minor stops in your results.
3. Yes, and no (in this model each routine is for one asset). So it's **one-to-many**: assets 1 → * pm_tasks.
4. `labour_hours` is a **fact** measure: it lives on the work order and you add it up. `criticality` is a **dimension** attribute: it describes the asset, and you group or filter by it.
5. ```sql
   CREATE TABLE work_orders (
       wo_id           TEXT PRIMARY KEY,
       asset_id        TEXT NOT NULL REFERENCES assets(asset_id),
       pm_id           TEXT REFERENCES pm_tasks(pm_id),
       wo_type         TEXT,
       priority        INTEGER,
       description     TEXT,
       failure_code    TEXT,
       raised_datetime TEXT,
       due_date        TEXT,
       completed_date  TEXT,
       status          TEXT,
       labour_hours    REAL,
       technician      TEXT,
       shift           TEXT
   );

   CREATE TABLE downtime_events (
       event_id       TEXT PRIMARY KEY,
       asset_id       TEXT NOT NULL REFERENCES assets(asset_id),
       wo_id          TEXT REFERENCES work_orders(wo_id),
       start_datetime TEXT,
       end_datetime   TEXT,
       duration_min   INTEGER,
       category       TEXT,
       cause          TEXT
   );
   ```
   SQLite stores dates as text in `YYYY-MM-DD` format. That sorts and compares correctly, which is why ISO format is used everywhere.

**Design exercise (one good answer):** `sensor_readings(reading_id PK, sensor_id FK → sensors, reading_datetime, rms_velocity_mm_s, peak_accel_g, temp_c)` plus a `sensors(sensor_id PK, asset_id FK → assets, location, sensor_type)` dimension. The grain is one reading from one sensor at one time.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 3 (grain, primary key and foreign keys for all five tables, on paper) and Session 2 steps 1 to 6 (build `my_cmms.db`, import in parent-first order, Write Changes, check 292 / 11,902 / 6,177), then run the NULL fix and switch to `line_d.db`.
- **On your phone (10 min a day):** Watch the Lucidchart ERD explainer and the Guy in a Cube star schema video, read the grain table and "Why the import order matters", and sketch the star schema with a Calendar plus your `sensor_readings` and `technicians` designs on paper. Weekend step 4, thinking about your real CMMS, fits a break at work.
- **Safe to skip this week:** Writing the `work_orders` and `downtime_events` CREATE TABLE fully from scratch (Session 2 step 3, copy it from the answer if you're tired) and a neat draw.io version of the star schema can be skipped; a paper sketch is fine.

---

## Tick off

- [ ] DB Browser installed, `line_d.db` explored
- [ ] Grain, PK and FK identified for all five tables
- [ ] Built `my_cmms.db` from CSVs, with matching row counts
- [ ] Star schema drawn, including Calendar
- [ ] Designed `sensor_readings` and `technicians`
