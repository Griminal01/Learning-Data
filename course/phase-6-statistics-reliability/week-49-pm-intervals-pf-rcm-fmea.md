# Week 49: From Weibull to PM decisions, optimal intervals, P-F, RCM and FMEA

**Phase 6 · Statistics & reliability analytics** · Mon 4 Oct – Sun 10 Oct 2027 · about 5 hours

A Weibull fit is only useful if it changes a decision. This week you turn β and η into **a PM interval**, put a cost on it, and place it inside the frameworks your engineering manager will recognise: the **P-F curve**, **RCM** task selection, and **FMEA**.

**By Sunday you'll be able to:**

- calculate the cost-optimal age-replacement interval from Weibull parameters and costs
- test how sensitive that answer is to the cost estimates
- choose a task type with RCM logic (time-based, condition-based, failure-finding, redesign, run to failure)
- set an inspection interval from the P-F interval
- run a simple FMEA with RPN scoring

---

## Session 1 (1.5 h): The optimal replacement interval

### The idea

Replace too often and you waste parts and labour. Replace too rarely and you pay for breakdowns. For a **wear-out** mode there's a sweet spot:

$$\text{cost per day}(T) = \frac{C_{PM} \cdot R(T) + C_{CM} \cdot (1 - R(T))}{\int_0^T R(t)\,dt}$$

That's the expected cost per jaw-set life, divided by the expected length of that life, if you replace at age T or at failure, whichever comes first.

### Do it

The costs are **assumptions you must agree with the business**. For practice:

- **C_PM = £400** per planned jaw change: parts plus 1 h of labour, done during a planned stop
- **C_CM = £2,900** per jaw breakdown: parts plus labour plus ~1 h of lost packing output plus scrap

```powershell
python solutions\phase-6-reliability\weibull_study.py --cost-pm 400 --cost-cm 2900
```

| Output | Value |
|---|---|
| η, β | 85.7 d, 2.98 |
| B10 life | **40 days** (10 % of jaw sets fail by then) |
| Chance of reaching the current 182-day interval | **~0 %** |
| **Optimal interval** | **37 days** |
| Cost per day at 182 d (current) | £37.88, the **same as run to failure** |
| Cost per day at 37 d | **£16.42** |

Look at the `cost_vs_interval.png` chart. The current 182-day PM is on the flat right-hand end. **Almost no jaw set survives to its PM**, so the PM is doing nothing, and you're effectively running to failure while also paying for a PM. That's why late PMs didn't matter in Week 45.

### Sensitivity: how sure are we?

| C_CM (with C_PM = £400) | Optimal interval |
|---|---|
| £1,500 | 49 days |
| **£2,900** | **37 days** |
| £5,000 | 30 days |

And the curve is **flat near the bottom**: at 42 days it's £16.68/day, only 2 % above the optimum. So a **practical 6-week (42-day) interval**, aligned with the planned-stop schedule, captures nearly all the saving. That's worth about **£7,700 per wrapper per year, or ~£46k a year across 6 wrappers** at these assumed costs.

---

## Session 2 (1.5 h): RCM task selection and the P-F interval

### RCM decision logic (simplified)

For each **failure mode**, ask in order:

1. **Is there a detectable warning (a P-F interval) that's long enough to act on?** → **Condition-based task** (vibration, thermography, oil analysis, wear measurement). This is usually the best option when it's possible.
2. **Does it wear out (β > 1, ideally > 2), with a known life?** → **Time-based restoration or replacement** at the optimal interval.
3. **Is it a hidden failure** (a protective device that only shows its failure on demand, like a guard interlock, a metal detector reject or a relief valve)? → **Failure-finding task** (a functional test), at an interval set by the required availability.
4. **None of the above, and the consequences are unacceptable?** → **Redesign**.
5. **Consequences acceptable?** → **Run to failure**, deliberately.

### The P-F interval sets inspection frequency

From Week 41: a bearing defect becomes detectable (P) some time before functional failure (F).

- **Inspection interval ≤ P-F interval ÷ 2** (a common rule), so at least one inspection falls inside the window, with time left to plan the repair.
- Fan bearing B5 gave **30 days** from alert to failure, so inspect **at least every ~2 weeks**, or monitor continuously.

### Apply it to Line D

| Failure mode | β | Evidence | RCM choice |
|---|---|---|---|
| Flow wrapper jaws | 3.0 | clear wear-out, η 86 d | **Time-based** replacement every ~6 weeks, plus a jaw wear check on the weekly inspection to catch early ones |
| Flow wrapper jams | 0.9 | random | **No time-based task.** A root-cause and redesign project (film, settings, product) |
| Flaking roll wear | 3.3 | wear-out, η 137 d, current regrind every 120 d | Shorten towards the optimum (`weibull_study.py --asset-type "Flaking roll" --mode "Mechanical - roll wear" --pm-prefix Regrind --current-interval 120 --cost-pm 1200 --cost-cm 6000` gives ≈ 70 d), **or** measure the roll gap and wear (condition-based) |
| Dryer fan bearing | rising vibration trend | P-F ≈ 30–64 d | **Condition-based**: continuous vibration sensors (supports the rollout) |
| Metal detector | n/a | hidden function | **Failure-finding**: the test-piece check (already daily) |

---

## Weekend (2 h): FMEA

A **Failure Modes and Effects Analysis** lists how something can fail, what happens, and how bad it is. It's the structured way to decide where to focus.

For **one flow wrapper**, build an FMEA in Excel with these columns:

| Function | Failure mode | Effect | Cause | Current controls | S (1–10) | O (1–10) | D (1–10) | RPN = S×O×D | Action |
|---|---|---|---|---|---|---|---|---|---|

- **S**everity of the effect: 10 is a safety or food-safety issue, 1 is no noticeable effect.
- **O**ccurrence: use your data. Jams (most frequent) score high, drive faults low.
- **D**etection: how likely current controls are to catch it **before** it causes the effect (10 = can't detect).

Fill in at least 6 failure modes (jaws, jams, sensor, drive, knife, film splice) and rank them by RPN. Then add a column for **action priority** ignoring RPN: any S ≥ 9 gets action, whatever its RPN. That's why newer FMEA standards (AIAG-VDA) moved away from pure RPN.

Read the classic: *Reliability-Centered Maintenance* (2nd ed.) by John Moubray, chapters 1–4. Ask whether your site library or engineering team has a copy.

---

## Watch

- Search *"RCM decision diagram explained"* and *"P-F interval inspection frequency"*.
- Search *"FMEA tutorial RPN example"*.
- Search *"optimal replacement interval Weibull cost"*.

---

## Check yourself

1. The jaw replacement interval is 182 days. Why did doing it late make no difference to breakdowns?
2. The cost ratio C_CM/C_PM falls to 2. What happens to the optimal interval, and why?
3. A mode has β = 1.0. A manager suggests halving its PM interval. What's your answer?
4. Fan bearing P-F is ~30 days. The vibration route is monthly. What's the risk, and what are the options?

<details>
<summary><strong>Answers</strong></summary>

1. Jaws fail at around 40–120 days (η 86, β 3), so nearly all jaw sets had already failed long before the 182-day PM came due. The PM's timing was irrelevant, because it almost never got the chance to prevent anything.
2. It gets **longer**, and if the ratio is low enough, replacement stops being worth it at all. When breakdowns cost little more than planned changes, you save little by pre-empting them.
3. With β ≈ 1, failures are random: a new part is no better than an old one, so a shorter interval just doubles the cost with no reduction in failures. Look for a condition-based task, a redesign, or accept run to failure.
4. A defect could start just after one reading and fail before the next, giving no warning. The options: route every ≤ 2 weeks on critical fans, continuous wireless sensors, or accept the risk on non-critical ones.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1: run `weibull_study.py` with £400 and £2,900, read the cost curve (37 days optimal, 182 days equals run to failure), and rerun at £1,500 and £5,000 for the sensitivity. Then build the weekend FMEA in Excel with at least 6 flow wrapper modes ranked by RPN. Week 50's recommendation is built from these numbers.
- **On your phone (10 min a day):** Session 2 is reading: the RCM decision logic, the P-F rule and the Line D table. Watch the RCM decision diagram and P-F interval videos, answer Check yourself in your head, and draft your FMEA modes and S, O and D scores on paper before you type them up.
- **Safe to skip this week:** The flaking roll `weibull_study.py` run in the Line D table, the action priority column and Moubray's *Reliability-Centered Maintenance* chapters can wait.

---

## Tick off

- [ ] Optimal interval found for the jaws (37 d), with sensitivity to cost
- [ ] Can explain why the current 182-day PM equals run to failure
- [ ] RCM task choice made for five Line D failure modes
- [ ] Inspection interval set from the P-F interval
- [ ] FMEA for one flow wrapper, with at least 6 modes
