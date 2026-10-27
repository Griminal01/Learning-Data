# Week 24: Finish the dashboard, done-when test, PL-300 plan

**Phase 3 · Power BI** · Mon 12 Apr – Sun 18 Apr 2027 · about 5 hours

Last week of Phase 3. Polish, test with a real person, package for your portfolio, and decide whether to sit **PL-300**.

---

## Session 1 (1.5 h): Performance and quality pass

### Do it

1. **Performance Analyzer** (Optimize ribbon → Performance analyzer → Start recording → Refresh visuals). Any visual over ~1 second? Usually it's a complex measure inside a big table. Simplify it, or reduce the rows shown.
2. **Model clean-up:**
   - Remove unused columns in Power Query (fewer columns means a smaller, faster file).
   - Check that every measure has a format and lives in `_Measures`, in display folders (*PM*, *Reliability*, *Downtime*, *Rollout*).
   - Add a **description** to each key measure (Model view → Properties → Description). It shows up when users hover in the field list.
3. **Reconciliation sheet**: on the About page (or in a separate check page), put a table of headline numbers next to their source:

   | KPI | Power BI | SQL (Week 12–14) | Excel (Week 8) |
   |---|---|---|---|
   | PM compliance, all time | 79.5 % | 79.5 % | 79.5 % |
   | PM compliance, June 2026 (due) | 81.3 % | 81.3 % | |
   | Q2 2026 top loss asset | LD-FLK-010 | LD-FLK-010 | LD-FLK-010 |
   | Total WOs | 11,902 | 11,902 | 11,902 |

   If any of them disagree, find out why before you show anyone.

---

## Session 2 (1.5 h): The done-when test

> **Done when:** the team could use it in a weekly review **without you explaining it**.

### Do it

1. Find a tester: a colleague, friend or family member. Ideally someone who's never seen it.
2. Give them **three questions** and say nothing else:
   - "Which zone is worst for PM compliance, and is it getting better?"
   - "Which asset lost the most time last quarter? What keeps going wrong on it?"
   - "How far behind is the sensor rollout?"
3. **Watch silently** and note every hesitation, wrong click and "what does this mean?".
4. Fix each one: a clearer title, a tooltip, a definition on the About page, or a moved slicer.
5. Repeat with a second person if you can. When someone answers all three in under five minutes without help, **you've passed Phase 3.** 🎉

---

## Weekend (2 h): Portfolio and PL-300 plan

### Portfolio

Create `portfolio/03-lined-dashboard/` with:

- `LineD_Maintenance.pbix` (it contains only synthetic data, so it's safe to share)
- `screenshots/`: one PNG per page
- `README.md` covering: the purpose, the five questions it answers, the model diagram (from Week 16), the KPI definitions, the three most interesting findings, and what you'd change with real data

### PL-300 (Microsoft Power BI Data Analyst)

PL-300 is the most recognised data certificate in UK manufacturing roles. It's optional, but you've now covered most of it.

1. Download the **study guide** (search *"PL-300 study guide"* on Microsoft Learn). It lists the skills measured and their weightings: preparing data, modelling, visualising and analysing, and managing and securing.
2. Do the free **Practice Assessment** on the PL-300 page on Microsoft Learn. Note your weak areas. For most people they're Service administration and RLS, which you couldn't practise fully at home.
3. Plan **3–4 weeks of revision** around the next phases (an extra 1–2 hours a week), using the Microsoft Learn path for your weak areas.
4. Check the **current exam price** on Microsoft's site, and ask your manager whether the training budget will fund it, since it maps directly onto the PM pillar work.
5. The exam can be taken online at home (with proctoring) or at a test centre.

---

## Where Tableau fits

Not needed. Power BI covers the same ground and suits a Microsoft site. If a job advert you want asks for Tableau, spend one weekend rebuilding page 1 in **Tableau Public** (free) and list it on your CV.

---

## Check yourself: Phase 3 review

Without looking anything up:

1. Sketch the star schema with the relationship directions.
2. Write `PM Compliance % (Due)` from memory.
3. Explain filter context to someone who's never used Power BI.
4. What's the difference between `ALL`, `ALLSELECTED` and `REMOVEFILTERS`?
5. When does a report need a gateway?

<details>
<summary><strong>Answers</strong></summary>

1. Zones → Assets → (WorkOrders, Downtime, PMTasks, SensorRollout); Calendar → WorkOrders (raised, active), Calendar → WorkOrders (due, inactive), Calendar → Downtime. All single direction, one to many.
2. ```dax
   PM Compliance % (Due) =
   CALCULATE (
       DIVIDE (
           CALCULATE ( COUNTROWS ( WorkOrders ), WorkOrders[PM Result] = "On time" ),
           CALCULATE ( COUNTROWS ( WorkOrders ), WorkOrders[WO Type] = "PM" )
       ),
       USERELATIONSHIP ( Calendar[Date], WorkOrders[due_date] )
   )
   ```
3. Every number on a report is calculated with a set of filters applied: whatever row, column, slicer and page you're on. Change the filters and the same formula gives a different answer. `CALCULATE` lets a measure change those filters.
4. `ALL` removes filters and returns all rows (it can be used as a table). `REMOVEFILTERS` only removes filters, as a CALCULATE modifier, and is clearer to read. `ALLSELECTED` removes filters from inside the visual but keeps the outer slicer and page filters.
5. When the Service needs to refresh from a source it can't reach from the cloud: files on a PC, or on-premises databases.

</details>

---

## Tick off

- [ ] Performance Analyzer checked, model tidied, measure descriptions added
- [ ] Reconciliation table: Power BI = SQL = Excel
- [ ] **Done-when test passed** with an independent tester
- [ ] `portfolio/03-lined-dashboard/` committed
- [ ] PL-300 practice assessment taken, revision plan written
