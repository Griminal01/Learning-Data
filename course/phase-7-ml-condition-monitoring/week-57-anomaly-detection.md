# Week 57: Anomaly detection, finding "not normal" without failure labels

**Phase 7 · Machine learning & condition monitoring** · Mon 29 Nov – Sun 5 Dec 2027 · about 5 hours

Supervised models need many labelled failures, which you rarely have. **Anomaly detection** only needs examples of **normal** running: learn what "healthy" looks like, then flag anything that drifts away. That's how most real condition-monitoring analytics work, and it's the basis of your Phase 7 build.

**By Sunday you'll be able to:**

- build a baseline-based detector (z-score against each machine's own normal)
- use scikit-learn's **Isolation Forest**
- add a **persistence filter** to stop single-reading false alarms
- measure lead time and false alarms on real-shaped data

**Data:** `data/vibration/bearing_trend.csv`, the 6 dryer fan bearings from Week 41.

---

## Session 1 (1.5 h): Baseline z-scores

### Do it

```python
import pandas as pd, numpy as np
from pathlib import Path
DATA = Path("..") / "data"

v = pd.read_csv(DATA / "vibration" / "bearing_trend.csv", parse_dates=["date"]).sort_values(["bearing_id", "date"])
F = ["rms_velocity_mm_s", "kurtosis", "temp_c", "crest_factor"]
v["d"] = v.groupby("bearing_id").cumcount()

# 'Normal' = each bearing's first 90 days
train = v[v["d"] < 90]
base = train.groupby("bearing_id")[F].agg(["mean", "std"])
z = pd.DataFrame({f: (v[f] - v["bearing_id"].map(base[(f, "mean")]))
                      / v["bearing_id"].map(base[(f, "std")]) for f in F})
v["z_flag"] = (z.abs() > 4).any(axis=1)

# Persistence: alarm only after 3 flagged readings in a row
v["z_alarm"] = v.groupby("bearing_id")["z_flag"].transform(lambda s: s.rolling(3).sum() >= 3)
first = v[v["z_alarm"]].groupby("bearing_id")["date"].min()
fail = v[v["status"] == "Failed"].set_index("bearing_id")["date"]
pd.DataFrame({"first_alarm": first, "failed": fail}).assign(lead_days=lambda t: (t["failed"] - t["first_alarm"]).dt.days)
```

| Bearing | First alarm | Failed | Lead |
|---|---|---|---|
| DRY-FAN-B2 | 24 Feb 2026 | 26 May 2026 | **91 days** |
| DRY-FAN-B5 | 22 Dec 2025 | 15 Feb 2026 | **55 days** |
| B1, B3, B4, B6 (healthy) | none | | **0 false alarms** |

Compare that with Week 41's fixed 2.8 mm/s alert, which gave **64** and **30** days. Learning *each bearing's own normal* gives roughly **4 extra weeks** of warning.

### Why it works

A fixed limit treats every machine the same. A baseline detector asks *"is this machine unlike its own past?"*, which catches change much earlier, especially on machines that normally run smoothly. Using several features at once (vibration, kurtosis, temperature) catches different failure signatures.

---

## Session 2 (1.5 h): Isolation Forest

### Do it

```python
from sklearn.ensemble import IsolationForest
iso = IsolationForest(n_estimators=300, contamination=0.01, random_state=0).fit(train[F])
v["iso_flag"] = iso.predict(v[F]) == -1          # -1 = anomaly
v["iso_alarm"] = v.groupby("bearing_id")["iso_flag"].transform(lambda s: s.rolling(3).sum() >= 3)
```

**Result:** B2 alarms 18 Feb (97 days' lead) and B5 on 18 Dec (59 days). There are no alarms on the healthy bearings.

### Why it works

Isolation Forest builds random trees that split the data at random. **Unusual points get isolated in fewer splits**, so a short average path means an anomaly. It handles several features together and needs no labels. `contamination` is your guess at the share of anomalies in the training data, and it sets the threshold.

### Compare

| Method | B2 lead | B5 lead | False alarms | Explain to a technician? |
|---|---|---|---|---|
| Fixed 2.8 mm/s alert (Week 41) | 64 d | 30 d | 0 | ✅ easy |
| Baseline z > 4, 3 in a row | 91 d | 55 d | 0 | ✅ "4× its normal spread, three days running" |
| Isolation Forest, 3 in a row | 97 d | 59 d | 0 | ⚠️ harder |

The simple z-score gets **most of the benefit**, and you can explain it in one sentence. That's usually the right first deployment.

---

## Weekend (2 h)

1. **Threshold sweep**: try z thresholds of 3, 4, 5 and 6, and persistence of 1, 3 and 5. Make a table of lead days and false alarms. Where does it start crying wolf?
2. **Robust baseline**: replace mean/std with median/MAD (`(x - median).abs().median() * 1.4826`). Why is that safer if the baseline period accidentally includes a few bad readings?
3. **Which feature fired first?** For B5, find the first day each feature's |z| exceeded 4. Does kurtosis lead RMS? (That's the early-impact signature from Week 41.)
4. **Read**: the scikit-learn docs page *"Novelty and Outlier Detection"*.

---

## Watch

- Search *"isolation forest explained"*.
- Search *"anomaly detection predictive maintenance baseline"*. Vendor webinars (SKF, Emerson, AVEVA) often show this exact approach.

---

## Check yourself

1. Why does anomaly detection suit maintenance better than supervised learning, at first?
2. What does the persistence filter trade away, and what does it gain?
3. A machine is overhauled and its vibration drops permanently. What happens to your detector, and what should you do?
4. The baseline period is the first 90 days. When would that be a bad choice?

<details>
<summary><strong>Answers</strong></summary>

1. You need examples of **normal**, which you have plenty of, not labelled failures, which are rare. It works from day one on a new sensor once a baseline exists.
2. It costs a couple of days of reaction time and gains far fewer false alarms from single noisy readings. That's usually a good trade, given that the P-F interval is weeks long.
3. The baseline is now wrong. Lower readings might look "anomalous", or real degradation might take longer to stand out against the old, rougher baseline. **Re-baseline after any maintenance intervention or change in operating condition.**
4. If the machine was already degrading, newly installed (running-in), or running at a different speed or load then. The baseline must be known-good, representative running.

</details>

---

## Tick off

- [ ] Baseline z-score detector with persistence (91 / 55 days' lead, 0 false alarms)
- [ ] Isolation Forest detector built and compared
- [ ] Threshold and persistence sweep table
- [ ] Robust (median/MAD) baseline tried
