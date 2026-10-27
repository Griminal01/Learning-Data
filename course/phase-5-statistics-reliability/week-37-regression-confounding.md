# Week 37: Regression, and did the PM actually make a difference?

**Phase 5 · Statistics & reliability analytics** · Mon 12 Jul – Sun 18 Jul 2027 · about 5 hours

Regression measures how one thing changes with another while holding other things fixed. This week answers a question every PM pillar asks: *"Do assets with worse PM compliance break down more?"* The answer in this data is a lesson you'll use for the rest of your career.

**By Sunday you'll be able to:**

- calculate and interpret correlation
- fit linear regression with `statsmodels` and read the output (coefficient, p-value, R²)
- spot **confounding** and fix it by adding controls
- use Poisson regression for count data (like breakdowns)

---

## Session 1 (1.5 h): The simple story

### Do it

```python
import pandas as pd, numpy as np
import statsmodels.formula.api as smf
from pathlib import Path
DATA = Path("..") / "data"

wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["due_date", "completed_date"])
assets = pd.read_csv(DATA / "csv" / "assets.csv")

pm = wo[wo["wo_type"] == "PM"].copy()
pm["on_time"] = pm["completed_date"].le(pm["due_date"])
breakdowns = wo[wo["wo_type"] == "Reactive"].groupby("asset_id").size().rename("breakdowns")

per = (pm.groupby("asset_id")["on_time"].mean().rename("pm_on_time").reset_index()
         .merge(breakdowns.reset_index(), on="asset_id", how="left")
         .fillna({"breakdowns": 0})
         .merge(assets, on="asset_id"))

per["pm_on_time"].corr(per["breakdowns"])         # -0.28

m1 = smf.ols("breakdowns ~ pm_on_time", data=per).fit()
print(m1.summary())
```

**Read the output:**

- coefficient on `pm_on_time` ≈ **−11.4**: going from 0 % to 100 % on time goes with about 11 fewer breakdowns. Or per 10 points of compliance, about 1.1 fewer breakdowns per asset over two years.
- p-value < 0.001: very unlikely to be chance.
- R² ≈ 0.08: compliance alone explains only 8 % of the variation in breakdowns.

It's tempting to stop here and put *"every 10 % of PM compliance prevents 1.1 breakdowns per asset"* on a slide. **Don't.**

---

## Session 2 (1.5 h): Confounding

### The problem

Which assets have bad PM compliance? Mostly **packing and end-of-line** assets (Weeks 8, 12, 19). And which assets break down most? Flow wrappers, case packers and carton erectors, also **packing and end-of-line**. Those machines fail often *because of what they are* (high-speed, many wear parts, frequent jams), regardless of PM timing.

So zone and asset type drive **both** compliance **and** breakdowns. That's a **confounder**: it creates a correlation between two things without one causing the other.

### Do it: control for asset type

```python
m2 = smf.ols("breakdowns ~ pm_on_time + C(asset_type)", data=per).fit()
m2.params["pm_on_time"], m2.pvalues["pm_on_time"], m2.rsquared
```

| Model | Coefficient on PM on-time | p-value | R² |
|---|---|---|---|
| breakdowns ~ on-time | −11.4 | < 0.001 | 0.08 |
| **+ asset type** | **−0.6** | **0.60** | **0.82** |

Once you compare like with like (flow wrappers with flow wrappers, conveyors with conveyors), **the effect of PM timing almost disappears**, and asset type explains 82 % of the variation.

Breakdowns are **counts**, so the more correct model is **Poisson regression**:

```python
m3 = smf.poisson("breakdowns ~ pm_on_time + C(asset_type)", data=per).fit()
np.exp(m3.params["pm_on_time"] * 0.1)     # ≈ 0.98: +10 points of compliance gives about 2 % fewer breakdowns, p ≈ 0.54
```

Same conclusion.

### Why this matters, and what it doesn't mean

It does **not** mean PMs are useless. It means **in this data, doing these PMs a few days late doesn't measurably change breakdowns**, which is exactly what you'd expect if:

- most of these PMs are inspections that rarely catch anything, or
- the PM interval is wrong for the failure mode (far too long, or aimed at random failures), so timing within that interval hardly matters.

That points straight at **Weeks 40–41**: look at each failure mode's Weibull shape and see whether the PM even targets it. Remember that the jaw replacement interval is 182 days, while jaws wear out at around 85.

**Correlation is the start of a question, not the answer.** Before claiming X causes Y, ask: *what else is different between the groups?*

---

## Weekend (2 h)

1. **Simple linear regression by hand**: for flow wrappers only, plot `pm_on_time` against `breakdowns` with `seaborn.regplot`. With only 6 points, what can you honestly conclude?
2. **Asset age**: does age predict breakdowns once you control for asset type? Add `age_years` to `m2`.
3. **Criticality**: A assets get priority 1. Do they get repaired faster? Regress breakdown `duration_min` on criticality plus asset type, using `np.log(duration_min)` as the outcome, since it's lognormal (Week 35).
4. **Write it up**: half a page titled *"Does late PM cause breakdowns on Line D?"*, aimed at an engineering manager. Include the naive result, why it's misleading, the controlled result, and what you'd investigate next. This is portfolio material.

---

## Watch

- **StatQuest**: *"StatQuest linear regression"*, *"StatQuest R-squared"* and *"StatQuest linear models: design matrices"*.
- Search *"confounding variable explained simpson's paradox"*. Simpson's paradox is the extreme case.
- Book: *Practical Statistics for Data Scientists*, chapter 4 (regression).

---

## Check yourself

1. What does R² = 0.08 tell you?
2. What's a confounder? Give the one in this week's data.
3. Why is Poisson regression a better fit than ordinary linear regression for breakdown counts?
4. The controlled model shows no effect of PM timing. Name two possible explanations that are about the **PM** rather than the statistics.

<details>
<summary><strong>Answers</strong></summary>

1. Only 8 % of the variation in breakdowns between assets is explained by PM compliance. Most of the differences come from something else.
2. A variable that affects both the "cause" and the "effect", creating a misleading association. Here it's asset type (and zone): packing machines have both worse compliance and more breakdowns, for separate reasons.
3. Counts are whole numbers ≥ 0, usually skewed, with variance that grows with the mean. Linear regression can predict negative counts and assumes constant variance. Poisson handles both.
4. The PM interval doesn't match the failure mode's life (too long to prevent wear-out, or aimed at random failures that time-based PM can't prevent). Or the task content doesn't detect or prevent the actual failure modes (a visual check that can't see jaw wear). Data quality is another possibility, for example PMs signed off but not actually done.

</details>

---

## Tick off

- [ ] Correlation and simple OLS run and interpreted
- [ ] Confounding by asset type found and controlled
- [ ] Poisson regression for counts
- [ ] Half-page write-up: *"Does late PM cause breakdowns on Line D?"*
