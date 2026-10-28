# Week 43: Descriptive statistics and distributions

**Phase 6 · Statistics & reliability analytics** · Mon 23 Aug – Sun 29 Aug 2027 · about 5 hours

**Phase 6 goal:** defend a PM interval change **with numbers**, in front of an engineering manager.

This is the phase that turns "good with data" into reliability engineering. It starts with how numbers are *spread*, because maintenance data is almost never the nice bell curve from school, and using the wrong summary leads to wrong decisions.

**By Sunday you'll be able to:**

- choose mean vs median, and explain standard deviation and percentiles
- recognise skewed data, and why averages mislead with it
- describe the normal, exponential, lognormal and Weibull distributions in plain English
- fit distributions in Python and compare them

**Work in:** `my_work\week35.ipynb`. Reference code is in [`solutions/phase-6-reliability/w43_w45_statistics.py`](../../solutions/phase-6-reliability/w43_w45_statistics.py).

---

## Session 1 (1.5 h): Summarising spread

### Do it

```python
import pandas as pd, numpy as np
from scipy import stats
from pathlib import Path
DATA = Path("..") / "data"

dt = pd.read_csv(DATA / "csv" / "downtime_events.csv")
d = dt.loc[dt["category"] == "Breakdown", "duration_min"]
d.describe().round(1)
stats.skew(d), d.quantile([0.5, 0.9, 0.99])
```

| Stat | Value (minutes) |
|---|---|
| count | 710 |
| mean | 111.7 |
| median (50 %) | **73** |
| std | 129.9 |
| 90th percentile | 242 |
| max | 1,375 |
| skew | 4.4 |

**The mean (112) is 50 % higher than the median (73).** A handful of very long jobs drag the mean up. If someone asks "how long is a typical breakdown?", the honest answer is **about 73 minutes; 1 in 10 takes over 4 hours**.

Plot it: `d.plot.hist(bins=50)`, then on a log scale `np.log10(d).plot.hist(bins=30)`. The log version looks almost symmetrical, which is a clue for Session 2.

### Why it works

- **Mean** = add up and divide. It's sensitive to outliers. Use it when the total matters (total downtime = mean × count).
- **Median** = the middle value. It's robust. Use it to describe a "typical" case.
- **Standard deviation** = the typical distance from the mean. With skewed data it's hard to interpret on its own.
- **Percentiles** (P90, P95) answer planning questions directly: "how long should we allow for 90 % of jobs?"
- **Skew > 1** means a long right tail. Repair times, downtime and costs are almost always right-skewed.

---

## Session 2 (1.5 h): Four distributions every reliability engineer uses

| Distribution | Shape | Typical maintenance use |
|---|---|---|
| **Normal** | symmetric bell | measurement error, fill weights, dimensions (Week 46 SPC) |
| **Exponential** | steep decay, *memoryless* | time between **random** failures (electronics, many controls faults). Constant failure rate. |
| **Lognormal** | right-skewed, log is normal | **repair times**, fatigue crack growth |
| **Weibull** | flexible: shape β changes everything | **time to failure** of components. The workhorse of reliability (Weeks 48–49). |

### Do it: which fits repair time best?

```python
for name, dist in [("norm", stats.norm), ("expon", stats.expon),
                   ("lognorm", stats.lognorm), ("weibull_min", stats.weibull_min)]:
    params = dist.fit(d) if name == "norm" else dist.fit(d, floc=0)
    ll = np.sum(dist.logpdf(d, *params))
    k = len(params) - (0 if name == "norm" else 1)
    print(f"{name:12} AIC = {2*k - 2*ll:,.0f}")
```

| Distribution | AIC (lower is better) |
|---|---|
| normal | 8,929 |
| exponential | 8,118 |
| Weibull | 8,108 |
| **lognormal** | **7,949** ✅ |

Lognormal wins clearly, which is the textbook result for repair times. The normal distribution is the worst, because it would predict *negative* repair times.

### Why it works

**AIC** (Akaike Information Criterion) scores how well a distribution fits, with a penalty for extra parameters. Compare it only between fits to the **same** data. Always look at a plot too: overlay the fitted curves on the histogram, or use a probability plot (Week 48).

The **exponential** distribution's "memoryless" property means a part that has run 1,000 hours is as likely to fail in the next hour as a new one. That's true for random failures, and it's why **time-based replacement can't help them**. Hold on to that idea; it's the core of Weeks 48–49.

---

## Weekend (2 h)

1. **Khan Academy Statistics**: [khanacademy.org/math/statistics-probability](https://www.khanacademy.org/math/statistics-probability). Do the units *Summarizing quantitative data* and *Modeling data distributions*.
2. Describe the **labour hours** of reactive jobs: mean, median, P90 and skew. Which zone has the most variable repair effort? Use the coefficient of variation, std ÷ mean.
3. Fit lognormal and Weibull to reactive labour hours and compare the AICs.
4. For **flow wrappers**, compute the days between successive breakdowns (any failure code) and plot the histogram. Does it look exponential? (It should, roughly. Mixing several failure modes together tends to look random. Week 48 separates them.)

---

## Watch

- **StatQuest with Josh Starmer** (YouTube): *"StatQuest histograms"*, *"StatQuest the normal distribution"*, *"StatQuest mean variance standard deviation"*. It's the clearest stats teaching anywhere.
- **3Blue1Brown**: *"3Blue1Brown binomial distributions probability"*, for intuition.
- Book: *Practical Statistics for Data Scientists* (O'Reilly), chapter 1.

---

## Check yourself

1. Your manager wants "average downtime per breakdown" for a budget. Mean or median?
2. Why can't a normal distribution model repair times?
3. What does "memoryless" mean for a failure mode, and what does it imply for PM?
4. Why compare AIC only between fits on the same data?

<details>
<summary><strong>Answers</strong></summary>

1. For a **budget** (a total), use the **mean**: total = mean × count. To describe a *typical* job, use the median. Say which one you're using.
2. It's symmetric and allows negative values, while repair times are positive and right-skewed.
3. The chance of failing in the next hour doesn't depend on age. Replacing the part early gives no benefit, because a new one is as likely to fail. Look for condition monitoring, redesign, or run to failure instead.
4. AIC is based on likelihood, whose size depends on the data set. Comparing across data sets is meaningless.

</details>

---

## Tick off

- [ ] Can explain why mean ≠ median for downtime (112 vs 73 min)
- [ ] Percentiles used to answer a planning question
- [ ] Four distributions described in my own words
- [ ] Lognormal found to be the best fit for repair time, by AIC
- [ ] Khan Academy units done
