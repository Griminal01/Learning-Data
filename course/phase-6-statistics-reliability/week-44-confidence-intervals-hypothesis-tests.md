# Week 44: Confidence intervals and hypothesis testing

**Phase 6 · Statistics & reliability analytics** · Mon 30 Aug – Sun 5 Sep 2027 · about 5 hours

"Breakdowns are down 10 % this year!" Is that real, or luck? This week gives you the tools to answer, so you don't celebrate (or panic about) noise, and you can show that a real change is real.

**By Sunday you'll be able to:**

- calculate and explain a 95 % confidence interval (CI), both by formula and by bootstrap
- run a t-test, a Mann-Whitney test, a chi-square test and a rate test
- interpret a p-value correctly, and know what it does *not* mean
- tell the difference between statistically significant and practically important

---

## Session 1 (1.5 h): Confidence intervals

### Do it

```python
import pandas as pd, numpy as np
from scipy import stats
from pathlib import Path
DATA = Path("..") / "data"

dt = pd.read_csv(DATA / "csv" / "downtime_events.csv")
assets = pd.read_csv(DATA / "csv" / "assets.csv")
bd = dt[dt["category"] == "Breakdown"].merge(assets, on="asset_id")
ppk = bd.loc[bd["zone_code"] == "PPK", "duration_min"] / 60
flk = bd.loc[bd["zone_code"] == "FLK", "duration_min"] / 60

for name, x in (("PPK", ppk), ("FLK", flk)):
    lo, hi = stats.t.interval(0.95, len(x) - 1, loc=x.mean(), scale=stats.sem(x))
    print(f"{name}: n={len(x)}, MTTR={x.mean():.2f} h, 95% CI {lo:.2f}-{hi:.2f}")
```

| Zone | n | MTTR | 95 % CI |
|---|---|---|---|
| Primary Packing | 193 | 1.17 h | 1.01 – 1.33 |
| Flaking | 73 | 3.88 h | 2.83 – 4.93 |

**Bootstrap**, a CI without formulas, by resampling:

```python
rng = np.random.default_rng(1)
boot = [rng.choice(ppk, len(ppk)).mean() for _ in range(5000)]
np.percentile(boot, [2.5, 97.5])      # about [1.02, 1.33]
```

### Why it works

A 95 % CI is a range built by a method that captures the true value 95 % of the time. Wider means less certain: Flaking's interval is wide because there are fewer breakdowns and they vary more. **Always report a CI with an MTTR or MTBF based on a few dozen events.** "3.9 h, but it could be anywhere from 2.8 to 4.9" is far more honest than "3.88 h".

The **bootstrap** pretends your sample is the population, resamples it thousands of times, and looks at how much the mean wobbles. It works for medians, percentiles and anything else, with no distribution assumptions.

---

## Session 2 (1.5 h): Hypothesis tests

The logic: assume **no difference** (the *null hypothesis*). If data at least this extreme would be very unlikely under that assumption (p < 0.05), reject it.

### Do it

**1. Are flaking repairs really longer than packing?**

```python
stats.ttest_ind(flk, ppk, equal_var=False)     # Welch t-test: p ≈ 0.0000025
stats.mannwhitneyu(flk, ppk)                   # rank test, no normality needed: p ≈ 4e-13
```

Yes, overwhelmingly. (Use Mann-Whitney when the data is skewed, which repair times always are.)

**2. Is Primary Packing's PM compliance really worse? (H1 2026)**

```python
wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["due_date", "completed_date"])
pm = wo[wo["wo_type"] == "PM"].merge(assets, on="asset_id")
pm["on_time"] = pm["completed_date"].le(pm["due_date"])
h1 = pm[pm["due_date"].between("2026-01-01", "2026-06-30")]
table = pd.crosstab(h1["zone_code"] == "PPK", h1["on_time"])
stats.chi2_contingency(table)[:2]       # chi2 ≈ 91.9, p ≈ 1e-21
```

356 of 550 on time (64.7 %) vs 1,729 of 2,073 (83.4 %) for the rest of the line. That's not chance.

**3. Did breakdowns really fall this year?**

H1 2025 had **261** reactive jobs. H1 2026 had **236**, which is 10 % fewer. If the underlying rate hadn't changed, each failure would be equally likely to land in either half-year:

```python
stats.binomtest(236, 261 + 236, 0.5).pvalue     # ≈ 0.28
```

**p = 0.28. This is not evidence of improvement.** A 10 % swing happens by chance more than a quarter of the time. Anyone claiming credit for it, or blaming someone for the reverse, is reading noise.

### Why it works (and what p-values are not)

- p = the probability of seeing data this extreme **if there were no real effect**.
- It is **not** the probability that the effect is real.
- p > 0.05 does **not** prove "no effect". It means "not enough evidence yet". More data might show it.
- With huge data sets, tiny unimportant differences become "significant". Always ask **how big** the difference is, too (the *effect size*), and whether it matters in £ or hours.

---

## Weekend (2 h)

1. **CI for flow wrapper MTBF**: the failures are a count, so use the chi-square method for MTBF bounds. Look up *"MTBF confidence interval chi-square"*, implement it with `stats.chi2.ppf`, and compare it with a bootstrap of the days between failures.
2. **Days vs Nights**: do breakdowns take longer to fix on night shift? (Use 06:00–18:00 = Days on `start_datetime`.) Run Mann-Whitney. Report the medians and the p-value in one sentence.
3. **A before/after design.** Imagine the jaw replacement interval on flow wrappers changes on 1 July. Write down *before* you'd see any data: what you'll measure, over how long, which test you'll use, and what result would convince you. (This is how you avoid fooling yourself. Decide the test first.)
4. Khan Academy: *Confidence intervals* and *Significance tests (hypothesis testing)*.

---

## Watch

- **StatQuest**: *"StatQuest p-values clearly explained"*, *"StatQuest confidence intervals"*, *"StatQuest bootstrapping"*.
- **StatQuest**: *"StatQuest t-test"* and *"StatQuest Mann-Whitney"* (or the Wilcoxon rank-sum test).

---

## Check yourself

1. A colleague says "p = 0.03, so there's a 97 % chance the new PM works". What's wrong?
2. Why is the Flaking MTTR CI much wider than Packing's?
3. Why use Mann-Whitney rather than a t-test for repair times?
4. Breakdowns fell from 261 to 236. Write the one-sentence version you'd say in a meeting.

<details>
<summary><strong>Answers</strong></summary>

1. A p-value isn't the probability the hypothesis is true. p = 0.03 means "if the PM had no effect, results this good would happen 3 % of the time". That's evidence, but not a 97 % guarantee. Prior plausibility, effect size and study design all matter.
2. Fewer events (73 vs 193) and more variation (some flaking jobs take 20 hours). The CI width scales with std ÷ √n.
3. Repair times are heavily right-skewed. Mann-Whitney compares ranks, so it doesn't assume normality and isn't dominated by a few huge values.
4. "We've had about 10 % fewer breakdowns than last year, but that's within normal variation (p ≈ 0.3), so we can't say yet that anything has actually improved."

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1's t-interval and bootstrap CIs for PPK and FLK MTTR, the three Session 2 tests (Welch and Mann-Whitney, chi-square on PPK compliance, the binomial test giving p ≈ 0.28), and weekend item 3: your before/after test plan, written before any data.
- **On your phone (10 min a day):** Watch the StatQuest videos on p-values, confidence intervals, bootstrapping, the t-test and Mann-Whitney, read "Why it works (and what p-values are not)", do the Khan Academy confidence interval and significance test units, and say Check yourself answer 4 out loud. The weekend item 3 test plan works on paper.
- **Safe to skip this week:** Weekend item 1 (the chi-square MTBF interval) and item 2 (Days against Nights repair times) can be skipped this week.

---

## Tick off

- [ ] MTTR with 95 % CIs, both by formula and by bootstrap
- [ ] t-test, Mann-Whitney, chi-square and binomial rate test run and interpreted
- [ ] Can explain what a p-value is *not*
- [ ] Before/after test plan written for a PM change
