# Week 55: Gradient boosting, tuning, and "is ML worth it?"

**Phase 7 · Machine learning & condition monitoring** · Mon 15 Nov – Sun 21 Nov 2027 · about 5 hours

Gradient boosting is usually the most accurate model for tabular data. It wins most Kaggle competitions on spreadsheets. This week you'll train it, tune hyperparameters properly with grouped cross-validation, and then answer the question that matters: **is the improvement over a simple rule worth the complexity?**

**By Sunday you'll be able to:**

- train `HistGradientBoostingClassifier`
- tune hyperparameters with `GridSearchCV` + `GroupKFold`
- compare all your models fairly in one table
- make (and defend) a "rule vs model" recommendation

---

## Session 1 (1.5 h): Boosting

### Do it

```python
from sklearn.ensemble import HistGradientBoostingClassifier
gb = HistGradientBoostingClassifier(random_state=0, class_weight="balanced").fit(X_train, y_train)
```

**Score** (15 unseen bearings): TP 206, FP 29, FN 4. That's precision **0.88**, recall 0.98, **F1 0.93**, the best so far.

### Why it works

A random forest builds trees **independently** and averages them. Boosting builds them **one after another**: each new small tree focuses on the mistakes the previous trees made. `learning_rate` controls how big each correction is, and `max_iter` sets how many trees. It's powerful, but **easier to overfit** than a forest, so validation matters more.

---

## Session 2 (1.5 h): Tuning properly

### Do it

```python
from sklearn.model_selection import GridSearchCV, GroupKFold
grid = {
    "learning_rate": [0.03, 0.1, 0.3],
    "max_depth": [3, None],
    "min_samples_leaf": [20, 100],
}
search = GridSearchCV(HistGradientBoostingClassifier(random_state=0, class_weight="balanced"),
                      grid, cv=GroupKFold(5), scoring="average_precision", n_jobs=-1)
search.fit(X_train, y_train, groups=groups.iloc[tr])
search.best_params_, round(search.best_score_, 3)
```

Then evaluate `search.best_estimator_` **once** on the held-out test bearings.

### The golden rule

The test set is for **one final check**. If you tune on it ("try settings until the test score looks good"), it stops being a fair test, and your reported score is optimistic. Tune with CV on the training bearings only.

---

## Weekend (2 h): The comparison and the decision

Fill in this table on the same 15 test bearings:

| Approach | Precision | Recall | F1 | Explainable? | Effort to maintain |
|---|---|---|---|---|---|
| Rule: RMS ≥ 4.5 mm/s | 0.69 | 0.79 | 0.74 | ✅ very | none |
| Rule: RMS 7-day mean ≥ 4.5 | 0.73 | 0.68 | 0.71 | ✅ very | none |
| Logistic regression | 0.72 | 1.00 | 0.84 | ✅ mostly | low |
| Decision tree (depth 3) | 0.66 | 0.99 | 0.79 | ✅ yes | low |
| Random forest | 0.78 | 1.00 | 0.87 | ⚠️ partly | medium |
| Gradient boosting | 0.88 | 0.98 | 0.93 | ⚠️ partly | medium |
| **Your tuned GB** | | | | | |

Then write a **half-page recommendation**:

- What does the best model gain over the RMS alarm, in plant terms (more failures caught, fewer false alarms)?
- What would it cost: a data pipeline, retraining, someone to own it, and explaining alarms?
- **What's the honest risk?** This is clean synthetic data. On real data with sensor dropouts, different machines and only a handful of real failures, the gap may shrink or disappear.
- Your recommendation. A strong answer is often: *"Start with trend-based rules (Week 41) plus a simple anomaly detector (Week 61). Collect labelled failures for a year. Revisit supervised ML when there are at least 20–30 real failures of the same type."*

---

## Watch

- **StatQuest**: *"StatQuest gradient boost part 1"* and *"StatQuest XGBoost part 1"* (the same family).
- **scikit-learn docs**: search *"HistGradientBoostingClassifier"* and *"GridSearchCV"*.
- Kaggle Learn Intermediate ML: the *XGBoost* and *Data Leakage* lessons.

---

## Check yourself

1. What's the difference between bagging (random forest) and boosting?
2. Why mustn't you tune hyperparameters on the test set?
3. GB scores F1 0.93 vs 0.74 for the rule. Give two reasons the real-world gap might be much smaller.
4. When is a model clearly worth deploying over a rule?

<details>
<summary><strong>Answers</strong></summary>

1. Bagging trains trees independently on resampled data and averages them, which reduces variance. Boosting trains trees in sequence, each correcting the previous errors, which reduces bias. Boosting is usually more accurate but more sensitive to tuning and noise.
2. Each tuning decision based on the test score leaks test information into the model choice, so the final test score is no longer an unbiased estimate of performance on new data.
3. Any two of: real data is noisier (dropouts, mounting changes, speed and load variation); there are far fewer real failures to learn from; failure modes differ between machines; the synthetic features (especially temperature) are unrealistically clean; and the "14-day" label is fuzzy in reality.
4. When it beats the rule by a margin that matters **in £ or hours** on realistic validation (grouped, time-ordered), the alarms can be explained well enough for people to act on them, and someone owns the pipeline, monitoring and retraining.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1's gradient boosting on the bearing split (F1 about 0.93), Session 2's `GridSearchCV` with `GroupKFold` on the training bearings and one final test, then the weekend comparison table and your half-page "rule vs model" recommendation.
- **On your phone (10 min a day):** Watch the StatQuest gradient boost and XGBoost videos, read "Why it works" and the golden rule on the test set, answer Check yourself in your head, and draft the half-page recommendation on paper, starting from the four bullet questions.
- **Safe to skip this week:** The Kaggle XGBoost and Data Leakage lessons and the scikit-learn docs pages can wait.

---

## Tick off

- [ ] Gradient boosting trained (F1 ≈ 0.93)
- [ ] Hyperparameters tuned with GroupKFold CV, test used once
- [ ] The full comparison table filled in
- [ ] Half-page "rule vs model" recommendation written
