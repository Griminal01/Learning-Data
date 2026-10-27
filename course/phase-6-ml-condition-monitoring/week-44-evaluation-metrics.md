# Week 44: Evaluation, precision, recall and the cost of false alarms

**Phase 6 · Machine learning & condition monitoring** · Mon 30 Aug – Sun 5 Sep 2027 · about 5 hours

The phase goal ends with *"…and how many false alarms to expect"*. This week gives you the language for that. When failures are rare, **precision and recall** matter far more than accuracy, and choosing the alarm threshold is a **business decision** about the cost of a missed failure vs the cost of a wasted callout.

**By Sunday you'll be able to:**

- read a confusion matrix
- calculate and explain precision, recall and F1
- use precision-recall curves and choose a threshold
- cross-validate properly with `GroupKFold`
- turn model metrics into "alarms per month" and "failures caught"

Reference code is in [`solutions/phase-6-ml/w43_w47_supervised.py`](../../solutions/phase-6-ml/w43_w47_supervised.py).

---

## Session 1 (1.5 h): The confusion matrix

|  | Predicted: fail soon | Predicted: OK |
|---|---|---|
| **Actually failed soon** | **TP**: caught it ✅ | **FN**: missed it ❌ (breakdown) |
| **Actually OK** | **FP**: false alarm ⚠️ (wasted check) | **TN**: correctly quiet |

- **Precision** = TP ÷ (TP + FP): *"when it alarms, how often is it right?"* Low precision means people stop trusting it.
- **Recall** = TP ÷ (TP + FN): *"of the real failures, how many did it catch?"* Low recall means breakdowns get through.
- **F1** = the harmonic mean of the two, a single number for comparing models.

### Do it

Using the bearing-split train/test from last week, plus the 7-day trend features (`_r7` rolling means and `_d7` 7-day changes; copy the feature code from the reference solution):

```python
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score
def report(name, pred):
    tn, fp, fn, tp = confusion_matrix(y_test, pred).ravel()
    print(f"{name:20} TP={tp} FP={fp} FN={fn}  P={precision_score(y_test, pred):.2f} "
          f"R={recall_score(y_test, pred):.2f} F1={f1_score(y_test, pred):.2f}")

report("always no", np.zeros(len(y_test), int))
report("rule RMS >= 4.5", (X_test["rms_velocity_mm_s"] >= 4.5).astype(int))
```

| Model (15 unseen bearings, daily rows) | TP | FP | FN | Precision | Recall | F1 |
|---|---|---|---|---|---|---|
| Always "no" | 0 | 0 | 210 | – | 0.00 | 0.00 |
| **Rule: RMS ≥ 4.5 mm/s** (the ISO-style alarm) | 166 | 73 | 44 | 0.69 | 0.79 | **0.74** |

**The simple alarm rule is a strong baseline.** Any ML model has to beat 0.74 to be worth its complexity.

---

## Session 2 (1.5 h): Thresholds and cross-validation

### Probability, then threshold

Most classifiers output a **probability**. You choose the cut-off:

```python
from sklearn.ensemble import RandomForestClassifier
rf = RandomForestClassifier(n_estimators=300, min_samples_leaf=5, class_weight="balanced",
                            random_state=0, n_jobs=-1).fit(X_train, y_train)
p = rf.predict_proba(X_test)[:, 1]
for t in (0.3, 0.5, 0.7):
    report(f"RF threshold {t}", (p >= t).astype(int))
```

| Threshold | FP | FN | Precision | Recall |
|---|---|---|---|---|
| 0.3 | 103 | 0 | 0.67 | 1.00 |
| 0.5 | 59 | 1 | 0.78 | 1.00 |
| 0.7 | 37 | 6 | 0.85 | 0.97 |

A **lower threshold** catches everything but cries wolf more. A **higher threshold** gives fewer false alarms but misses more. **There is no free lunch, only a choice.**

### Precision-recall curve

```python
from sklearn.metrics import PrecisionRecallDisplay
PrecisionRecallDisplay.from_predictions(y_test, p)
```

The area under it (*average precision*, PR-AUC) summarises the whole trade-off. Here it's ≈ 0.98, but remember: synthetic data.

### Cross-validation by group

One split can be lucky. **GroupKFold** rotates which bearings are held out:

```python
from sklearn.model_selection import GroupKFold, cross_val_score
scores = cross_val_score(rf, X, y, groups=df["bearing_id"], cv=GroupKFold(5), scoring="average_precision")
scores.round(2), scores.mean()      # five folds of ≈ 0.96–0.98
```

Report the **spread** as well as the mean: it tells you how much the result depends on which bearings you happened to test on.

---

## Weekend (2 h): Translate it into plant language

Nobody on the shop floor cares about F1. Translate:

1. The test set is 15 bearings over about 4,500 bearing-days. At threshold 0.5 there were **59 false-alarm days**. Per bearing-month, that's about 59 ÷ (4,484 ÷ 30) ≈ **0.4 false-alarm days per bearing per month**. With persistence (alarm only after 3 consecutive flags, Week 53), that drops a lot. Calculate it.
2. **Cost it.** Say a false alarm costs a 30-minute check (£40), and a missed bearing failure costs £3,000 (downtime plus secondary damage). Calculate the total cost at thresholds 0.3, 0.5 and 0.7 on the test set. Which threshold is cheapest?
3. **Event view.** Daily rows overstate things: one failing bearing produces 14 positive days. Re-score per *bearing*: did each one get **any** alarm in its last 14 days? Did any **healthy** period (RUL > 60) get an alarm?
4. Coursera ML Specialization, course 1, weeks 2–3.

---

## Watch

- **StatQuest**: *"StatQuest confusion matrix"*, *"StatQuest sensitivity and specificity"*, *"StatQuest ROC and AUC"*.
- **StatQuest**: *"StatQuest cross validation"*.
- **scikit-learn docs**: search *"scikit-learn precision recall"*.

---

## Check yourself

1. A model has precision 0.95 and recall 0.30. Describe what the maintenance team would experience.
2. Why is a precision-recall curve better than ROC when failures are rare?
3. Why cross-validate with `GroupKFold` rather than `KFold`?
4. Your manager asks, "How good is it?" Give a one-sentence answer in plant terms for the RF at threshold 0.5.

<details>
<summary><strong>Answers</strong></summary>

1. Its alarms are almost always real, so the team trusts them, but it misses 70 % of failures, so most breakdowns still happen without warning.
2. ROC uses the false positive rate, which stays tiny when negatives are huge (4,000+ healthy days), so models look great. Precision shows directly how many alarms are false.
3. `KFold` would put days from the same bearing in both train and test (leakage). `GroupKFold` keeps each bearing entirely in one fold.
4. "On bearings it had never seen, it warned about every failure but one in the final two weeks, and about 1 alarm-day in 5 was a false alarm, mostly in the days just before the real warning period."

</details>

---

## Tick off

- [ ] Confusion matrix, precision, recall and F1 calculated
- [ ] The rule baseline (F1 0.74) is the bar to beat
- [ ] Threshold trade-off table and a PR curve
- [ ] GroupKFold cross-validation with its spread
- [ ] Metrics translated into false alarms per month and £
