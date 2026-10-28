# Week 61: Phase 7 build, the bearing anomaly detector

**Phase 7 · Machine learning & condition monitoring** · Mon 27 Dec 2027 – Sun 2 Jan 2028 · about 5 hours

Everything from Phases 5–7 comes together: a reusable **anomaly detector** that learns each bearing's normal, scores drift across several features, alarms only on persistent change, and is **evaluated honestly**: how much warning, and how many false alarms. It's built so you can point it at real condition-monitoring exports by changing one function.

**Reference solution:** [`solutions/phase-7-ml/anomaly_detector.py`](../../solutions/phase-7-ml/anomaly_detector.py). Build your own version in `my_work\`, then compare.

---

## Session 1 (1.5 h): Design and core functions

### The design

```
load_*()      →  standard table: bearing_id, t (day index), features…
score()       →  per-bearing robust z-score vs baseline (median/MAD), smoothed, max across features
alarms()      →  True when score ≥ threshold for N consecutive readings
evaluate_*()  →  lead time per failure, false alarms, misses
plot()        →  score vs time with the threshold line
```

**Why median/MAD?** It's robust (Week 57): a few odd readings in the baseline period don't distort "normal".

**Why the max across features?** Different faults show first in different features: kurtosis for early impacts, RMS for spreading damage, temperature late. Taking the worst z-score means any of them can raise the alarm.

### Do it

Write `score()` and `alarms()`, then test them on `bearing_trend.csv` until the two failed bearings break away from the healthy four. (Use the reference solution's chart as a target.)

---

## Session 2 (1.5 h): Evaluate on the fleet

**Two test sets:**

1. **The fleet** (`data/ml/bearing_fleet.csv`): 60 bearings, each run to failure. For each one: did it alarm? How many days before failure? Did it alarm **too early** (say > 150 days before failure), which counts as a false alarm because that alarm wasn't really about this failure?
2. **The site trend** (`bearing_trend.csv`): alarms on B2 and B5, and **silence** on B1, B3, B4 and B6.

### Choose the threshold, with numbers

```powershell
python solutions\phase-7-ml\anomaly_detector.py --threshold 4
python solutions\phase-7-ml\anomaly_detector.py --threshold 6
python solutions\phase-7-ml\anomaly_detector.py --threshold 8
```

| Threshold | Fleet detected | Fleet false alarms | Median warning | Site B2 / B5 warning | Healthy site bearings alarmed |
|---|---|---|---|---|---|
| 4 | 58 / 60 | **2** | 67 d | 96 / 52 d | **1 (B4)** ⚠️ |
| **6** | **60 / 60** | **0** | **62 d** | **85 / 48 d** | **0** ✅ |
| 8 | 60 / 60 | 0 | 56 d | 79 / 44 d | 0 |

**Threshold 6 with 3-reading persistence** catches every failure with a median of ~2 months' warning and no false alarms in either test set. A lower threshold buys a few days and costs false alarms. A higher one gives up warning time for nothing.

Compare with the fixed 2.8 mm/s ISO-style alert from Week 41 (B2 64 d, B5 30 d): the detector gives **+3 weeks** on both.

---

## Weekend (2 h): Make it production-shaped

1. **Config, not code**: move the threshold, persistence and baseline days into a small JSON or YAML file the script reads. Changing a setting shouldn't need a code edit.
2. **Re-baseline**: add a `rebaseline_after` option that takes a list of maintenance dates per bearing and restarts the baseline 7 days after each one.
3. **Add Week 59's spectral features** if you have waveform data: band energy share and envelope amplitude at BPFO.
4. **Output an alarm list** as a CSV (bearing, first alarm date, score, which feature fired) in a form a planner could read, or a CMMS could import as notifications.
5. **Write the alarm explanation**: for each alarm, one sentence, e.g. *"DRY-FAN-B5: vibration (RMS) and spikiness (kurtosis) both about 7× their normal spread for 3 days (first 29/12/2025). Bearing damage likely; confirm with a handheld check and plan a bearing change within ~6 weeks."*

---

## Check yourself

1. Why evaluate on two different data sets?
2. Why call an alarm > 150 days before failure "false"?
3. Threshold 4 gives slightly more warning. Why not use it?
4. What has to change to run this on real CM data?

<details>
<summary><strong>Answers</strong></summary>

1. The fleet measures detection and lead time over many failures. The site file checks behaviour on **healthy** machines, where false alarms come from. You need both kinds of evidence.
2. An alarm that early isn't a useful warning of *this* failure. It's either noise or something unrelated, and it would have sent someone out for nothing. (The cut-off is a judgement call. State it.)
3. It alarmed on a healthy bearing (B4) and twice too early in the fleet. Each false alarm costs a callout and, worse, **trust**. After a few, people start ignoring alarms, and then real ones get missed.
4. Only `load_*()`: map the export's columns to `bearing_id`, `t`/`date` and feature names, and handle gaps (sensors drop readings). Then re-evaluate thresholds on **your** machines once you have a few real events. Don't assume the synthetic settings transfer.

</details>

---

## Tick off

- [ ] `score()`, `alarms()` and `evaluate()` written and tested
- [ ] Threshold chosen with the evaluation table (6, persistence 3)
- [ ] 60/60 detected, 0 false alarms, median ~62 days' warning
- [ ] Config file, alarm CSV and plain-English alarm sentences
