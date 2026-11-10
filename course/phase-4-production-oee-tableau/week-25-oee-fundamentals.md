# Week 25: OEE fundamentals, from shift data to one honest number

**Phase 4 · Production data: OEE, Redzone & Tableau** · Mon 19 Apr – Sun 25 Apr 2027 · about 5 hours

**Phase 4 goal:** speak the production team's language. Your production team runs on **Redzone**: OEE, downtime and losses, viewed in **Tableau**. Maintenance runs on the CMMS (**Mainsaver**, moving to **Ultimo**). The person who can connect those two worlds, *"this much of our lost OEE is maintenance, and it's these assets"*, is rare and valuable. This phase makes you that person.

This week is the foundation: what OEE actually measures, how to calculate it correctly from raw shift data, and the aggregation mistake that makes most OEE spreadsheets wrong.

**By Sunday you'll be able to:**

- define planned production time, availability, performance, quality and OEE
- calculate OEE for one shift by hand, and for many shifts correctly (sum first, then divide)
- build an OEE **minute bridge** (waterfall) from planned time down to fully productive time
- write down your own site's OEE definitions, which is the most important thing to do this week

**Data:** `data/production/shifts.csv`, 1,460 shifts of Line D (Days 06:00–18:00, Nights 18:00–06:00, crews A–D, four SKUs). It's synthetic, in the shape of what a production system like Redzone records per shift.

---

## Session 1 (1.5 h): One shift, by hand

### The definitions

```
Shift time (720 min)
 └ minus planned stops (breaks, planned sanitation)  →  Planned production time
     └ minus downtime (breakdowns, changeovers, minor stops, waiting) →  Run time            ← Availability = Run ÷ Planned
         └ minus speed loss (running slower than ideal)            →  Net run time        ← Performance = (Total count × ideal cycle time) ÷ Run
             └ minus quality loss (rejects, rework, start-up waste)  →  Fully productive time ← Quality = Good ÷ Total
```

**OEE = Availability × Performance × Quality = fully productive time ÷ planned production time.**

The second form, **good count × ideal cycle time ÷ planned time**, is the most robust. It's one division, and it works even when different products have different ideal rates.

### Do it

Open `shifts.csv` in Excel (save it as `week25_oee.xlsx` and make it a Table, `tblShifts`). Look at the first row, `S00001`:

| planned_production_min | downtime_min | run_min | ideal_rate_ppm | total_count | good_count |
|---|---|---|---|---|---|
| 690 | 47 | 643 | 75 | 38,451 | 37,981 |

By hand, or in cells:

- Availability = 643 ÷ 690 = **93.2 %**
- Performance = 38,451 ÷ (643 × 75) = **79.7 %**: it ran at about 80 % of ideal speed while running
- Quality = 37,981 ÷ 38,451 = **98.8 %**
- **OEE = 73.4 %**. Check it the other way: 37,981 ÷ 75 = 506.4 fully productive minutes, and 506.4 ÷ 690 = 73.4 %.

Add calculated columns to `tblShifts` for A, P, Q and OEE.

### Why it works

Each factor isolates one kind of loss, so you know **where** to look. Low A means stops. Low P means slow running or short stops that aren't being logged. Low Q means waste. One OEE number on its own tells you how much, not why.

---

## Session 2 (1.5 h): Many shifts, and the aggregation trap

### Do it

1. **The wrong way:** `=AVERAGE(tblShifts[OEE])`, which gives **70.2 %** over two years.
2. **The right way:** sum the minutes and counts first, then divide:

   ```
   =SUMPRODUCT(tblShifts[good_count]/tblShifts[ideal_rate_ppm]) / SUM(tblShifts[planned_production_min])
   ```

   That gives **70.3 %**. Then A = `SUM(run)/SUM(planned)` = **83.3 %**, P = **86.1 %**, Q = **98.1 %**.

The two answers are close here, because every shift is about the same length. Now see why it matters. Imagine two shifts:

| Shift | Planned min | OEE |
|---|---|---|
| Full shift | 690 | 80 % |
| Short Sunday shift after a deep clean | 60 | 10 % |

The average of the two OEEs is 45 %. The true OEE is (552 + 6) ÷ 750 = **74 %**. Averaging percentages gives a tiny, unusual period the same weight as a full one. **Always aggregate the underlying minutes and counts, never the percentages.** The same rule applies in pivots, Power BI and Tableau.

3. **H1 2026** (filter `production_date` ≥ 1 Jan 2026): A **85.2 %**, P **86.0 %**, Q **98.1 %**, **OEE 71.9 %**.
4. **By shift**: Days 71.8 %, Nights 72.0 %. **By SKU** (all data): from 69.8 % (Wheat Biscuits 24s) to 70.9 % (Wheat Biscuits 48s). The differences are small. Hold back from blaming a crew or a product on a 1-point gap; Phase 6 gives you the tests to check whether it's real.

---

## Weekend (2 h): The minute bridge, and your site's definitions

### Build the waterfall for H1 2026

| Step | Minutes | How |
|---|---|---|
| Planned production time | **243,540** | `SUM(planned_production_min)` |
| − Availability loss (downtime) | 36,146 | `SUM(downtime_min)` |
| − Speed loss | 28,989 | `SUM(run_min − total_count ÷ ideal_rate)` |
| − Quality loss | 3,350 | `SUM(reject_count ÷ ideal_rate)` |
| = Fully productive time | **175,055** | 175,055 ÷ 243,540 = **71.9 %** ✅ |

Insert → Chart → **Waterfall** in Excel. Title it with the finding. Notice that **speed loss (29k min) is nearly as big as all downtime (36k)**. It's invisible on a downtime Pareto, and it's often where the easiest gains are.

### At work: write down your site's OEE rules (don't export anything yet)

Open your Redzone / Tableau OEE dashboard and find out, from the dashboard notes or by asking the CI or production lead:

1. What counts as a **planned stop** (excluded from OEE)? Breaks? Cleans? Planned maintenance? Changeovers?
2. What's the **ideal or target rate** for each SKU, and who sets it? (A lowered target hides speed loss.)
3. Is there a **minimum stop length**? Short stops below it often get counted as speed loss instead of downtime.
4. Where are **counts** taken: the wrapper, the case packer or the palletiser? Rejects from where?
5. Is OEE shown per **line**, per **machine**, or both?

Write the answers in a one-page **"OEE definitions"** note. Without it, your numbers and Redzone's will never match, and everyone will argue about the numbers instead of the losses.

---

## Watch

- Search *"OEE explained availability performance quality"* and pick a 10–15 minute explainer.
- Search *"six big losses OEE"* (next week's topic, so a head start).
- Read [oee.com](https://www.oee.com), a clear free reference site on OEE calculation and the six big losses.

---

## Check yourself

1. A shift has 690 planned minutes, 90 minutes of downtime, ideal rate 100 ppm, 48,000 packs made, and 47,000 good. Work out A, P, Q and OEE.
2. Why is "good count × ideal cycle time ÷ planned time" the safest OEE formula?
3. Your manager averages the seven daily OEE figures to get a weekly OEE. What's wrong, and when does it matter most?
4. Why can lowering a product's "target rate" make OEE look better without anything improving?

<details>
<summary><strong>Answers</strong></summary>

1. Run = 600, so A = 600/690 = **87.0 %**. P = 48,000 / (600 × 100) = **80.0 %**. Q = 47,000/48,000 = **97.9 %**. OEE = **68.1 %**. Check: 47,000/100 = 470 min, and 470/690 = 68.1 %.
2. It's one ratio of totals, with no averaging of percentages, and it handles mixed SKUs with different ideal rates correctly.
3. Days with very different planned time get equal weight. A half-day Sunday counts as much as a full Monday. It matters most when periods differ a lot in length (weekends, short weeks, line trials). Sum the minutes and counts for the week instead.
4. Performance = actual ÷ (run time × ideal rate). Lowering the "ideal" rate raises performance on paper. That's why the ideal rate should be the machine's design or demonstrated best rate, and why you need to know your site's definition.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1's A, P, Q and OEE columns in `tblShifts` (73.4 % for `S00001`), Session 2 steps 1 to 3 (the wrong average against the right sum-then-divide, then H1 2026 at 71.9 %), and the weekend H1 2026 minute bridge as a waterfall chart.
- **On your phone (10 min a day):** Watch an "OEE explained" video, read oee.com and both "Why it works" parts, and work Check yourself question 1 on paper. At work, ask the five weekend questions about planned stops, ideal rates, minimum stop length, count points and line versus machine, and write your one-page OEE definitions note.
- **Safe to skip this week:** Session 2 step 4 (OEE by shift and by SKU) and the "six big losses" head-start video can be skipped this week.

---

## Tick off

- [ ] A, P, Q and OEE calculated for one shift by hand (73.4 %)
- [ ] Line OEE calculated correctly from totals (70.3 % overall, 71.9 % H1 2026)
- [ ] Can explain why averaging OEE percentages is wrong
- [ ] H1 2026 minute bridge as a waterfall chart
- [ ] One-page note of your site's OEE definitions
