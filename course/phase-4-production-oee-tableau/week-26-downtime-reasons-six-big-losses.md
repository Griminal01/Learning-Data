# Week 26: Downtime reasons, the six big losses, and operator-coded data

**Phase 4 · Production data: OEE, Redzone & Tableau** · Mon 26 Apr – Sun 2 May 2027 · about 5 hours

In Redzone, operators log each stop with a **machine** and a **reason**. That's a goldmine, and it's also the messiest data you'll work with: free choices made in a hurry by busy people. This week you analyse the downtime log the way a CI engineer would, and learn to judge how far you can trust it.

**By Sunday you'll be able to:**

- map downtime reasons onto the **six big losses**
- build loss Paretos by category, reason and machine
- measure coding quality: unassigned stops, catch-all reasons, miscoding
- reconcile event-level downtime with shift-level totals

**Data:** `data/production/redzone_downtime.csv`, 6,725 stop events, each with production date, shift, crew, SKU, **machine**, start, end, minutes, **reason category**, **reason** and an optional **comment**. The same tables are in `data/line_d.db` (`redzone_downtime`, `shifts`).

---

## Session 1 (1.5 h): The six big losses

| OEE factor | Big loss | In this data |
|---|---|---|
| **Availability** | 1. Breakdowns (unplanned stops) | reason categories *Mechanical*, *Electrical* |
| | 2. Setup and adjustments | *Changeover* |
| **Performance** | 3. Small stops and idling | short *Operational* stops: jams, sensor misreads, guard doors |
| | 4. Reduced speed | not in the downtime log at all. It's the speed loss from Week 25's bridge. |
| **Quality** | 5. Start-up rejects | `reject_count` (shift table) |
| | 6. Production rejects | `reject_count` (shift table) |

Plus losses that are neither, which many sites log as their own categories: *Material* (waiting for film or cartons), *People* (no operator) and *Quality* (QA hold).

> Note: this data set logs short stops as downtime events (so they reduce availability). Many sites, and many Redzone set-ups, treat stops under a few minutes as performance loss instead. That's one of the definitions you wrote down last week.

### Do it

In DB Browser (or a pivot in Excel on the CSV):

```sql
SELECT reason_category, COUNT(*) AS events, SUM(duration_min) AS minutes
FROM redzone_downtime
WHERE production_date >= '2026-01-01'
GROUP BY reason_category
ORDER BY minutes DESC;
```

| Category (H1 2026) | Events | Minutes | % |
|---|---|---|---|
| Mechanical | 96 | 11,358 | 31.1 |
| Operational | 1,233 | 11,050 | 30.2 |
| Electrical | 34 | 4,484 | 12.3 |
| **Unassigned** | 155 | 3,670 | **10.0** |
| Changeover | 88 | 3,522 | 9.6 |
| Material | 24 | 1,572 | 4.3 |
| Quality | 14 | 612 | 1.7 |
| People | 5 | 281 | 0.8 |

Look at the **shape**. Mechanical is about 100 long events. Operational is over 1,200 short ones. Same minutes, completely different problems and fixes: maintenance and reliability for one, minor-stop elimination for the other.

---

## Session 2 (1.5 h): Drill down, and judge the coding

### Do it

1. **Top reasons within Mechanical + Electrical (H1 2026)**: Noise / bearing 2,796 min, Belt / chain off 2,514, Sensor fault 2,248, Jam 1,695, Drive fault 1,033.
2. **Top Operational reasons**: Guard door opened 2,702, Sensor misread 2,557, Jam / blockage 1,931, Film / carton misfeed 1,541. Guard doors at the top is a classic finding. It's often a behaviour or guarding-design issue, not a maintenance one.
3. **By machine**: Packing Conveyors 5,347 min, Wrapper 1 5,204, Flaker 4,493, Former 4,013, EOL Conveyors 3,353, Cooker 3,089.
   - "Packing Conveyors" and "Cooker" are **groups**. Behind "Cooker" are ~43 CMMS assets. Operators pick the machine they can see, not the asset number. Week 30 deals with this.
   - "Wrapper 1" carries every changeover, because that's where changeovers get logged. **Filter out changeovers before blaming a machine.**
4. **Coding quality**:

   ```sql
   SELECT ROUND(100.0 * SUM(reason_category = 'Unassigned') / COUNT(*), 1) AS pct_events,
          ROUND(100.0 * SUM(CASE WHEN reason_category = 'Unassigned' THEN duration_min END) / SUM(duration_min), 1) AS pct_minutes
   FROM redzone_downtime;
   ```

   **8.8 % of events** and **7.3 % of minutes** have no reason. Also look for:
   - "Jam" logged under *Mechanical* (an operator word for a maintenance failure), and *Operational* stops lasting over an hour (probably a breakdown coded as a jam)
   - the `comment` field, where the real story often is ("jaws not sealing, called eng")
5. **Reconcile**: the sum of event minutes in H1 2026 is **36,549**, but the shift table's downtime is **36,146**. Why the 403-minute gap? (Hint: stops that cross a shift boundary, and the worst shifts being capped. Look at shift `S01368` on 15 May 2026, Nights: 660 minutes down, OEE 3.7 %.) **Always reconcile two views of the same loss before presenting either.**

---

## Weekend (2 h): The Redzone view at work

Using **your site's** Redzone dashboards in Tableau (view and filter only, no downloads this week):

1. Find the line's OEE for last month, and its A, P and Q. Does the dashboard show the minute bridge? If not, sketch it from what's shown.
2. Find the top 5 downtime reasons for last month. How many are maintenance (mechanical/electrical) vs operational?
3. Find the **unassigned / uncategorised** share, if the dashboard shows it. If it doesn't, that's a finding in itself.
4. Ask a team leader: *"When a machine stops, who enters the reason, and when?"* The answer explains most coding problems.
5. Write half a page: **"What our downtime data can and can't tell maintenance."**

---

## Watch

- Search *"six big losses TPM explained"*.
- Search *"SMED changeover reduction explained"*. Changeovers are 10 % of the loss here.
- Search *"Redzone production system"* to see the vendor's own overview, so you know what your production team sees.

---

## Check yourself

1. Which big loss never appears in a downtime log, and how do you find it?
2. Mechanical and Operational both lose about 11,000 minutes. Why do they need different improvement approaches?
3. 10 % of minutes are Unassigned. How does that bias a Pareto?
4. Why might Wrapper 1 top the machine Pareto even if it's reliable?

<details>
<summary><strong>Answers</strong></summary>

1. **Reduced speed**. It's the gap between run time and (total count × ideal cycle time). Get it from the shift-level counts (Week 25's bridge), not from the stop log.
2. Mechanical is about 100 long stops: root-cause each one, fix the failure modes, and improve PM and spares (your reliability toolkit). Operational is 1,200+ short stops: look for patterns (guard doors, sensor set-up, film splicing) and use small-stop elimination, standard work and SMED-style thinking.
3. Every unassigned minute is missing from the real categories, so every bar is understated. If unassigned stops are mostly long breakdowns (which they often are, because nobody codes during a crisis), maintenance's share is under-reported. Check what the unassigned stops look like: duration, time of day, machine.
4. Changeovers are logged against Wrapper 1, so it collects 3,500 minutes that aren't failures. Always separate planned or operational events from failures before ranking machines.

Worked SQL is in [`solutions/phase-4-production/w25_w26_oee_losses.sql`](../../solutions/phase-4-production/w25_w26_oee_losses.sql).

</details>

---

## Tick off

- [ ] Downtime mapped onto the six big losses
- [ ] Category, reason and machine Paretos for H1 2026
- [ ] Coding quality measured (unassigned 7.3 % of minutes), with miscoding examples found
- [ ] Event minutes reconciled to shift minutes, and the gap explained
- [ ] Half page: what our downtime data can and can't tell maintenance
