# Week 47: Reliability metrics, failure rate and the bathtub curve

**Phase 6 · Statistics & reliability analytics** · Mon 20 Sep – Sun 26 Sep 2027 · about 5 hours

You calculated MTBF and MTTR in SQL and DAX. This week you go underneath them: reliability as a **probability over time**, failure rate, the bathtub curve, and how individual asset availabilities combine into a **line** availability.

**By Sunday you'll be able to:**

- explain R(t), F(t), the failure rate λ(t), MTBF and MTTR, and how they connect
- use the exponential model R(t) = e^(−t/MTBF), and know when it's valid
- describe the bathtub curve and Nowlan & Heap's six failure patterns
- calculate series and parallel (redundant) availability

---

## Session 1 (1.5 h): From MTBF to probability

### The core functions

| Symbol | Name | Meaning |
|---|---|---|
| R(t) | reliability (survival) | chance it's still working at age t |
| F(t) = 1 − R(t) | unreliability (CDF) | chance it has failed by age t |
| f(t) | failure density (PDF) | when failures happen |
| λ(t) = f(t) / R(t) | hazard (failure) rate | the chance of failing *now*, given it has survived so far |

For **random** failures (a constant λ), everything follows from MTBF:

$$R(t) = e^{-t/\text{MTBF}} \qquad \lambda = 1/\text{MTBF}$$

### Do it

```python
import numpy as np, pandas as pd
from pathlib import Path
DATA = Path("..") / "data"

wo = pd.read_csv(DATA / "csv" / "work_orders.csv")
dt = pd.read_csv(DATA / "csv" / "downtime_events.csv")
assets = pd.read_csv(DATA / "csv" / "assets.csv")
fw = assets.loc[assets["asset_type"] == "Flow wrapper", "asset_id"]

hours = 17520
n_fail = wo[(wo["wo_type"] == "Reactive") & wo["asset_id"].isin(fw)].shape[0]
mtbf = hours * len(fw) / n_fail
mttr = dt[(dt["category"] == "Breakdown") & dt["asset_id"].isin(fw)]["duration_min"].mean() / 60
A = mtbf / (mtbf + mttr)
print(n_fail, round(mtbf), round(mttr, 2), f"{A:.3%}", f"{1/mtbf:.5f}/h")
print("Chance a flow wrapper runs a full week (168 h) without a breakdown:", round(np.exp(-168 / mtbf), 3))
```

**Results:** 6 flow wrappers, 161 breakdowns. MTBF ≈ **653 h**, MTTR ≈ 1.01 h, A ≈ 99.85 %, λ ≈ 0.0015 per hour. **R(168 h) ≈ 0.77**, so in any given week, each flow wrapper has about a 23 % chance of breaking down.

### Why it works (and the big caveat)

`e^(−t/MTBF)` assumes failures are **random**, with a constant rate. That's valid for a *mix* of failure modes on a complex machine (which is why it roughly works for "flow wrapper, any cause"), but **wrong for a single wear-out mode**. Next week's Weibull analysis shows flow wrapper **jaws** don't fail randomly at all.

---

## Session 2 (1.5 h): The bathtub curve and the six patterns

### The classic bathtub

1. **Infant mortality** (falling failure rate): installation errors and manufacturing defects. The fix is better commissioning, burn-in and QA.
2. **Useful life** (constant rate): random failures. The fix is condition monitoring, or redesign.
3. **Wear-out** (rising rate): fatigue, abrasion, corrosion. The fix is time-based replacement, *if* you know when wear-out starts.

### Nowlan & Heap (1978, airline data)

The famous study that founded **RCM** found that most components **don't** follow the bathtub. It identified six patterns:

| Pattern | Shape | Share (airline study) |
|---|---|---|
| A | bathtub | ~4 % |
| B | constant, then wear-out | ~2 % |
| C | slowly rising | ~5 % |
| D | low at first, then constant | ~7 % |
| E | constant (random) | ~14 % |
| F | infant mortality, then constant | **~68 %** |

Only about 11 % (A, B, C) show wear-out, which is where **time-based replacement helps**. For the rest, replacing on a schedule does nothing, or makes things **worse** by resetting parts back into infant mortality. Industrial plant proportions differ, but the lesson stands: **don't assume age-related failure. Check it.** That's exactly what Weibull β tells you.

---

## Weekend (2 h): System availability

### Series and parallel

- **Series** (everything must work; a line): A_sys = A₁ × A₂ × … × Aₙ
- **Parallel** (any one is enough; redundancy): A_sys = 1 − (1 − A₁)(1 − A₂)…

```python
A_fw = 0.99846
print("6 wrappers all needed:", round(A_fw ** 6, 4))        # 0.9908
print("2 pumps, either is enough:", round(1 - (1 - 0.98) ** 2, 4))   # 0.9996
```

### Do it

1. **Primary Packing as a series system.** For each PPK asset, compute its availability as 1 − (breakdown downtime hours ÷ 17,520). Multiply them all together. You should get about **0.987**: the zone was down for breakdowns about 1.3 % of the time, which is about **226 hours** over two years. That's one asset's 99.8 % multiplied across 43 assets.
2. **Add minor stops**, which aren't in "availability" but are real lost time. How much worse does it get?
3. **What-if**: if flow wrapper MTBF doubled (half the breakdowns), what would the zone availability be?
4. **Read about OEE**: Availability × Performance × Quality. Which of the three do minor stops belong to? (Performance.)

---

## Watch

- Search *"bathtub curve reliability explained"* and *"Nowlan and Heap six failure patterns"*.
- Search *"MTBF vs MTTF vs failure rate"* for a short explainer.
- Read the [`reliability` library docs](https://reliability.readthedocs.io), section *"Equations of supported distributions"*.

---

## Check yourself

1. MTBF = 653 h. Is the chance of surviving 653 h equal to 50 %?
2. Why can replacing a component on a schedule *increase* failures?
3. A line has 20 machines in series, each with 99.5 % availability. What's the line availability?
4. What's the difference between MTBF and MTTF?

<details>
<summary><strong>Answers</strong></summary>

1. No. Under the exponential model, R(MTBF) = e^(−1) ≈ **36.8 %**. Most units fail *before* the MTBF. A mean life is not a median life.
2. If a part's failures are infant mortality or random (patterns D, E, F), a new part is no better, or is worse, than the old one. Replacement adds the risk of installation errors and early-life failures.
3. 0.995²⁰ ≈ **0.905**, so about 90 %. Small losses multiply.
4. **MTTF** (mean time *to* failure) is for non-repairable items: the average life of a bearing. **MTBF** is for repairable systems: the average time between failures of a machine. People often use them loosely.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1's flow wrapper block (MTBF about 653 h, A about 99.85 %, R(168 h) about 0.77), and weekend step 1: Primary Packing as a series system, about 0.987 or 226 hours.
- **On your phone (10 min a day):** Session 2 is reading: the bathtub curve and Nowlan & Heap's six patterns. Watch the bathtub curve and Nowlan and Heap videos, read the "big caveat" on the exponential model, and work Check yourself question 3 (0.995 to the power 20) on paper.
- **Safe to skip this week:** Weekend steps 2 to 4 (adding minor stops, the flow wrapper what-if and the OEE reading) and the `reliability` docs equations page can wait.

---

## Tick off

- [ ] R(t), F(t) and λ(t) explained in my own words
- [ ] Flow wrapper MTBF, availability and weekly survival probability calculated
- [ ] Can explain the bathtub curve and why Nowlan & Heap matters for PM
- [ ] Series and parallel availability; PPK zone ≈ 0.987
