# Week 43: Machine learning basics, and the leakage trap

**Phase 6 · Machine learning & condition monitoring** · Mon 23 Aug – Sun 29 Aug 2027 · about 5 hours

**Phase 6 goal:** an anomaly detector that flags bearing degradation before failure, and the ability to explain to a non-specialist **why its alerts are worth acting on and how many false alarms to expect**.

ML comes last on purpose. In maintenance, real failure data is scarce, so good trending and thresholds (Phases 4–5) often beat a model. You're learning ML to know **when it's worth it**, not to use it everywhere.

**By Sunday you'll be able to:**

- explain supervised vs unsupervised learning, features, labels, training and testing
- train your first scikit-learn model
- explain overfitting, and why you **always** compare with a simple baseline
- spot **data leakage**, and split by asset rather than by row

**Data:** `data/ml/bearing_fleet.csv`. That's 60 bearings run to failure, with daily readings (RMS, peak, crest factor, kurtosis, temperature), the remaining useful life (`rul_days`), and a label `fail_within_14d`.

> **Health warning:** this is synthetic data, and it's much cleaner than real data. The scores you get here will be far higher than on real plant data. The *methods* transfer; the numbers don't.

---

## Session 1 (1.5 h): The vocabulary and a first model

| Term | Meaning here |
|---|---|
| **Features (X)** | the inputs: RMS, kurtosis, temperature… |
| **Label (y)** | what we want to predict: `fail_within_14d` (1/0) |
| **Supervised** | learn from examples where the answer is known |
| **Unsupervised** | find structure with no answers given (clusters, anomalies; Weeks 48–49) |
| **Classification / regression** | predict a category / predict a number (like RUL, Week 52) |
| **Training / test set** | learn on one part, judge on data the model has **never seen** |

### Do it

```python
import pandas as pd
from pathlib import Path
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier
DATA = Path("..") / "data"

df = pd.read_csv(DATA / "ml" / "bearing_fleet.csv")
df["fail_within_14d"].mean()        # ≈ 0.05: only 5 % of days are 'about to fail'

X = df[["rms_velocity_mm_s", "peak_accel_g", "crest_factor", "kurtosis", "temp_c"]]
y = df["fail_within_14d"]
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)

tree = DecisionTreeClassifier(max_depth=3, random_state=0).fit(X_train, y_train)
tree.score(X_test, y_test)          # accuracy
```

You'll get about **98.7 %** accuracy. **Now compare it with the dumbest possible model, "never predict failure":**

```python
(y_test == 0).mean()                # ≈ 0.95
```

95 % accuracy for doing nothing. **Accuracy is useless when failures are rare.** Next week replaces it with precision and recall.

---

## Session 2 (1.5 h): Overfitting and leakage

### Overfitting

```python
for depth in (1, 2, 3, 5, 10, None):
    t = DecisionTreeClassifier(max_depth=depth, random_state=0).fit(X_train, y_train)
    print(depth, round(t.score(X_train, y_train), 3), round(t.score(X_test, y_test), 3))
```

As the depth grows, the **training** score heads to 100 % (depth unlimited: 1.000) while the **test** score falls (98.7 % → 97.9 %). The model is memorising, not learning. **Only the test score counts.**

### The leakage trap

The split above shuffles **days** at random. So the model trains on day 200 of bearing B007 and is tested on day 201 of the same bearing. It's being tested on bearings it has already seen, which is like marking your own homework. In real use, you predict **new bearings**.

Split by **bearing** instead:

```python
from sklearn.model_selection import GroupShuffleSplit
gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=0)
train_idx, test_idx = next(gss.split(X, y, groups=df["bearing_id"]))
X_train, X_test = X.iloc[train_idx], X.iloc[test_idx]
y_train, y_test = y.iloc[train_idx], y.iloc[test_idx]
df["bearing_id"].iloc[test_idx].nunique()     # 15 bearings held out completely
```

With the full feature set in the reference solution, a random forest scores F1 ≈ **0.90** with the leaky row split and ≈ **0.87** split by bearing. The gap is small here because the synthetic data is clean. **On real data, leakage routinely turns a useless model into a "95 % accurate" one.**

### Why it works

**Leakage** is any way information from the test set (or the future) gets into training. Common forms in maintenance:

- the same asset in both train and test
- features calculated *after* the event (labour hours on the breakdown WO, used to "predict" the breakdown)
- random splits on time series, so the model learns from the future

The rule: **split the way you'll use it**. For new assets, split by asset. For future periods, train on the past and test on later dates.

---

## Weekend (2 h)

1. **Kaggle Learn: Intro to Machine Learning** ([kaggle.com/learn/intro-to-machine-learning](https://www.kaggle.com/learn/intro-to-machine-learning)), all lessons.
2. Start **Andrew Ng's Machine Learning Specialization** on Coursera (free to audit): [coursera.org/specializations/machine-learning-introduction](https://www.coursera.org/specializations/machine-learning-introduction). Watch course 1, week 1.
3. Redo this week's tree with a **time-based** split: train on each bearing's days up to day 150 and test on later days. What changes, and why is this still not quite right for "new bearings"?
4. Write 5 lines: where at work could ML genuinely help, and where would a threshold or a Weibull do the job better?

---

## Watch

- **StatQuest**: *"StatQuest machine learning fundamentals"*, *"StatQuest decision trees"*, *"StatQuest bias and variance"*.
- **3Blue1Brown**: *"3Blue1Brown but what is a neural network"*. It's not used in this course, but it's great context.
- Book: *Hands-On Machine Learning with Scikit-Learn, Keras & TensorFlow* by Aurélien Géron, chapters 1–2.

---

## Check yourself

1. Why is 95 % accuracy meaningless here?
2. What's overfitting, and how do you detect it?
3. Give two ways data leakage can happen with maintenance data.
4. You'll use the model on the **new** fans being installed next year. How should you split?

<details>
<summary><strong>Answers</strong></summary>

1. 95 % of days are "not about to fail", so predicting "never" scores 95 % while catching zero failures.
2. The model fits noise in the training data: a high training score with a much lower test score. Detect it by comparing train and test, or with cross-validation (next week).
3. The same asset (or the same failure event) appearing in both train and test; features only known after the event (repair labour, a WO closed as "bearing"); a random split of a time series.
4. By **bearing/asset**, ideally holding out whole machines, or better still a whole later batch, so the test mimics "never seen before".

</details>

---

## Tick off

- [ ] Can explain features, labels, train/test, supervised vs unsupervised
- [ ] Saw that accuracy ≈ the "always no" baseline
- [ ] Overfitting shown with tree depth
- [ ] Re-split by bearing with `GroupShuffleSplit`
- [ ] Kaggle Intro to ML done
