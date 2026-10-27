# Week 45: Linear and logistic regression in scikit-learn

**Phase 6 · Machine learning & condition monitoring** · Mon 6 Sep – Sun 12 Sep 2027 · about 5 hours

You met regression for *explaining* things in Week 37 (statsmodels). This week it's used for *predicting* things in scikit-learn, the standard ML library. You'll also learn the scikit-learn workflow (pipelines, scaling, fit/predict) that every later model uses.

**By Sunday you'll be able to:**

- use the scikit-learn API: `fit`, `predict`, `predict_proba`, `score`
- build a `Pipeline` with `StandardScaler`
- train logistic regression for "fails within 14 days" and read its coefficients
- engineer **trend features** (rolling mean, 7-day change), the biggest win in condition monitoring

---

## Session 1 (1.5 h): Feature engineering first

A single day's reading says "how rough is it now". A **trend** says "it's getting worse", and that's what predicts failure.

### Do it

```python
import pandas as pd, numpy as np
from pathlib import Path
DATA = Path("..") / "data"

df = pd.read_csv(DATA / "ml" / "bearing_fleet.csv").sort_values(["bearing_id", "day"])
for c in ["rms_velocity_mm_s", "kurtosis", "temp_c"]:
    df[f"{c}_r7"] = df.groupby("bearing_id")[c].transform(lambda s: s.rolling(7, min_periods=1).mean())
    df[f"{c}_d7"] = df.groupby("bearing_id")[c].diff(7)       # change over 7 days
df = df.dropna()

FEATURES = ["rms_velocity_mm_s", "peak_accel_g", "crest_factor", "kurtosis", "temp_c"] + \
           [c for c in df.columns if c.endswith(("_r7", "_d7"))]
X, y, groups = df[FEATURES], df["fail_within_14d"], df["bearing_id"]
```

Every feature is calculated **only from past and present readings of the same bearing**, so there's no peeking into the future. `diff(7)` within `groupby` makes sure one bearing's data never leaks into another's.

---

## Session 2 (1.5 h): Logistic regression with a pipeline

### Do it

```python
from sklearn.model_selection import GroupShuffleSplit
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler
from sklearn.linear_model import LogisticRegression

tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=0).split(X, y, groups))
X_train, X_test, y_train, y_test = X.iloc[tr], X.iloc[te], y.iloc[tr], y.iloc[te]

logit = make_pipeline(StandardScaler(),
                      LogisticRegression(max_iter=2000, class_weight="balanced"))
logit.fit(X_train, y_train)
pred = logit.predict(X_test)
```

**Result** (15 unseen bearings): TP 210, FP 82, FN 0. That's precision 0.72, recall **1.00**, F1 **0.84**, already better than the RMS rule (0.74).

**Coefficients**: what the model learned:

```python
coefs = pd.Series(logit[-1].coef_[0], index=FEATURES).sort_values()
coefs
```

Because the features are **standardised** (mean 0, sd 1), the coefficients are comparable: bigger means more influence, and positive means it raises the chance of failure. The trend features (`_d7`, `_r7`) and temperature should stand out.

### Why it works

- **Logistic regression** is linear regression squashed through an S-curve into a probability between 0 and 1. It's simple, fast, explainable, and often hard to beat.
- **StandardScaler** puts every feature on the same scale. Without it, temperature (around 40) would dominate kurtosis (around 3) just because of units.
- **The Pipeline** fits the scaler on training data only, then applies the same scaling to test data. Fitting a scaler on all the data is another subtle leak.
- **`class_weight="balanced"`** tells the model that the rare class (failures) matters, instead of letting it hide behind 95 % "no".

---

## Weekend (2 h)

1. **Linear regression for RUL**: predict `rul_days` from the same features with `LinearRegression`. Look at the mean absolute error (MAE) and plot predicted vs actual. Where is it worst? (Week 52 picks this up.)
2. **Feature ablation**: retrain logistic regression with only the 5 raw features (no trends). How much worse is F1? That's the value of feature engineering, which is usually worth more than a fancier model.
3. **Simplest useful model**: logistic regression on **two** features only, `rms_velocity_mm_s_d7` and `temp_c_d7`. Plot the decision boundary. Could a technician understand this rule?
4. Coursera ML Specialization, course 1, week 3 (logistic regression).

---

## Watch

- **StatQuest**: *"StatQuest logistic regression"* and *"StatQuest regularization ridge lasso"*.
- **scikit-learn docs**: search *"scikit-learn pipelines and composite estimators"*.
- Géron, chapter 4 (training models).

---

## Check yourself

1. Why must the scaler be fitted on training data only?
2. What does a positive standardised coefficient on `temp_c_d7` mean?
3. Why is a 7-day change often a better feature than today's value?
4. When would you choose logistic regression over a random forest, even if the forest scores slightly better?

<details>
<summary><strong>Answers</strong></summary>

1. If you scale using test data, the training process has "seen" the test data's mean and spread, which is a leak. The pipeline prevents it automatically.
2. A faster rise in bearing temperature over the last week increases the predicted chance of failure within 14 days, holding the other features fixed.
3. Different bearings have different "normal" levels. Change from *its own* recent past removes that difference and captures degradation, which is what the P-F curve is about.
4. When explainability matters (you need to justify alarms to technicians and managers), when data is limited, or when it must run in a simple system (even a PLC or Excel could evaluate a linear formula).

</details>

---

## Tick off

- [ ] Rolling and 7-day-change features engineered per bearing
- [ ] Logistic regression pipeline, F1 ≈ 0.84 on unseen bearings
- [ ] Coefficients interpreted
- [ ] Feature ablation shows the value of trend features
