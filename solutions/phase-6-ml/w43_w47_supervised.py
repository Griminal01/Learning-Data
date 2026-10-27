"""Weeks 43-47: supervised ML on the bearing fleet. Predict 'fails within 14 days'."""
from pathlib import Path
import numpy as np
import pandas as pd
from sklearn.model_selection import GroupShuffleSplit, GroupKFold, cross_val_score, train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import make_pipeline
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.metrics import confusion_matrix, precision_score, recall_score, f1_score, average_precision_score

DATA = Path(__file__).resolve().parents[2] / "data"
df = pd.read_csv(DATA / "ml" / "bearing_fleet.csv")
FEATURES = ["rms_velocity_mm_s", "peak_accel_g", "crest_factor", "kurtosis", "temp_c"]
# Trend features: change over the last 7 days per bearing
df = df.sort_values(["bearing_id", "day"])
for c in ["rms_velocity_mm_s", "kurtosis", "temp_c"]:
    df[f"{c}_d7"] = df.groupby("bearing_id")[c].diff(7)
    df[f"{c}_r7"] = df.groupby("bearing_id")[c].transform(lambda s: s.rolling(7, min_periods=1).mean())
df = df.dropna()
FEAT2 = FEATURES + [c for c in df.columns if c.endswith(("_d7", "_r7"))]
X, y, groups = df[FEAT2], df["fail_within_14d"], df["bearing_id"]
print("rows", len(df), "bearings", groups.nunique(), "positive rate", round(y.mean(), 3))

# The leakage trap: random row split vs split by bearing
Xa, Xb, ya, yb = train_test_split(X, y, test_size=0.25, random_state=0, stratify=y)
leaky = RandomForestClassifier(n_estimators=200, random_state=0, n_jobs=-1).fit(Xa, ya)
print("random-row split F1", round(f1_score(yb, leaky.predict(Xb)), 3))

gss = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=0)
tr, te = next(gss.split(X, y, groups))
Xtr, Xte, ytr, yte = X.iloc[tr], X.iloc[te], y.iloc[tr], y.iloc[te]
print("test bearings", groups.iloc[te].nunique())


def report(name, pred, proba=None):
    tn, fp, fn, tp = confusion_matrix(yte, pred).ravel()
    ap = average_precision_score(yte, proba) if proba is not None else float("nan")
    print(f"{name:22} TP={tp:4} FP={fp:4} FN={fn:4} TN={tn:5}  precision={precision_score(yte, pred):.2f} "
          f"recall={recall_score(yte, pred):.2f} F1={f1_score(yte, pred):.2f} PR-AUC={ap:.2f}")


report("baseline: always no", np.zeros(len(yte), int))
report("rule: RMS >= 4.5", (Xte["rms_velocity_mm_s"] >= 4.5).astype(int))
report("rule: RMS7 >= 4.5", (Xte["rms_velocity_mm_s_r7"] >= 4.5).astype(int))
models = {
    "logistic": make_pipeline(StandardScaler(), LogisticRegression(max_iter=2000, class_weight="balanced")),
    "tree depth 3": DecisionTreeClassifier(max_depth=3, class_weight="balanced", random_state=0),
    "random forest": RandomForestClassifier(n_estimators=300, min_samples_leaf=5, class_weight="balanced", random_state=0, n_jobs=-1),
    "gradient boosting": HistGradientBoostingClassifier(random_state=0, class_weight="balanced"),
}
for name, m in models.items():
    m.fit(Xtr, ytr)
    report(name, m.predict(Xte), m.predict_proba(Xte)[:, 1])

cv = cross_val_score(models["random forest"], X, y, groups=groups, cv=GroupKFold(5), scoring="average_precision")
print("RF GroupKFold PR-AUC", cv.round(2), round(cv.mean(), 3))
imp = pd.Series(models["random forest"].feature_importances_, index=FEAT2).sort_values(ascending=False)
print(imp.head(6).round(3).to_dict())
tree = models["tree depth 3"]
from sklearn.tree import export_text
print(export_text(tree, feature_names=FEAT2, max_depth=2))

# Threshold choice for the RF
p = models["random forest"].predict_proba(Xte)[:, 1]
for t in (0.3, 0.5, 0.7):
    report(f"RF threshold {t}", (p >= t).astype(int), p)
