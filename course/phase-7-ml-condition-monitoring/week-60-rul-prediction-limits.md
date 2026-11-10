# Week 60: Remaining useful life (RUL) prediction, and its limits

**Phase 7 · Machine learning & condition monitoring** · Mon 20 Dec – Sun 26 Dec 2027 · about 5 hours

"How long has it got?" is the question every manager asks once an alarm goes off. **Remaining useful life (RUL)** models try to answer it. This week you'll build one, then learn the most important lesson about RUL: **it's only useful close to failure, and its uncertainty matters more than its average.**

**By Sunday you'll be able to:**

- frame RUL as a regression problem
- train and evaluate a RUL model with MAE, by RUL band
- explain why RUL error is huge far from failure and small near it
- present RUL as a range with confidence, not a single date
- describe the NASA C-MAPSS benchmark

---

## Session 1 (1.5 h): A RUL model

### Do it

```python
import pandas as pd, numpy as np
from pathlib import Path
from sklearn.model_selection import GroupShuffleSplit
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error
DATA = Path("..") / "data"

df = pd.read_csv(DATA / "ml" / "bearing_fleet.csv").sort_values(["bearing_id", "day"])
for c in ["rms_velocity_mm_s", "kurtosis", "temp_c"]:
    df[f"{c}_r7"] = df.groupby("bearing_id")[c].transform(lambda s: s.rolling(7, min_periods=1).mean())
    df[f"{c}_d7"] = df.groupby("bearing_id")[c].diff(7)
df = df.dropna()
X = df.drop(columns=["bearing_id", "day", "rul_days", "fail_within_14d"])
y = df["rul_days"]

tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=0).split(X, y, df["bearing_id"]))
rf = RandomForestRegressor(n_estimators=300, min_samples_leaf=5, random_state=0, n_jobs=-1)
rf.fit(X.iloc[tr], y.iloc[tr])
pred, true = rf.predict(X.iloc[te]), y.iloc[te]
mean_absolute_error(true, pred)
```

**Overall MAE ≈ 51 days.** It sounds poor. Now split it by how far from failure each reading was:

```python
for lo, hi in ((0, 30), (30, 90), (90, 500)):
    m = (true >= lo) & (true < hi)
    print(f"true RUL {lo}-{hi} d: MAE {mean_absolute_error(true[m], pred[m]):.1f} days")
```

| True RUL | MAE |
|---|---|
| 0–30 days | **3.5 days** |
| 30–90 days | 38 days |
| 90+ days | 62 days |

Plot predicted against true RUL for 3 test bearings. The prediction is **flat** while the bearing is healthy, then **drops onto the true line** once degradation starts.

---

## Session 2 (1.5 h): Why RUL is hard

### The physics

Before a defect starts (P on the P-F curve), a healthy bearing gives **no information** about when it will fail. Healthy ones all look the same. So any model can only guess something like the *average* life. Once degradation begins, the trend carries real information, and the error collapses.

**So:** RUL is a tool for **"we have an alarm, so when should we plan the job?"**, not for "how long will this healthy bearing last?". For healthy units, the right tool is your **Weibull** model from Phase 6: a population-level probability, not an individual prediction.

### Present it honestly

Never say "it will fail on 14 March". Give a range. A simple way to get one from a random forest is to use the spread of the individual trees' predictions:

```python
all_trees = np.stack([t.predict(X.iloc[te].to_numpy()) for t in rf.estimators_])
lo, hi = np.percentile(all_trees, [10, 90], axis=0)
```

Check how often the true RUL falls inside [lo, hi]. If it's far from 80 %, the band is mis-calibrated. That's a known weakness of this quick method; *quantile regression* or *conformal prediction* do it properly.

*"Probably 10–20 days; plan the change for next week's stop"* is a statement people can act on.

### NASA C-MAPSS

The standard RUL benchmark is turbofan engine simulations from NASA. It has many sensors, run-to-failure trajectories in train, and test engines cut off at a random point. Search *"NASA C-MAPSS turbofan dataset"*. It's a good stretch project, and it appears in many papers, so you can compare your results with published ones.

---

## Weekend (2 h)

1. **Piecewise RUL target**: many papers cap RUL at a maximum, e.g. `y_capped = y.clip(upper=60)`, meaning "healthy, > 60 days". Retrain. Does the 0–30 day error improve? Why does that make sense physically?
2. **Interval coverage**: calculate the 10–90 % band coverage for readings with true RUL under 30 days.
3. **Decision rule**: write a rule that a planner could use. For example: *"When the anomaly detector alarms, run the RUL model daily; when the lower bound falls below 14 days, schedule the replacement in the next planned stop."*
4. (Optional) Download C-MAPSS FD001 and fit the same random forest. Compare your RMSE with published baselines (search *"C-MAPSS FD001 RMSE benchmark"*).

---

## Watch

- Search *"remaining useful life prediction explained"* and *"prognostics and health management introduction"*.
- Search *"conformal prediction intervals explained"*. It's an advanced but very practical way to get honest uncertainty bands.

---

## Check yourself

1. Why is RUL error so large when the bearing is healthy?
2. What's the right tool for "how long will a healthy bearing last?"
3. Why give a range instead of a date?
4. How does RUL connect to the P-F curve?

<details>
<summary><strong>Answers</strong></summary>

1. Before degradation starts, the sensor readings are the same for a bearing with 300 days left as for one with 100 days left. There's no signal to learn from, only the population average.
2. A **Weibull** (or other life distribution) model of the population: "there's a 10 % chance of failing by day 40" (Phase 6). It's probabilistic, not individual.
3. The uncertainty is real and large. A single date creates false confidence: if the bearing fails early, people stop trusting the system, and if it fails late, parts get changed too early. A range supports planning ("within the next two planned stops").
4. RUL models only work in the P-F interval, after the defect is detectable. The anomaly detector finds P, and the RUL model then estimates where on the way to F the bearing is.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1's RUL random forest with MAE split by RUL band (3.5, 38 and 62 days) and the predicted against true plot for 3 test bearings, Session 2's tree-spread interval with its coverage checked, and weekend item 3, your planner-friendly decision rule.
- **On your phone (10 min a day):** Read "The physics" and "Present it honestly" in Session 2, watch a "remaining useful life prediction explained" video, answer Check yourself in your head, and draft the weekend item 3 decision rule on paper.
- **Safe to skip this week:** Weekend item 1 (the capped RUL target), item 2 (coverage under 30 days only), the optional C-MAPSS download and the conformal prediction video can be skipped.

---

## Tick off

- [ ] RUL random forest trained, MAE reported by RUL band
- [ ] Can explain the "flat then dropping" prediction shape
- [ ] Prediction interval from tree spread, with coverage checked
- [ ] Planner-friendly decision rule written
