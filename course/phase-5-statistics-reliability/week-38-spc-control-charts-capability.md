# Week 38: SPC, control charts, run rules and capability

**Phase 5 · Statistics & reliability analytics** · Mon 19 Jul – Sun 25 Jul 2027 · about 5 hours

Statistical Process Control (SPC) answers one question: **"Has something changed, or is this normal variation?"** It stops two expensive mistakes: reacting to noise (tampering), and missing a real shift. You'll use it on maintenance KPIs and on process data.

**By Sunday you'll be able to:**

- build I-MR (individuals) and c (count) control charts in Python
- apply the Western Electric / Nelson run rules
- tell common-cause from special-cause variation
- calculate Cp and Cpk, and explain what they mean to production

Reference code is in [`solutions/phase-5-reliability/w38_w39_spc_reliability.py`](../../solutions/phase-5-reliability/w38_w39_spc_reliability.py).

---

## Session 1 (1.5 h): A c-chart for weekly breakdowns

### Do it

```python
import pandas as pd, numpy as np, matplotlib.pyplot as plt
from pathlib import Path
DATA = Path("..") / "data"

wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["raised_datetime"])
weekly = (wo[wo["wo_type"] == "Reactive"].set_index("raised_datetime")["wo_id"]
          .resample("W-SUN").count())
weekly = weekly[(weekly.index > "2024-07-01") & (weekly.index <= "2026-06-28")]   # full weeks only

cbar = weekly.mean()
ucl = cbar + 3 * np.sqrt(cbar)
lcl = max(0, cbar - 3 * np.sqrt(cbar))

fig, ax = plt.subplots(figsize=(10, 4))
ax.plot(weekly.index, weekly, marker="o", markersize=3, color="#1F4E79")
for y, s in ((cbar, "-"), (ucl, "--"), (lcl, "--")):
    ax.axhline(y, color="#9E9E9E", linestyle=s)
out = weekly[weekly > ucl]
ax.scatter(out.index, out, color="#C62828", zorder=3)
ax.set_title(f"Reactive jobs per week: c̄ = {cbar:.1f}, UCL = {ucl:.1f}", loc="left")
```

**Results:** 104 full weeks, c̄ = **9.85** jobs a week, UCL = **19.3**, LCL = 0.4. **One** point is above the UCL: the week ending **13 July 2025**, with **22 jobs**.

**Investigate the special cause:**

```python
r = wo[(wo["wo_type"] == "Reactive") & wo["raised_datetime"].between("2025-07-07", "2025-07-13 23:59")]
r.merge(pd.read_csv(DATA / "csv" / "assets.csv"), on="asset_id")["asset_type"].value_counts()
```

The jobs are spread over 11 asset types (5 conveyors, 4 flow wrappers, 3 sensors, …), with no common cause. In 104 points, one false signal is plausible. At work, you'd ask the shift team what happened that week (a heatwave? a new product? a short-staffed shift?) before concluding it was chance.

### Why it works

- **Common-cause** variation is the normal week-to-week noise of a stable process. Reacting to it (*"why were there 13 this week?!"*) wastes time and often makes things worse.
- **Special-cause** variation is a signal that something changed. Investigate those.
- **Control limits** come from the process itself (± 3 sigma), **not** from targets. A process can be "in control" and still be bad. That calls for improvement, not firefighting.
- A **c-chart** is for counts of events per period, where σ = √c̄ (the Poisson assumption).

---

## Session 2 (1.5 h): I-MR chart and run rules

For a continuous weekly measure, use an **Individuals and Moving Range (I-MR)** chart.

```python
dt = pd.read_csv(DATA / "csv" / "downtime_events.csv", parse_dates=["start_datetime"])
assets = pd.read_csv(DATA / "csv" / "assets.csv")
ms = dt[dt["category"] == "Minor stop"].merge(assets, on="asset_id")
x = (ms[ms["zone_code"] == "PPK"].set_index("start_datetime")["duration_min"]
       .resample("W-SUN").sum())
x = x[(x.index > "2024-07-01") & (x.index <= "2026-06-28")]

mr = x.diff().abs()
xbar, mrbar = x.mean(), mr.mean()
ucl_x, lcl_x = xbar + 2.66 * mrbar, xbar - 2.66 * mrbar      # 2.66 = 3 / 1.128
ucl_mr = 3.267 * mrbar
```

**Results:** x̄ = **179.7** minor-stop minutes per week in packing, MR̄ = 35.7, limits **84.6 – 274.7**. **No points are outside.** Packing's minor stops are *stable*: about 3 hours a week, every week. To reduce them you need a **system change** (an SMED/jam root-cause project), not a reaction to individual bad weeks.

### Run rules (a common subset)

Signal a special cause if:

1. one point is beyond 3σ
2. 2 of 3 consecutive points are beyond 2σ on the same side
3. 4 of 5 consecutive points are beyond 1σ on the same side
4. **8 consecutive points are on the same side of the centre line** (a shift)
5. 6 points are in a row steadily increasing or decreasing (a trend)

Code rule 4:

```python
side = np.sign(x - xbar)
run_length = side.groupby((side != side.shift()).cumsum()).transform("size")
(run_length >= 8).any()
```

---

## Weekend (2 h): Capability, Cp and Cpk

Capability asks whether a **stable** process fits inside its **specification**. The classic example on a cereal line is pack weight.

```python
rng = np.random.default_rng(7)
w = rng.normal(503.0, 2.4, 250).round(1)          # 250 simulated 500 g packs
LSL, USL = 495, 515
mu, sd = w.mean(), w.std(ddof=1)
cp = (USL - LSL) / (6 * sd)
cpk = min(USL - mu, mu - LSL) / (3 * sd)
```

**Results:** mean 502.6 g, sd 2.17 g, **Cp = 1.53**, **Cpk = 1.17**.

- **Cp** compares the spec width with the process spread, ignoring centring. 1.53 means "the process is narrow enough".
- **Cpk** includes centring. 1.17 is lower because the mean sits 7.6 g from the lower limit but 12.4 g from the upper one.
- Common targets: Cpk ≥ 1.33 for existing processes, and ≥ 1.67 for new or safety-critical ones.
- So here the spread is fine, but the process is off-centre. Re-centring toward 505 g would raise Cpk to about Cp. (Re-centring *upwards* also means giving away more product. That trade-off is a real production conversation.)

**Then:**

1. Draw the histogram with LSL/USL lines.
2. Build an X̄-R chart for subgroups of 5 (rows 0–4, 5–9, …). Look up the A2, D3 and D4 constants for n = 5.
3. Ask at work (without exporting anything) whether your site uses SPC software or Minitab for checkweighers, and what the Cpk targets are.

---

## Watch

- Search *"SPC control charts explained common cause special cause"*. Pick a short manufacturing-focused video.
- Search *"Western Electric rules control chart"*.
- Search *"Cp Cpk explained"*. Many channels cover it in about 10 minutes.
- Book (classic): *Understanding Variation* by Donald Wheeler. It's short, and it changes how you read every KPI chart.

---

## Check yourself

1. The manager sees 15 breakdowns this week (UCL 19.3) and wants an investigation. What do you say?
2. Why are control limits not the same as targets?
3. Cp = 1.5, Cpk = 0.9. What's going on, and what's the fix?
4. Packing minor stops are "in control" at 180 min a week. Is that good?

<details>
<summary><strong>Answers</strong></summary>

1. It's within normal variation for this process. There's no single cause to find, and investigating it as special would be tampering. If 15 is too high, the whole process needs improving: look at the Pareto of causes across many weeks.
2. Control limits describe what the process **does** (the voice of the process). Targets and specs describe what we **want** (the voice of the customer). They answer different questions.
3. The spread is fine but the process is off-centre, close to one spec limit. Fix the centring (the setpoint or target), not the variation.
4. "In control" only means stable and predictable. It doesn't mean good. Three hours a week of stops is a predictable loss, and reducing it needs a structured improvement project.

</details>

---

## Tick off

- [ ] c-chart of weekly reactive jobs; one signal found and investigated
- [ ] I-MR chart of packing minor stops (stable)
- [ ] Run rule 4 coded
- [ ] Cp/Cpk calculated and explained (1.53 / 1.17)
