# Week 59: FFT, frequency bands and bearing defect frequencies

**Phase 7 · Machine learning & condition monitoring** · Mon 13 Dec – Sun 19 Dec 2027 · about 5 hours

Time-domain features tell you **something** is wrong. The **frequency domain** tells you **what**: imbalance at 1× shaft speed, misalignment at 2×, an outer-race bearing defect at its BPFO. This week you'll take waveforms apart with the FFT and diagnose the fault in the data from first principles.

**By Sunday you'll be able to:**

- compute and plot an FFT spectrum and a Welch power spectrum
- identify 1× and 2× shaft-speed peaks
- calculate bearing defect frequencies (BPFO, BPFI, BSF, FTF) from geometry
- use **envelope analysis** to reveal a bearing defect frequency
- turn frequency bands into ML features

---

## Session 1 (1.5 h): The spectrum

### Do it

```python
import numpy as np, pandas as pd, matplotlib.pyplot as plt
from scipy import signal
from pathlib import Path
DATA = Path("..") / "data" / "vibration" / "waveforms"
fs, shaft = 5120, 24.6

w = pd.read_csv(DATA / "fan_bearing_late_fault.csv")["accel_g"].to_numpy()
spec = np.abs(np.fft.rfft(w * np.hanning(len(w)))) / len(w) * 2
freqs = np.fft.rfftfreq(len(w), 1 / fs)

fig, ax = plt.subplots(figsize=(10, 4))
ax.plot(freqs, spec, linewidth=0.7)
for k in (1, 2):
    ax.axvline(k * shaft, color="#C62828", linestyle=":", label=f"{k}× shaft")
ax.set_xlim(0, 2560); ax.set_xlabel("Hz"); ax.set_ylabel("g"); ax.legend()
```

You'll see:

- a sharp peak at **24.6 Hz (1×)**: shaft rotation, a little imbalance (every machine has some)
- a small one at **49 Hz (2×)**
- in the faulty signals, a broad **hump around 1,000–1,400 Hz**: the structure's **resonance**, being "rung" by the bearing impacts

**Welch spectrum** (averaged, smoother) and a band feature:

```python
for name in ("healthy", "early_fault", "late_fault"):
    x = pd.read_csv(DATA / f"fan_bearing_{name}.csv")["accel_g"].to_numpy()
    f, P = signal.welch(x, fs=fs, nperseg=2048)
    share = P[(f > 1000) & (f < 1400)].sum() / P.sum()
    print(name, round(share, 3))
```

The 1.0–1.4 kHz band holds **3 %** of the energy when healthy, **21 %** at the early fault, and **59 %** at the late fault. That's a brilliant, simple feature for ML.

### Why it works

The **FFT** (Fast Fourier Transform) breaks a signal into the sine waves that make it up: how much of each frequency is present. A **Hann window** (`np.hanning`) tapers the ends of the capture so the edges don't smear energy across the spectrum (called leakage, a different leakage from Week 51's).

---

## Session 2 (1.5 h): Bearing frequencies and envelope analysis

### Bearing defect frequencies

From the bearing geometry: n rolling elements, ball diameter d, pitch diameter D, contact angle φ, shaft speed fr:

$$\text{BPFO} = \frac{n}{2} f_r \left(1 - \frac{d}{D}\cos\varphi\right) \qquad \text{BPFI} = \frac{n}{2} f_r \left(1 + \frac{d}{D}\cos\varphi\right)$$

$$\text{BSF} = \frac{D}{2d} f_r \left(1 - \left(\frac{d}{D}\cos\varphi\right)^2\right) \qquad \text{FTF} = \frac{f_r}{2} \left(1 - \frac{d}{D}\cos\varphi\right)$$

In practice you look up the **multipliers** (× shaft speed) in the bearing maker's data. For the bearing in this data, **BPFO = 3.585 × shaft = 88.2 Hz**.

### Envelope analysis: finding the hidden rhythm

The raw spectrum shows the resonance hump, but not *how often* the impacts happen. **Envelope analysis** does: band-pass filter around the resonance, take the envelope (the outline of the ringing bursts), then FFT the envelope.

```python
for name in ("healthy", "early_fault", "late_fault"):
    x = pd.read_csv(DATA / f"fan_bearing_{name}.csv")["accel_g"].to_numpy()
    b, a = signal.butter(4, [900, 1500], btype="bandpass", fs=fs)
    env = np.abs(signal.hilbert(signal.filtfilt(b, a, x)))
    env -= env.mean()
    es = np.abs(np.fft.rfft(env)) / len(env)
    ef = np.fft.rfftfreq(len(env), 1 / fs)
    m = (ef > 10) & (ef < 400)
    print(name, "envelope peak at", round(ef[m][np.argmax(es[m])], 1), "Hz")
```

| Signal | Envelope peak | Diagnosis |
|---|---|---|
| healthy | 65 Hz (noise; no clear peak) | nothing |
| early fault | **88 Hz** | **outer race defect** (BPFO 88.2 Hz) |
| late fault | **88 Hz** (+ harmonics at 176, 264) | outer race defect, advanced |

You've just diagnosed a bearing fault from raw data, the way a vibration analyst does.

---

## Weekend (2 h)

1. Plot the envelope spectra for all three signals with vertical lines at 1×, 2× and 3× BPFO.
2. **Band features for ML**: write `band_energy(x, fs, bands)`, which returns the share of energy in, say, 0–100, 100–500, 500–1,000, 1,000–1,500 and 1,500–2,560 Hz. These features, plus Week 58's, are what a real CM model uses.
3. **Look up a real bearing**: find the defect-frequency multipliers for a **6205** or **6308** deep-groove bearing (manufacturers publish bearing frequency calculators). Calculate BPFO, BPFI, BSF and FTF at 1,475 rpm.
4. **Fault table**: from a vibration chart (search *"vibration analysis fault frequency chart"*), make your own one-page table covering imbalance, misalignment, looseness, bearing faults, gear mesh, belt and electrical (2× line frequency = 100 Hz in the UK).

---

## Watch

- **3Blue1Brown**: *"3Blue1Brown but what is the Fourier transform"*. It's the best intuition there is.
- **Mobius Institute**: *"Mobius Institute envelope analysis"* and *"Mobius Institute bearing defect frequencies"*.
- **SciPy docs**: search *"scipy signal welch"* and *"scipy signal hilbert"*.

---

## Check yourself

1. A big peak at 1× shaft speed, mostly radial. What's the likely fault?
2. Why can't you see BPFO clearly in the raw spectrum, but can in the envelope spectrum?
3. Why is 100 Hz a suspicious frequency on a UK motor?
4. How would you turn this week's work into a feature for the Week 61 anomaly detector?

<details>
<summary><strong>Answers</strong></summary>

1. **Imbalance** (1× radial). Misalignment shows more at 2× and axially. Looseness gives many harmonics.
2. Each impact is a short burst that rings the structure at its resonance (~1.2 kHz), so the raw spectrum shows energy at the resonance, not at the impact *rate*. The envelope recovers the repetition rate, which is BPFO.
3. It's 2× the 50 Hz supply frequency: the electromagnetic forces in an AC motor (stator problems, eccentric air gap, soft foot affecting the magnetic field).
4. Calculate per capture: the 1.0–1.4 kHz band energy share, the envelope amplitude at BPFO ± 2 Hz, and the kurtosis. Trend them, give them a baseline per bearing, and feed them into the z-score detector alongside RMS.

</details>

---

## Tick off

- [ ] FFT and Welch spectra plotted; 1× and 2× identified
- [ ] Resonance band energy: 3 % → 21 % → 59 %
- [ ] Envelope analysis finds 88 Hz = BPFO
- [ ] `band_energy()` feature function written
- [ ] Fault frequency table made
