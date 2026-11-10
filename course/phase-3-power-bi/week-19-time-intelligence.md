# Week 19: DAX 3, time intelligence, variables and USERELATIONSHIP

**Phase 3 · Power BI** · Mon 8 Mar – Sun 14 Mar 2027 · about 5 hours

Every maintenance review asks questions about time: *"How are we doing year to date?"*, *"Better or worse than last year?"*, *"What's the rolling 13-week trend?"* This week you build those measures, and you fix PM compliance so it counts PMs by the date they were **due**.

**By Sunday you'll be able to:**

- use `TOTALYTD`, `SAMEPERIODLASTYEAR`, `DATEADD` and `DATESINPERIOD`
- build rolling 13-week measures
- activate the inactive due-date relationship with `USERELATIONSHIP`
- stop time measures running past the end of the data

**Needs:** the `Calendar` table marked as a date table, with a continuous date range (Week 16).

---

## Session 1 (1.5 h): YTD and last year

### Do it

```dax
Breakdown Hrs YTD = TOTALYTD ( [Breakdown Hrs], Calendar[Date] )

Breakdown Hrs PY = CALCULATE ( [Breakdown Hrs], SAMEPERIODLASTYEAR ( Calendar[Date] ) )

Breakdown Hrs PY YTD = CALCULATE ( [Breakdown Hrs YTD], SAMEPERIODLASTYEAR ( Calendar[Date] ) )

Breakdown Hrs YoY % = DIVIDE ( [Breakdown Hrs YTD] - [Breakdown Hrs PY YTD], [Breakdown Hrs PY YTD] )
```

Build a **matrix** with `Calendar[Year]` and `Calendar[Month Name]` on the rows, and those four measures as values.

**Check:** at **June 2026**, YTD = **266.9 h**, PY YTD = **310.4 h**, YoY = **−14.0 %**. Breakdown hours are down on last year. For single months, May 2026 was 56.7 h vs 51.4 h in May 2025 (worse), and June 2026 was 44.6 h vs 52.7 h (better).

### Why it works

Time intelligence functions **rewrite the date filter**. In the June 2026 cell, the filter is "1–30 June 2026". `TOTALYTD` replaces it with "1 Jan – 30 Jun 2026". `SAMEPERIODLASTYEAR` shifts it to "1–30 June 2025". That's why you need a proper Calendar table: the functions need every date to exist so they can shift and extend ranges.

(If your year doesn't start in January, for example a site financial year starting in April, use `TOTALYTD ( [x], Calendar[Date], "31/3" )`.)

---

## Session 2 (1.5 h): Rolling 13 weeks and the end-of-data problem

### Do it

```dax
Breakdown Hrs R13W =
CALCULATE (
    [Breakdown Hrs],
    DATESINPERIOD ( Calendar[Date], MAX ( Calendar[Date] ), -91, DAY )
)
```

Put `Calendar[Week Commencing]` on the X-axis of a line chart with `[Breakdown Hrs]` and `[Breakdown Hrs R13W]`. The weekly line is spiky, and the rolling line shows the real trend. For the week commencing **22/06/2026**, R13W = **139.4 h**.

**The problem:** put `[Breakdown Hrs R13W]` on a card with no filters. `MAX ( Calendar[Date] )` is **31/12/2026**, because the Calendar runs to year end, but there's no data after June, so the card shows only part of a window (or blank). Fix it by capping at the last date with data:

```dax
Last Data Date = CALCULATE ( MAX ( Downtime[Start Date] ), REMOVEFILTERS ( Calendar ) )

Breakdown Hrs R13W =
VAR EndDate = MIN ( MAX ( Calendar[Date] ), [Last Data Date] )
RETURN
    CALCULATE (
        [Breakdown Hrs],
        DATESINPERIOD ( Calendar[Date], EndDate, -91, DAY )
    )
```

Also hide future periods on charts: add a calculated column `Calendar[Has Data] = Calendar[Date] <= DATE(2026,6,30)` and use it as a visual or page filter. (A better version looks up the max date from the data, but a fixed date is fine for practice.)

### Why `VAR` matters here

`EndDate` is calculated **once, in the original filter context**, before `CALCULATE` changes anything. That's what makes variables more than tidiness: they capture a value *before* the context shifts.

---

## Weekend task (2 h): PM compliance by due date

### USERELATIONSHIP

Right now, the Calendar filters `WorkOrders` by **raised** date. For PM compliance, the question is "of the PMs **due** in June, how many were done on time?"

```dax
PMs Due (by Due Date) =
CALCULATE ( [PMs Due], USERELATIONSHIP ( Calendar[Date], WorkOrders[due_date] ) )

PMs On Time (by Due Date) =
CALCULATE ( [PMs On Time], USERELATIONSHIP ( Calendar[Date], WorkOrders[due_date] ) )

PM Compliance % (Due) = DIVIDE ( [PMs On Time (by Due Date)], [PMs Due (by Due Date)] )
```

**Check, June 2026:**

| Measure | By raised date | By due date |
|---|---|---|
| PMs | 336 | **434** |
| Compliance | 80.1 % | **81.3 %** |

The due-date version matches your SQL from Week 12 (`2026-06: 434 due, 81.3 %`). Three tools, one answer.

### Then build:

1. `PM Compliance % (Due) R13W`: rolling 13 weeks by due date. (Combine `USERELATIONSHIP` and `DATESINPERIOD` in one `CALCULATE`.)
2. `Reactive Jobs R13W` and `Reactive Jobs PY`.
3. A **trend page**: weekly line chart of R13W breakdown hours, monthly column chart of compliance (due) with a constant line at the 90 % target (Analytics pane → Constant line), and a YTD vs PY card pair.
4. Add a measure `Target Compliance = 0.9` and a measure that returns a red/green colour for conditional formatting:

   ```dax
   Compliance Colour = IF ( [PM Compliance % (Due)] >= [Target Compliance], "#2E7D32", "#C62828" )
   ```

   Use it on the column chart: Format → Columns → Colour → *fx* → Field value → `Compliance Colour`.

---

## Watch

- **SQLBI**: *"SQLBI time intelligence"* and *"SQLBI USERELATIONSHIP"*.
- **Guy in a Cube**: *"Guy in a Cube rolling average DAX"*.
- **Microsoft Learn**: PL-300 module *Use DAX time intelligence functions in Power BI Desktop models*.

---

## Check yourself

1. Why do time intelligence functions need a marked date table with no gaps?
2. What's the difference between `SAMEPERIODLASTYEAR` and `DATEADD ( Calendar[Date], -1, YEAR )`?
3. Why might "PM compliance by raised date" and "by due date" disagree?
4. Your R13W chart drops to almost zero in the last three points. What's going on?

<details>
<summary><strong>Answers</strong></summary>

1. They work by shifting or extending date ranges in the Calendar. If dates are missing, the shifted range is incomplete and the results are wrong (often silently). Marking it as a date table also tells Power BI which column is the date key.
2. For a whole year they're the same. `DATEADD` is more flexible: you can use -1 MONTH, -7 DAY, -1 QUARTER and so on. `SAMEPERIODLASTYEAR` is shorthand for `DATEADD ( …, -1, YEAR )`.
3. A PM is raised up to a week before it's due, so PMs raised late in May can be due in June. The two months contain different sets of PMs. Compliance is about meeting the **due** date, so the due-date version is the correct KPI.
4. The chart's axis runs past the end of the data (July onwards). Each window there contains fewer and fewer real days. Cap the end date, or filter the axis to dates with data.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** The four Session 1 measures in a matrix (check June 2026: 266.9 h, 310.4 h, −14.0 %), Session 2's R13W with the `Last Data Date` cap, and the weekend `USERELATIONSHIP` measures for compliance by due date (434 / 81.3 %), then a simple trend page with the 90 % constant line and `Compliance Colour`.
- **On your phone (10 min a day):** Watch the SQLBI time intelligence and USERELATIONSHIP videos and the Guy in a Cube rolling average video, read "Why it works" and "Why `VAR` matters here", and answer Check yourself in your head.
- **Safe to skip this week:** Weekend item 1 (compliance R13W by due date), the `Reactive Jobs R13W` and `Reactive Jobs PY` measures in item 2, the `Has Data` column and the PL-300 time intelligence module can be skipped this week.

---

## Tick off

- [ ] YTD, PY, PY YTD and YoY measures, with June 2026 matching the reference
- [ ] Rolling 13 weeks with the end-of-data cap
- [ ] PM compliance by due date via USERELATIONSHIP (434 / 81.3 % for June 2026)
- [ ] Trend page with target line and conditional colours
