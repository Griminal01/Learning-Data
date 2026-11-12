# Data Skills Course: Reliability & Industrial Analytics

A 62-week, hands-on course that goes from Excel basics to machine learning, built around one goal: **turning maintenance and production data into better PM decisions.** It covers the tools a food manufacturing site actually runs on: Excel, SQL, Power BI, **Redzone OEE data in Tableau**, the CMMS (**Mainsaver**, moving to **Ultimo**), Python and reliability statistics. Every phase ends with something you could use on a real production line, so the learning pays off as you go, not just at the end.

Everything runs on a realistic **synthetic** data set for a fictional 7-zone cereal line ("Line D"): 292 assets, two years of PMs, breakdowns and downtime, Redzone-style shift and stop records, a CMMS migration example, plus vibration data. It's safe to use at home and safe to show in a public portfolio.

**Start:** Monday 2 November 2026 · **Pace:** about 5 hours a week · **Level:** complete beginner → reliability analyst

---

## Getting started

You only need one link: **https://griminal01.github.io/Learning-Data/**

1. **Open the link on your PC** in Edge or Chrome. A short welcome asks your name and the Monday you start, then shows you round.
2. **Do Week 0: Set up** (about 30 minutes). Today suggests it first. It gets the course files onto your PC, installs the tracker as an app, puts it next to Excel, and makes your first backup.
3. **Start Week 1** from the **Today** tab.

**Updates arrive by themselves.** When the course is improved, the tracker picks up the new version the next time you open it online. Your ticks stay put.

**Your progress is yours.** It's saved in your own browser and nobody else sees it. Once a week, go to **Settings → Export backup**. That file brings everything back if your browser is ever cleared, or moves it to another device (**Import and merge**).

**Stuck on a step?** Press **Confusing?** next to it and say what didn't make sense. **Settings → Steps that confused you → Send on WhatsApp** sends all your notes in one message.

**On your phone too:** open the same link, then Android (Chrome): menu ⋮ → *Install app*, or iPhone (Safari): Share → *Add to Home Screen*. Phone and PC keep separate progress, so carry it across with a backup file. Gist sync (below) does it automatically if you have a GitHub account, but you don't need one.

**Sharing it with someone else?** In the tracker, go to **Settings → Share the course → Send on WhatsApp**. It sends the link with a line on what to do. They get their own copy of the progress, starting from the welcome.

**Just the files.** The course files (the data, your `my_work` folder and the worked solutions) are one ZIP of about 2 MB: [Learning-Data.zip](https://griminal01.github.io/Learning-Data/downloads/Learning-Data.zip). Extract it into `Documents` and you get `Documents\Learning-Data`. Each lesson in the tracker also has a **Files for this week** box that downloads single files.

**Already using the downloaded ZIP?** Your ticks live in that copy. Open it, go to **Settings → Export backup**, then open the link above, skip the welcome tour, and use **Settings → Import and merge** with that file. From then on, use the link.

### Working from the files instead

Click the green **Code** button → **Download ZIP**, unzip it to `Documents\Learning-Data`, and double-click `index.html`. That copy works offline but never updates itself, and it can't be installed on a phone. (From Week 33 you'll switch to `git clone`.)

The full dated schedule is in **[`course/README.md`](course/README.md)**.

---

## The seven phases (plus foundations)

| Phase | Weeks | You'll learn | You'll build | Done when… |
|---|---|---|---|---|
| **0 Foundations** | 1–2 | Excel from zero: formulas, references, SUMIFS, charts | a shift downtime summary | totals reconcile, with a clean chart |
| **1 Excel & Power Query** | 3–8 | Tables, XLOOKUP, dynamic arrays, LAMBDA, pivots, Power Query, Power Pivot | **PM compliance workbook** | a new export + Refresh All updates everything |
| **2 SQL & data modelling** | 9–14 | star schemas, keys, SELECT → JOIN → GROUP BY → CTE → window functions, data quality | **mini CMMS database** | top-10 reactive-loss assets *and* their PM compliance in one query |
| **3 Power BI** | 15–24 | modelling, DAX (CALCULATE, time intelligence), visuals, drill-through, RLS | **Line D maintenance dashboard** | the team could use it without you explaining it |
| **4 OEE, Redzone & Tableau** | 25–32 | OEE and the six big losses, operator-coded downtime, Tableau (calcs, LOD, dashboards, downloads), linking stops to work orders, Mainsaver → Ultimo | **OEE & maintenance impact dashboard** | OEE reconciles to the dashboard, and you show the maintenance share of lost time by asset |
| **5 Python** | 33–42 | Python, pandas, time series, plotting, automation, vibration trending | **automated weekly PM report** | an hour of Excel becomes one command |
| **6 Statistics & reliability** | 43–50 | distributions, tests, regression, SPC, MTBF/MTTR, **Weibull**, RCM, FMEA | **Weibull PM interval study** | you can defend a PM interval change with numbers |
| **7 ML & condition monitoring** | 51–62 | scikit-learn, precision/recall, forests, boosting, anomaly detection, FFT, RUL | **bearing anomaly detector** | you can explain why its alerts are worth acting on, and the false alarm rate |

**How each week works**

- **Session 1 and Session 2** (weekday evenings, 1.5 h each): *Do it* first, then *Why it works*.
- **Weekend** (2 h): practice or the phase build.
- **Watch**: the best free videos for the topic, *after* you've tried it.
- **Check yourself**: questions, with answers hidden in a collapsed section. The tracker turns these into quiz cards.
- **Short on time?**: what you must do at a PC, what you can do on your phone, and what's safe to skip that week.
- **Tick off**: the same items appear in the tracker app.

---

## Doing it day by day

The plan assumes two 1.5-hour evenings and a weekend block, but most weeks won't go like that. The tracker is built for the days when you've only got ten minutes, or only your phone.

- **Today tab.** Pick how long you've got (5, 15, 30 or 60 minutes) and whether you're on your phone or a PC. It suggests one thing to do, plus one or two alternatives, all from the week you're on. On a phone that's quiz cards, a "Why it works" section to read, or a video to watch. On a PC it's the next session, picking up where you left off.
- **Log it in one tap.** When you finish, press **Log 15 min** (or whatever you chose). It goes into the weekly log and its chart, like any other entry.
- **Streak.** Any logged time, or one quiz card, counts as a day. A single card is enough on a busy day.
- **Short on time?** Each lesson has a short box saying what you must do (about 90 minutes at a PC), what works on your phone (about 10 minutes a day), and what's safe to skip. It's shown on Today and at the top of the lesson.
- **Lessons in the app.** Every lesson opens in the app's reader, split into its sessions. Mark each part *Read it* (on the phone) or *Done it* (at the PC). It remembers where you got to in each week. The *Tick off* list in the reader is the same official checklist as the Course tab.
- **Step by step.** In each session, every numbered step has a round tick box, and the step you're on is highlighted with **You are here**. Press **Done → next step** in the bar at the bottom (or the **N** key) to tick it and move on; **Back** (or **B**) unticks the last one. Close the app and come back the next evening: it opens on the same step. **Focus** (or **F**) shows just that step, large, with the one before and after faded, which is handy with the lesson on a second monitor next to Excel.
- **You should see.** Green lines under a step say what Excel should show once you've done it. If yours doesn't match, redo that step before moving on.
- **Check my answer.** On the step you're on, a *You should see* line with a number has a box: type what Excel shows and it tells you whether it matches.
- **Checkpoints and fixes.** Every few steps a blue *Checkpoint* says what you should have by now. At the end of each session (Weeks 1–4 so far), an amber *If your numbers don't match* box lists the usual mistakes and the step each one comes from.
- **Glossary.** Words like *fill handle*, *Table* or *Power Query* are underlined the first time they appear in a section: tap one for a one-line meaning. They live in [`course/glossary.md`](course/glossary.md).
- **Pictures.** Screenshots go in `course/img/` (see its README for the list) and appear in the lesson once they're there.
- **Quiz cards.** The *Check yourself* questions become flash cards. Read the question, think of the answer, tap to check, then press **Got it** or **Again**. Cards you know come back less often (after 1, 3, 7, 14, then 30 days); cards you miss come back tomorrow. Cards unlock as you reach each week.
- **Watch list.** Each video has a button that runs the YouTube search for you, and you can mark it watched.
- **Behind schedule?** Today shows the calendar week next to the week you're actually on. Going at your own pace is fine. If you want the dates to match, move the start date in Settings.

### Put it on your phone

1. Open the tracker link (see *Getting started*) on your phone.
2. **Android (Chrome):** menu ⋮ → *Install app* (or *Add to Home screen*). **iPhone (Safari):** Share → *Add to Home Screen*.
3. It now opens like an app and works with no signal once it has been opened once. It picks up a new version by itself next time you open it online.

### Keep your phone and PC in step

Progress is saved in each browser separately, so you need one of these:

- **Backup file (no setup).** Settings → **Export backup** (or **Share backup** on a phone, to send it to yourself), then on the other device Settings → **Import and merge**. Importing *merges*: it adds what's new and never wipes anything.
- **Automatic sync with a private gist (optional).** Settings → *Sync with a private GitHub gist*. You make a GitHub token that can only touch gists (the app explains how), paste it on each device, and the app keeps your progress in one secret gist on your own account. It pulls when the app opens and pushes a few seconds after each change. The token is stored only in that browser, never in backups. **Turn off sync** deletes it.

Both use the same rule: for each tick, card or entry, the most recent change wins, so something you un-tick on one device stays un-ticked on the other.

---

## What's in this repo

```
course/            Week 0 (set-up) and 62 weekly lessons, one folder per phase, plus the dated schedule
data/              the practice data set (CSV, SQLite, exports, production, migration, vibration) and its generator
  README.md        data dictionary: every table and column explained
solutions/         worked SQL, Python, reliability and ML solutions (all tested against the data)
portfolio/         how to package each phase build for a public GitHub portfolio
my_work/           your own files go here
index.html         Data Skills Studio, the tracker app (hosted on GitHub Pages, or open it by double-click)
app/               the app's script, styles, icons and course-data.js (lessons built for the app)
sw.js, manifest.webmanifest   offline and "install on phone" support when hosted
tools/             build script that syncs the tracker with the lessons, its icon maker and browser tests
requirements.txt   Python libraries for Phases 5-7
```

---

## Ground rules

- **Learn on your home PC.** Work laptops are often locked down. Check with IT before installing anything at work, especially Power BI Desktop.
- **Never take work data home** (CMMS exports, Redzone/Tableau downloads, condition-monitoring data, historian data) without written permission. Use the synthetic data here until you have it.
- **Never open work data in Tableau Public.** It publishes everything to a public website. Use it only with this course's synthetic data.
- **Never connect to a production PLC.** The PLC stretch in Week 42 is for authorised bench or training rigs only.
- **Don't move on until you pass each done-when test.**

---

## Tools you'll need

All free, except Microsoft 365, which you already have.

| Tool | Phase | Get it |
|---|---|---|
| Excel (Microsoft 365) | 0–1 | already installed |
| DB Browser for SQLite | 2 | [sqlitebrowser.org](https://sqlitebrowser.org/dl/) |
| Power BI Desktop | 3 | Microsoft Store |
| Tableau Public | 4 | [public.tableau.com](https://public.tableau.com) (or a Tableau for Students licence via your college, if eligible) |
| Python 3, VS Code, Git | 5–7 | [python.org](https://www.python.org/downloads/), [code.visualstudio.com](https://code.visualstudio.com), [git-scm.com](https://git-scm.com) |

The main free learning resources used throughout are Microsoft Learn (PL-300 path), ExcelJet, Leila Gharani, SQLBolt, Mode SQL Tutorial, SQLBI, Guy in a Cube, Tableau's free training videos, Andy Kriebel, Kaggle Learn, Corey Schafer, *Python for Data Analysis* (free online), *Automate the Boring Stuff* (free online), StatQuest, Khan Academy, the `reliability` library docs, and Andrew Ng's ML Specialization (free to audit).

**Certifications:** **PL-300** (Power BI Data Analyst) at the end of Phase 3 is the one worth paying for. **CMRP** is a reliability credential for later. Ask whether your training budget will cover either.

---

## Hosting the tracker on GitHub Pages

The link in *Getting started* is this repo on GitHub Pages. To set it up (once):

1. Go to the repo's **Settings → Pages → Build and deployment**.
2. Set Source = *Deploy from a branch*, Branch = `main`, folder = `/ (root)`, and press **Save**.
3. After a minute or two, the tracker is live at `https://<your-username>.github.io/<repo-name>/`.

No build step is needed: GitHub Pages serves `index.html`, `app/`, `sw.js` and `manifest.webmanifest` as they are. The empty `.nojekyll` file tells Pages not to run the lessons through Jekyll. Every push to `main` updates the site, and each learner's copy fetches the new version the next time it opens online.

Progress is stored in each learner's own browser (localStorage), so hosting it shares the course, not anyone's ticks.

The build script also makes `downloads/Learning-Data.zip` (the course files, for Week 0) and each week's **Files for this week** list. The ZIP is byte-identical when nothing changed, so git only stores a new copy when the data does. Commit it with your change.

**After editing any lesson** (its title, sections, *Tick off*, *Check yourself*, *Watch* or *Short on time?*), run `python tools/build_tracker.py`. It rebuilds `app/course-data.js`, which is what the app reads, and updates the offline cache version in `sw.js`. It prints how many weeks, ticks, quiz cards and watch items it found, and any lesson where the *Check yourself* questions and answers don't pair up. Commit `app/course-data.js` with your lesson change.

To check the app after changing it, run the browser tests (needs Node and Playwright): `node tools/test_app.js`.

---

## Regenerating the data

```powershell
python data\generate_data.py
```

It uses only the Python standard library. Same seed, same data, so lesson answers always match. See [`data/README.md`](data/README.md) for what's in each file and how the simulation works.
