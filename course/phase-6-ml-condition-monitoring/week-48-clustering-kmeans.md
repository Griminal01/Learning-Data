# Week 48: Unsupervised learning, clustering assets with k-means

**Phase 6 · Machine learning & condition monitoring** · Mon 27 Sep – Sun 3 Oct 2027 · about 5 hours

Unsupervised learning finds structure **without labels**. You don't tell it what to look for. This week you'll cluster Line D's 292 assets by their maintenance behaviour, and find natural groups that could each get a different maintenance strategy.

**By Sunday you'll be able to:**

- build an asset "profile" table from CMMS data
- scale features and run k-means
- choose k with the elbow method and silhouette scores
- name and interpret clusters, and turn them into strategy

Reference code is in [`solutions/phase-6-ml/w48_w52_unsupervised_signals_rul.py`](../../solutions/phase-6-ml/w48_w52_unsupervised_signals_rul.py).

---

## Session 1 (1.5 h): Profiles and k-means

### Do it

```python
import pandas as pd, numpy as np
from pathlib import Path
from sklearn.preprocessing import StandardScaler
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
DATA = Path("..") / "data"

wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["due_date", "completed_date"])
dt = pd.read_csv(DATA / "csv" / "downtime_events.csv")
assets = pd.read_csv(DATA / "csv" / "assets.csv")
r = wo[wo["wo_type"] == "Reactive"]
pm = wo[wo["wo_type"] == "PM"].assign(on_time=lambda t: t["completed_date"].le(t["due_date"]))

prof = pd.DataFrame({
    "breakdowns":  r.groupby("asset_id").size(),
    "mttr_hrs":    dt[dt["category"] == "Breakdown"].groupby("asset_id")["duration_min"].mean() / 60,
    "pm_on_time":  pm.groupby("asset_id")["on_time"].mean(),
    "minor_stops": dt[dt["category"] == "Minor stop"].groupby("asset_id").size(),
}).reindex(assets["asset_id"]).fillna({"breakdowns": 0, "mttr_hrs": 0, "minor_stops": 0, "pm_on_time": 1})

Z = StandardScaler().fit_transform(prof)
for k in range(2, 7):
    km = KMeans(n_clusters=k, n_init=10, random_state=0).fit(Z)
    print(k, round(km.inertia_), round(silhouette_score(Z, km.labels_), 3))
```

| k | inertia | silhouette |
|---|---|---|
| 2 | 768 | 0.42 |
| 3 | 606 | 0.37 |
| **4** | **450** | **0.39** |
| 5 | 382 | 0.30 |
| 6 | 336 | 0.29 |

The **elbow** is at k = 4 (a big drop in inertia, and silhouette holds up). k = 2 scores higher on silhouette but just splits "bad actors" from "the rest", which is too coarse to act on.

### Why it works

k-means places k centres and assigns each asset to the nearest one, then moves each centre to the middle of its assets, and repeats. **Scaling is essential**: without it, minor-stop counts (up to ~100) would swamp PM on-time (0–1). **Inertia** is the total distance to the centres, which always falls as k grows. Look for the bend. **Silhouette** (−1 to 1) measures how well separated the clusters are.

---

## Session 2 (1.5 h): Name the clusters

### Do it

```python
km = KMeans(n_clusters=4, n_init=10, random_state=0).fit(Z)
prof["cluster"] = km.labels_
summary = prof.groupby("cluster").mean().round(2)
summary["n"] = prof.groupby("cluster").size()
summary
prof.join(assets.set_index("asset_id")["asset_type"]).groupby("cluster")["asset_type"].value_counts().groupby(level=0).head(3)
```

| Cluster | n | Breakdowns | MTTR (h) | PM on time | Minor stops | Mostly… | A name |
|---|---|---|---|---|---|---|---|
| 0 | 170 | 2.3 | 0.96 | 87 % | 9 | conveyors, sensors | **Steady majority** |
| 1 | 44 | 3.2 | **4.80** | 83 % | 9 | drive motors, flaking rolls, gearboxes | **Rare but long** |
| 2 | 13 | **20.8** | 0.92 | 70 % | **49** | flow wrappers, label printers, case packers | **Bad actors** |
| 3 | 65 | 3.4 | 1.29 | **68 %** | 44 | packing/EOL conveyors, servos, cylinders | **Stop-start packing kit** |

(Cluster numbers can come out in a different order on your PC, but the groups will be the same.)

### Turn clusters into strategy

| Cluster | Strategy |
|---|---|
| Steady majority | keep the current PM, and review whether some inspections could be stretched (free up labour) |
| Rare but long | **spares and repair planning**: critical spares on the shelf, repair procedures, condition monitoring (vibration and oil on gearboxes and motors) |
| Bad actors | **RCA and redesign focus** (Week 41: jaws and jams), weekly review |
| Stop-start packing kit | minor-stop elimination (SMED, sensor setup, guarding) and **fixing PM compliance** in packing |

---

## Weekend (2 h)

1. **Visualise**: run PCA to 2D (`from sklearn.decomposition import PCA`) and scatter the assets coloured by cluster. Label the bad actors.
2. **Add features**: criticality (A=3, B=2, C=1) and asset age. Do the clusters change? Do they still make sense?
3. **Try DBSCAN** (`sklearn.cluster.DBSCAN`), which finds dense groups and marks outliers as −1. Which assets does it call outliers?
4. Write a one-page **"asset segmentation"** note for the PM pillar: four groups, what defines each, and the strategy for each. It's a genuinely useful document at work.

---

## Watch

- **StatQuest**: *"StatQuest k-means clustering"*, *"StatQuest PCA main ideas"*.
- **scikit-learn docs**: search *"scikit-learn clustering overview"*.

---

## Check yourself

1. Why scale before k-means?
2. Why not just pick the k with the highest silhouette score?
3. Cluster labels change between runs (0 becomes 2). Is that a problem?
4. How is this different from sorting assets by breakdowns and taking the top 10?

<details>
<summary><strong>Answers</strong></summary>

1. k-means uses distances. Features with big numbers would dominate and features with small ranges would be ignored. Scaling gives each feature equal say.
2. Silhouette rewards clean separation, not usefulness. k = 2 is the cleanest, but it lumps very different assets together. Choose a k that's well separated **and** actionable.
3. No. The labels are arbitrary names. Interpret clusters by their **profiles**, not their numbers, and fix `random_state` for repeatability.
4. A top-10 uses one dimension. Clustering uses several together, so it separates "fails rarely but takes 5 hours" from "fails constantly but takes 1 hour", which need different strategies.

</details>

---

## Tick off

- [ ] Asset profile table built from CMMS data
- [ ] k chosen with elbow plus silhouette (k = 4)
- [ ] Clusters named and mapped to strategies
- [ ] PCA scatter and a one-page segmentation note
