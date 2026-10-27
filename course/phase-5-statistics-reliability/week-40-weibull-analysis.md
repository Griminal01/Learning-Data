# Week 40: Weibull analysis

**Phase 5 · Statistics & reliability analytics** · Mon 2 Aug – Sun 8 Aug 2027 · about 5 hours

The Weibull distribution is the reliability engineer's main tool. Its **shape parameter β** tells you which part of the bathtub a failure mode lives in, and therefore **whether time-based PM can work at all**. This week you fit Weibulls properly, including the step most people get wrong: **suspensions**.

**By Sunday you'll be able to:**

- interpret Weibull β (shape) and η (scale, the characteristic life)
- build life data for one failure mode, with failures and **suspensions** (right-censored data)
- fit Weibull with the Python `reliability` library and read the probability plot
- show that mixing failure modes, or ignoring suspensions, gives the wrong answer

**Library:** `reliability` (already in `requirements.txt`). Docs: [reliability.readthedocs.io](https://reliability.readthedocs.io).

---

## Session 1 (1.5 h): β and η

$$R(t) = e^{-(t/\eta)^\beta}$$

| β | Failure rate | Meaning | PM implication |
|---|---|---|---|
| **< 1** | falling | infant mortality | **don't** replace on time; improve installation, commissioning and quality |
| **≈ 1** | constant | random | time-based replacement **can't help**; use condition monitoring, redesign, or run to failure |
| **1 – 2** | slowly rising | early wear-out | time-based replacement *may* pay off; check costs |
| **> 2** | rising fast | clear wear-out | **time-based replacement works**, if the interval is right |

**η** is the age by which **63.2 %** of units have failed, whatever β is.

### Do it: feel the shapes

```python
import numpy as np, matplotlib.pyplot as plt
from reliability.Distributions import Weibull_Distribution

for beta in (0.7, 1.0, 3.0):
    Weibull_Distribution(alpha=80, beta=beta).HF(label=f"β = {beta}")   # hazard function
plt.legend(); plt.title("Failure rate vs age, η = 80 days"); plt.show()
```

The β = 3 curve rises steeply. That's a part that "wears out" around 60–100 days.

---

## Session 2 (1.5 h): Life data done properly

**The question:** what's the life of a set of **flow wrapper sealing jaws**?

A jaw set's "life" starts when it's new: after a breakdown repair, a planned repair, or a scheduled replacement. Its life ends in one of two ways:

- it **fails** (a reactive WO with code *Mechanical - jaws*) → a **failure** time
- it's **replaced before failing** (the *Replace sealing jaws* PM, or a planned corrective found on inspection), or the data simply ends → a **suspension**: "it lasted *at least* this long"

**Ignoring suspensions throws away the information that many jaw sets survived a long time**, and makes life look shorter than it is. **Treating every time-between-breakdowns as a life** (mixing in jams and sensor faults) blurs everything towards β ≈ 1.

### Do it

Use the study script, then read its `life_data()` function line by line:

```powershell
python solutions\phase-5-reliability\weibull_study.py
```

Or in a notebook:

```python
import sys; sys.path.append("../solutions/phase-5-reliability")
from weibull_study import life_data
from reliability.Fitters import Fit_Weibull_2P

f, s = life_data("Flow wrapper", "Mechanical - jaws", "Replace sealing jaws")
len(f), len(s)                       # 32 failures, 48 suspensions
fit = Fit_Weibull_2P(failures=f, right_censored=s)   # prints the results and shows the probability plot
```

**Results:** η ≈ **85.7 days** (95 % CI 76–97), **β ≈ 2.98** (95 % CI 2.3–3.9). That's clear **wear-out**.

### Now see how it goes wrong

```python
# Mistake 1: ignore suspensions
Fit_Weibull_2P(failures=f, print_results=False, show_probability_plot=False).alpha   # ≈ 68 d: life looks 20 % shorter

# Mistake 2: mix every failure mode, using days between any two breakdowns
#   (your Week 30 'days_since_last' for flow wrappers): β ≈ 1.1, η ≈ 28 d. It looks random!

# Contrast: a mode that really is random
fj, sj = life_data("Flow wrapper", "Operational - jam", "NO_PM")
Fit_Weibull_2P(failures=fj, right_censored=sj, print_results=False, show_probability_plot=False).beta   # ≈ 0.92
```

**Jams: β ≈ 0.92, η ≈ 49 days.** They're random. No PM interval will prevent them, so they need a root-cause and design fix (product, film, settings).

### Reading the probability plot

The axes are transformed so that Weibull data falls on a **straight line**, with slope = β. Points that follow the line support the Weibull model. A **kink** often means two failure modes mixed together. Points curving away at the start suggest a 3-parameter Weibull (failure-free period) or a different distribution.

---

## Weekend (2 h)

1. Run `life_data` + `Fit_Weibull_2P` for:
   - Flaking roll, *Mechanical - roll wear*, PM prefix `Regrind`. You should get β ≈ **3.3**, η ≈ **137 d**.
   - Conveyor, *Mechanical - belt/chain*, PM prefix `Replace conveyor belt`, which gives β ≈ 2.2.
   - Pump, *Mechanical - seal*, PM prefix `Replace pump mechanical seal`.
2. Make a table of every mode: n failures, n suspensions, β (with CI), η, and the verdict (infant / random / wear-out).
3. Try `Fit_Everything(failures=f, right_censored=s)` on the jaws. Does Weibull still win? What about lognormal?
4. Read the `reliability` docs page *"What is censored data"* and the *Fit_Weibull_2P* page.

---

## Watch

- Search *"Weibull analysis explained beta shape parameter"*. Look for a reliability engineering channel.
- Search *"right censored data suspensions reliability"*.
- Book: *The New Weibull Handbook* by Robert Abernethy, the industry standard reference (if your employer has a copy).

---

## Check yourself

1. β = 0.6 for a drive's electronics board. Should you replace boards every 2 years?
2. Why is a PM replacement treated as a suspension, not a failure?
3. Why does mixing failure modes push β towards 1?
4. What does η = 85.7 days mean in plain English?

<details>
<summary><strong>Answers</strong></summary>

1. **No.** β < 1 is infant mortality: new boards are *more* likely to fail than old ones. Replacing them would increase failures. Focus on handling, ESD control, burn-in and supplier quality.
2. The part hadn't failed. All we know is that it lasted *at least* that long. Recording it as a failure would wrongly shorten the estimated life.
3. Several overlapping wear-out curves at different ages, plus random modes, add up to a roughly constant overall failure rate. Each mode's signature gets averaged away, which is the Drenick result.
4. By 86 days of running, about 63 % of jaw sets will have failed. With β ≈ 3, failures cluster between roughly 40 and 120 days.

</details>

---

## Tick off

- [ ] Can explain β < 1, ≈ 1 and > 1 and what each means for PM
- [ ] Built failure and suspension life data for one mode
- [ ] Jaws: η ≈ 86 d, β ≈ 3.0. Jams: β ≈ 0.9.
- [ ] Showed what ignoring suspensions and mixing modes does
- [ ] Table of β/η for at least four failure modes
