# Week 41: Vibration trend analysis

**Phase 5 · Python for data** · Mon 9 Aug – Sun 15 Aug 2027 · about 5 hours

Condition monitoring produces exactly the kind of data Excel struggles with: lots of readings, many sensors, and you need trends, thresholds and "how much warning did we get?". This week you build a reusable trend analysis, ready to point at real vibration-system exports once they exist.

**By Sunday you'll be able to:**

- trend overall vibration (RMS velocity) per bearing, with rolling smoothing
- apply alert and alarm limits, both absolute and relative to baseline
- measure the **warning time** each alarm gave before failure
- explain the P-F interval with your own data

**Data:** `data/vibration/bearing_trend.csv`. That's daily readings from 6 dryer fan bearings, July 2025 – June 2026. Two of them degrade and fail.

**Reference solution:** [`solutions/phase-5-python/vibration_trend.py`](../../solutions/phase-5-python/vibration_trend.py)

---

## Session 1 (1.5 h): Explore and trend

### Do it

```python
import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path
DATA = Path("..") / "data"

v = pd.read_csv(DATA / "vibration" / "bearing_trend.csv", parse_dates=["date"])
v.info()
v.groupby("bearing_id")[["rms_velocity_mm_s", "kurtosis", "temp_c"]].agg(["min", "median", "max"]).round(2)
v[v["status"] == "Failed"]
```

Bearings **B2** and **B5** have a `Failed` row. B5 failed on 15 Feb 2026, and B2 on 26 May 2026. Their readings stop there.

```python
v = v.sort_values(["bearing_id", "date"])
v["rms_7d"] = v.groupby("bearing_id")["rms_velocity_mm_s"].transform(lambda s: s.rolling(7, min_periods=1).mean())

fig, ax = plt.subplots(figsize=(9, 4.5))
for bid, g in v.groupby("bearing_id"):
    failed = (g["status"] == "Failed").any()
    ax.plot(g["date"], g["rms_7d"], color="#C62828" if failed else "#9E9E9E",
            linewidth=2 if failed else 1, label=bid if failed else None)
ax.legend(frameon=False)
ax.set_ylabel("RMS velocity, 7-day mean (mm/s)")
```

### Why it works

**`transform`** applies a function per group but returns a result the same length as the original, so it lines up row for row. That's what you want for a rolling value per bearing. (`agg` would collapse it to one row per bearing.)

**Overall RMS velocity** (mm/s) is the standard "how rough is it running" number for rotating machines. It's good at catching imbalance, misalignment and looseness, and late-stage bearing damage. **Kurtosis** and **crest factor** react to the sharp impacts of an *early* bearing defect, often before RMS rises. Compare when each one starts to climb.

---

## Session 2 (1.5 h): Alarms and warning time

### Limits

Two common approaches. Use both.

1. **Absolute limits** from a standard. ISO 10816-3 / ISO 20816-3 give guide values for industrial machines by size and foundation type. For a medium machine on a rigid foundation, typical zone boundaries are about **1.4 / 2.8 / 4.5 mm/s RMS** (good / acceptable / alert / alarm). *Check the standard and your site's CM policy for the real values for each machine.*
2. **Relative to baseline**: alarm when the trend reaches, for example, **2× its own normal**. This works even when you don't know the right absolute value for a machine, and it catches change early on machines that normally run very smoothly.

### Do it

```python
v["baseline"] = v.groupby("bearing_id")["rms_velocity_mm_s"].transform(lambda s: s.iloc[:30].median())
v["x_baseline"] = v["rms_7d"] / v["baseline"]

def first_date(df, col, limit):
    return df[df[col] >= limit].groupby("bearing_id")["date"].min()

fail = v[v["status"] == "Failed"].set_index("bearing_id")["date"]
summary = pd.DataFrame({
    "alert_2.8": first_date(v, "rms_7d", 2.8),
    "alarm_4.5": first_date(v, "rms_7d", 4.5),
    "2x_baseline": first_date(v, "x_baseline", 2.0),
    "failed": fail,
})
for c in ["alert_2.8", "alarm_4.5", "2x_baseline"]:
    summary[f"warn_days_{c}"] = (summary["failed"] - summary[c]).dt.days
summary
```

**Expected:**

| Bearing | Alert (2.8) | Alarm (4.5) | 2× baseline | Failed | Warning from alert | from alarm |
|---|---|---|---|---|---|---|
| DRY-FAN-B2 | 23 Mar 2026 | 23 Apr 2026 | 7 Apr 2026 | 26 May 2026 | **64 days** | 33 days |
| DRY-FAN-B5 | 16 Jan 2026 | 3 Feb 2026 | 17 Jan 2026 | 15 Feb 2026 | **30 days** | 12 days |

The four healthy bearings never crossed any limit. That's **no false alarms**, which matters as much as catching the real ones.

### Why it matters: the P-F interval

The **P-F curve**: a defect starts (P = *potential* failure, detectable) and eventually becomes a functional failure (F). The **P-F interval** is the warning time you get. Your inspection interval must be **shorter** than the P-F interval, often half of it, or you'll miss failures between checks.

Here B5's alert gave only 30 days of warning. **A monthly vibration route could miss it entirely.** That's the argument for continuous wireless sensors on critical fans, made with your own numbers. You'll go deeper in Phase 6.

---

## Weekend (2 h): Package it

1. Turn your notebook into `my_work\vibration_trend.py`, with `load_readings()`, `add_trend_features()`, `summarise()` and `plot()`, and argparse options for `--csv`, `--alert` and `--alarm`. Keep `load_readings()` as the **only** function that knows the file layout. When real exports arrive, only that function changes.
2. Add kurtosis to the plot (a second subplot). Does kurtosis rise before RMS for B5?
3. **Optional, real data:** the **NASA IMS bearing** run-to-failure data set (search *"NASA prognostics data repository IMS bearing"*) has raw vibration snapshots from real test-rig bearings running to failure. It's large (~6 GB unzipped). If you download it, compute RMS per snapshot file and trend it with your same functions. Phase 7 uses it again.

---

## Watch

- **Mobius Institute** (YouTube): search *"Mobius Institute P-F curve"* and *"Mobius Institute vibration analysis basics"*.
- Search *"overall vibration trending ISO 10816 explained"* and pick a short explainer from a CM vendor or reliability channel.

---

## Check yourself

1. Why use a 7-day rolling mean before comparing to limits?
2. Why have a relative (× baseline) limit as well as an absolute one?
3. B5 gave 30 days' warning from the alert limit. What's the longest route interval that would reliably catch it?
4. Why keep the file-reading logic in a single function?

<details>
<summary><strong>Answers</strong></summary>

1. Daily readings are noisy. One spike shouldn't trigger an alarm. Smoothing trades a few days of reaction time for far fewer false alarms. (Real CM systems often require *n* consecutive readings over the limit for the same reason.)
2. Machines differ: a bearing that normally runs at 1.0 mm/s and rises to 2.5 has doubled (worth acting on) but is still under an absolute 2.8 alert. A relative limit catches change. An absolute limit catches machines that are simply rough.
3. Roughly half the P-F interval, so about **2 weeks**. With monthly routes, the reading before failure might be taken before the defect is detectable, and the next one after the bearing has already failed.
4. So the analysis can be reused on any data source, whether a different CM system's export or the NASA data, by changing one function. That's called *separating I/O from logic*.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1's 7-day trend with `transform` and the failed bearings highlighted, Session 2's absolute and 2× baseline limits with the warning-days table (64 and 30 days from the alert), and weekend step 1 packaging it as `vibration_trend.py` with argparse. Week 42's portfolio uses that script.
- **On your phone (10 min a day):** Watch the Mobius Institute P-F curve and vibration basics videos, read "Why it matters: the P-F interval" and the RMS versus kurtosis note, and answer Check yourself in your head. At work, ask what alert and alarm limits your site's CM policy uses.
- **Safe to skip this week:** Weekend step 2 (the kurtosis subplot) and step 3 (the optional NASA IMS download) can be skipped.

---

## Tick off

- [ ] Trend plotted with `transform` + rolling, failed bearings highlighted
- [ ] Absolute and baseline-relative limits applied
- [ ] Warning-days table matching the expected values
- [ ] Can explain the P-F interval and route frequency using your own data
- [ ] Packaged as `vibration_trend.py` with argparse
