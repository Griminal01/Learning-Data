# Week 46: Decision trees and random forests

**Phase 6 · Machine learning & condition monitoring** · Mon 13 Sep – Sun 19 Sep 2027 · about 5 hours

Decision trees think like a fault-finding flowchart: *"Is temperature above 45 °C? → Is RMS rising? → …"*. That makes them the most explainable non-linear model. **Random forests** combine hundreds of trees for accuracy. This week you'll build both, read a tree like a fault-finding guide, and find which features matter.

**By Sunday you'll be able to:**

- train, read and plot a decision tree
- explain how a random forest reduces overfitting (bagging plus random features)
- use feature importance (impurity-based and permutation), and know its pitfalls
- tune `max_depth` and `min_samples_leaf`

---

## Session 1 (1.5 h): A tree you can read

### Do it

(Use the feature set and bearing split from Week 45.)

```python
from sklearn.tree import DecisionTreeClassifier, export_text, plot_tree
import matplotlib.pyplot as plt

tree = DecisionTreeClassifier(max_depth=3, class_weight="balanced", random_state=0).fit(X_train, y_train)
print(export_text(tree, feature_names=FEATURES))

plt.figure(figsize=(14, 6))
plot_tree(tree, feature_names=FEATURES, class_names=["OK", "fail<14d"], filled=True, fontsize=8)
```

The first split is on **`temp_c ≤ 45.3 °C`**. Below that, the tree checks whether **RMS has risen more than ~0.74 mm/s in 7 days**. Read it like a fault-finding chart and write it out in plain English.

**Score**: depth-3 tree TP 207, FP 109, FN 3. That's precision 0.66, recall 0.99, F1 0.79. It beats the RMS rule (0.74), but it's noisier than logistic regression (0.84).

### Why it works

At each node the tree picks the feature and cut-off that best **separate** the classes (the biggest drop in "impurity"). Deep trees keep splitting until every leaf is pure, which means memorising noise. **Limit the depth** (or `min_samples_leaf`) to keep them general.

---

## Session 2 (1.5 h): Random forest

### Do it

```python
from sklearn.ensemble import RandomForestClassifier
rf = RandomForestClassifier(n_estimators=300, min_samples_leaf=5, class_weight="balanced",
                            random_state=0, n_jobs=-1).fit(X_train, y_train)
```

**Score**: TP 209, FP 59, FN 1. That's precision 0.78, recall 1.00, **F1 0.87**.

**Feature importance:**

```python
import pandas as pd
pd.Series(rf.feature_importances_, index=FEATURES).sort_values(ascending=False).head(6)
```

You'll see `temp_c` (≈ 0.28) and `temp_c_r7` (≈ 0.21) at the top, then `rms_velocity_mm_s`, `peak_accel_g` and `kurtosis_r7`.

**Permutation importance**, which is more trustworthy: shuffle one feature in the **test** set and see how much the score drops.

```python
from sklearn.inspection import permutation_importance
pi = permutation_importance(rf, X_test, y_test, scoring="average_precision", n_repeats=10, random_state=0)
pd.Series(pi.importances_mean, index=FEATURES).sort_values(ascending=False).head(6)
```

### Why it works

A random forest trains many trees, each on a random **bootstrap sample** of rows (Week 36's bootstrap again) and considering a random subset of features at each split. Each tree overfits differently, and **averaging** cancels much of it out. It's robust, needs little tuning, and is a sensible default for tabular data.

**Importance pitfalls:**

- Impurity importance favours features with many distinct values, and splits credit between **correlated** features (`temp_c` vs `temp_c_r7`).
- Neither kind is *causation*. Temperature ranks top because, in this synthetic data, temperature rises cleanly with damage. On real fans, temperature often rises **late**, so you'd expect vibration features to matter more. **Always ask whether the importances make engineering sense.**

---

## Weekend (2 h)

1. **Depth sweep**: train trees with `max_depth` 1–12 and plot train vs test F1. Where does overfitting start?
2. **Forest tuning**: try `min_samples_leaf` in (1, 5, 20, 50). Use `GroupKFold` CV, not a single split.
3. **Drop temperature**: retrain the forest without `temp_c*` features. How much does it lose? That's a realistic test, since many wireless vibration sensors measure temperature at the sensor, which lags.
4. **Explain one alarm**: pick a test bearing's first alarm day, and look at its feature values against the tree's thresholds. Write the explanation a technician would accept.
5. Kaggle Learn: **Intermediate Machine Learning** ([kaggle.com/learn/intermediate-machine-learning](https://www.kaggle.com/learn/intermediate-machine-learning)), lessons 1–4.

---

## Watch

- **StatQuest**: *"StatQuest decision trees"*, *"StatQuest random forests part 1"*, *"StatQuest random forests part 2"*.
- **scikit-learn docs**: search *"permutation importance vs impurity importance scikit-learn"*.

---

## Check yourself

1. How does a random forest overfit less than a single deep tree?
2. Why might `temp_c` and `temp_c_r7` *both* look important, or split the credit between them?
3. Why use permutation importance on the **test** set?
4. Why does the top feature here (temperature) worry you, from a real-world point of view?

<details>
<summary><strong>Answers</strong></summary>

1. Each tree sees a different bootstrap sample and random feature subsets, so their errors are partly independent. Averaging many noisy-but-different trees reduces variance.
2. They carry almost the same information (highly correlated). The forest uses whichever one is available in each tree, so the credit gets spread across both, and dropping either alone may hardly change the score.
3. It measures how much the model relies on a feature **for predictions on new data**. Training-set importance can reward features the model has overfitted.
4. On real machines, bearing temperature usually rises late in the failure process, close to F on the P-F curve, so it gives little warning. The synthetic data makes it unrealistically early and clean. A model that leans on it could disappoint on real data.

</details>

---

## Tick off

- [ ] Depth-3 tree read and written out as a fault-finding rule
- [ ] Random forest F1 ≈ 0.87 on unseen bearings
- [ ] Impurity and permutation importance compared
- [ ] Tested the forest without temperature features
