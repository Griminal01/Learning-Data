# Week 58: Vibration signal features, RMS, peak, crest factor and kurtosis

**Phase 7 · Machine learning & condition monitoring** · Mon 6 Dec – Sun 12 Dec 2027 · about 5 hours

So far you've used ready-made daily readings. A real sensor captures a **waveform**: thousands of acceleration samples a second. This week you calculate the standard **time-domain features** from raw waveforms yourself, and learn what each one tells you about a bearing. It links directly to sampling and signals in your Digital Principles studies.

**By Sunday you'll be able to:**

- load and plot a vibration waveform, and explain sampling rate and Nyquist
- calculate RMS, peak, peak-to-peak, crest factor and kurtosis
- explain why crest factor and kurtosis catch **early** bearing faults
- convert acceleration to velocity in principle, and know why mm/s is the standard

**Data:** `data/vibration/waveforms/`. Three 1-second captures from a fan bearing at **5,120 samples/s**, shaft speed **24.6 Hz** (1,476 rpm): `fan_bearing_healthy.csv`, `fan_bearing_early_fault.csv` and `fan_bearing_late_fault.csv`.

---

## Session 1 (1.5 h): Look at the waves

### Do it

```python
import numpy as np, pandas as pd, matplotlib.pyplot as plt
from pathlib import Path
DATA = Path("..") / "data" / "vibration" / "waveforms"

waves = {n: pd.read_csv(DATA / f"fan_bearing_{n}.csv") for n in ("healthy", "early_fault", "late_fault")}
fig, axes = plt.subplots(3, 1, figsize=(10, 7), sharex=True, sharey=True)
for ax, (name, w) in zip(axes, waves.items()):
    seg = w[w["time_s"] < 0.2]                    # first 200 ms
    ax.plot(seg["time_s"], seg["accel_g"], linewidth=0.7)
    ax.set_title(name, loc="left")
axes[-1].set_xlabel("time (s)")
```

The healthy signal is a smooth wave (shaft rotation) plus noise. The faulty signals show **sharp spikes at regular intervals**: a rolling element hitting a defect on the outer race, again and again. The late fault spikes are bigger.

### Sampling basics

- **Sampling rate fs** = 5,120 Hz, so one sample every 0.195 ms.
- **Nyquist**: you can only see frequencies up to **fs ÷ 2 = 2,560 Hz**. Higher frequencies *alias*, folding down and appearing as false lower ones. That's why sensors have anti-aliasing filters.
- **Frequency resolution** = 1 ÷ capture length = **1 Hz** for a 1-second capture.

---

## Session 2 (1.5 h): Time-domain features

### Do it

```python
from scipy import stats

def features(x):
    rms = np.sqrt(np.mean(x ** 2))
    peak = np.max(np.abs(x))
    return {
        "rms_g": rms,
        "peak_g": peak,
        "peak_to_peak_g": x.max() - x.min(),
        "crest_factor": peak / rms,
        "kurtosis": stats.kurtosis(x, fisher=False),     # 3.0 for a normal distribution
    }

pd.DataFrame({n: features(w["accel_g"].to_numpy()) for n, w in waves.items()}).T.round(2)
```

| | RMS (g) | Peak (g) | Crest factor | Kurtosis |
|---|---|---|---|---|
| healthy | 0.25 | 0.72 | 2.85 | 2.2 |
| early fault | 0.29 | 1.09 | **3.81** | 2.7 |
| late fault | 0.49 | 2.07 | 4.20 | **4.9** |

### Why it works

- **RMS** measures overall energy. It hardly moves for the early fault (+14 %), because a few short spikes don't add much energy. It rises clearly when damage is widespread.
- **Peak** and **crest factor** (peak ÷ RMS) react to **impacts**. Crest factor jumps 34 % at the early fault, **before RMS notices**. In very late stages the crest factor can *fall* again as damage spreads and RMS catches up. That's a classic trap: "crest factor dropped, it must be better" is wrong.
- **Kurtosis** measures "spikiness". About 3 is normal noise, and well above 3 means impulsive. (The healthy value is below 3 here because a pure sine wave has kurtosis 1.5, and this signal is part sine, part noise.)
- **Velocity (mm/s)** is the standard overall measure for machine health from about 10 Hz to 1 kHz (ISO 10816/20816). It's acceleration integrated once. **Acceleration (g)** emphasises high frequencies, which suits early bearing faults. You need both.

---

## Weekend (2 h)

1. **Feature over time**: split each 1-second waveform into ten 0.1 s windows and calculate the features per window. How stable is each feature? Which is the noisiest?
2. **Velocity**: integrate acceleration to velocity in the frequency domain (preview of next week), or approximately with `np.cumsum(x) / fs` after removing the mean and high-pass filtering. Calculate the RMS velocity in mm/s (1 g = 9,806.65 mm/s²).
3. **Real data (optional)**: if you downloaded the NASA IMS or Case Western bearing data, calculate these features on a few files from early and late in a test. Search *"Case Western Reserve University bearing data center"*. The files are small `.mat` files; use `scipy.io.loadmat`.
4. **Link it**: how would you get these features out of a real sensor system? Many wireless CM systems export overall values (RMS, peak) as CSV and waveforms on request. Your Week 41 script is the consumer.

---

## Watch

- **Mobius Institute**: search *"Mobius Institute crest factor kurtosis"* and *"Mobius Institute acceleration velocity displacement"*.
- Search *"Nyquist sampling aliasing explained"*.

---

## Check yourself

1. Why does RMS barely change for an early bearing fault?
2. Crest factor goes 2.9 → 3.8 → 4.2. Later still, it falls to 3.0 while RMS doubles. What's happening?
3. With fs = 5,120 Hz, can you measure a 3 kHz bearing resonance? Why or why not?
4. Why monitor both velocity and acceleration?

<details>
<summary><strong>Answers</strong></summary>

1. The impacts are short and only happen a few times per revolution, so they add little to the total energy that RMS measures. They're "loud but brief".
2. The damage has spread (many defects and a rough surface), so impacts merge into continuous high vibration. RMS rises and catches up with the peaks, so their ratio falls. It's a sign of a **worsening**, late-stage fault.
3. No. 3 kHz is above Nyquist (2,560 Hz). It would alias, appearing at 5,120 − 3,000 = 2,120 Hz, if the anti-aliasing filter didn't remove it. You'd need a higher sampling rate.
4. Velocity tracks overall machine condition in the 10–1,000 Hz range (imbalance, misalignment, looseness) and maps onto the ISO severity zones. Acceleration emphasises the high-frequency impacts of early bearing and gear faults. Each catches what the other misses.

</details>

---

## Tick off

- [ ] Waveforms plotted, impacts visible on the faulty ones
- [ ] Nyquist and frequency resolution explained
- [ ] RMS, peak, crest factor and kurtosis calculated from raw data
- [ ] Can explain why crest factor and kurtosis lead RMS for early faults
