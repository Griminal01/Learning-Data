"""Weeks 48-52: clustering, anomaly detection, vibration signal features, FFT/envelope, RUL."""
from pathlib import Path
import numpy as np
import pandas as pd
from scipy import signal, stats
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.model_selection import GroupShuffleSplit
from sklearn.metrics import mean_absolute_error, silhouette_score

DATA = Path(__file__).resolve().parents[2] / "data"

print("== Week 48: k-means on asset failure profiles")
wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["due_date", "completed_date"])
dt = pd.read_csv(DATA / "csv" / "downtime_events.csv")
assets = pd.read_csv(DATA / "csv" / "assets.csv")
r = wo[wo["wo_type"] == "Reactive"]
pm = wo[wo["wo_type"] == "PM"].assign(on_time=lambda t: t["completed_date"].le(t["due_date"]))
prof = pd.DataFrame({
    "breakdowns": r.groupby("asset_id").size(),
    "mttr_hrs": dt[dt["category"] == "Breakdown"].groupby("asset_id")["duration_min"].mean() / 60,
    "pm_on_time": pm.groupby("asset_id")["on_time"].mean(),
    "minor_stops": dt[dt["category"] == "Minor stop"].groupby("asset_id").size(),
}).reindex(assets["asset_id"]).fillna({"breakdowns": 0, "mttr_hrs": 0, "minor_stops": 0, "pm_on_time": 1})
Z = StandardScaler().fit_transform(prof)
for k in (2, 3, 4, 5, 6):
    km = KMeans(n_clusters=k, n_init=10, random_state=0).fit(Z)
    print(k, "inertia", round(km.inertia_), "silhouette", round(silhouette_score(Z, km.labels_), 3))
km = KMeans(n_clusters=4, n_init=10, random_state=0).fit(Z)
prof["cluster"] = km.labels_
summary = prof.groupby("cluster").mean().round(2)
summary["n"] = prof.groupby("cluster").size()
print(summary)
print(prof.join(assets.set_index("asset_id")["asset_type"]).groupby("cluster")["asset_type"].agg(lambda s: s.value_counts().head(3).to_dict()))

print("== Week 49: anomaly detection on bearing_trend (train on first 90 days of every bearing)")
v = pd.read_csv(DATA / "vibration" / "bearing_trend.csv", parse_dates=["date"]).sort_values(["bearing_id", "date"])
F = ["rms_velocity_mm_s", "kurtosis", "temp_c", "crest_factor"]
v["d"] = v.groupby("bearing_id").cumcount()
train = v[v["d"] < 90]
iso = IsolationForest(n_estimators=300, contamination=0.01, random_state=0).fit(train[F])
v["iso_flag"] = iso.predict(v[F]) == -1
# z-score per bearing against its own baseline
base = train.groupby("bearing_id")[F].agg(["mean", "std"])
z = pd.DataFrame({f: (v[f] - v["bearing_id"].map(base[(f, "mean")])) / v["bearing_id"].map(base[(f, "std")]) for f in F})
v["z_flag"] = (z.abs() > 4).any(axis=1)
for flag in ("iso_flag", "z_flag"):
    # alarm = 3 flags in a row (persistence filter)
    v[flag + "_3"] = v.groupby("bearing_id")[flag].transform(lambda s: s.rolling(3).sum() >= 3)
    first = v[v[flag + "_3"]].groupby("bearing_id")["date"].min()
    fail = v[v["status"] == "Failed"].set_index("bearing_id")["date"]
    out = pd.DataFrame({"first_alarm": first, "failed": fail})
    out["lead_days"] = (out["failed"] - out["first_alarm"]).dt.days
    print(flag, "\n", out)

print("== Week 50-51: waveform features, FFT and envelope")
fs = 5120
shaft = 24.6
bpfo = shaft * 3.585
for name in ("healthy", "early_fault", "late_fault"):
    w = pd.read_csv(DATA / "vibration" / "waveforms" / f"fan_bearing_{name}.csv")["accel_g"].to_numpy()
    rms = np.sqrt(np.mean(w ** 2)); peak = np.max(np.abs(w))
    feats = dict(rms=round(rms, 3), peak=round(peak, 3), crest=round(peak / rms, 2), kurtosis=round(stats.kurtosis(w, fisher=False), 2))
    f, P = signal.welch(w, fs=fs, nperseg=2048)
    band = P[(f > 1000) & (f < 1400)].sum() / P.sum()
    # envelope spectrum
    b, a = signal.butter(4, [900, 1500], btype="bandpass", fs=fs)
    env = np.abs(signal.hilbert(signal.filtfilt(b, a, w)))
    env = env - env.mean()
    spec = np.abs(np.fft.rfft(env)) / len(env)
    freqs = np.fft.rfftfreq(len(env), 1 / fs)
    m = (freqs > 10) & (freqs < 400)
    pk = freqs[m][np.argmax(spec[m])]
    print(name, feats, "1-1.4kHz band share", round(band, 3), "envelope peak Hz", round(pk, 1), "(BPFO", round(bpfo, 1), ")")

print("== Week 52: RUL regression")
df = pd.read_csv(DATA / "ml" / "bearing_fleet.csv").sort_values(["bearing_id", "day"])
for c in ["rms_velocity_mm_s", "kurtosis", "temp_c"]:
    df[f"{c}_r7"] = df.groupby("bearing_id")[c].transform(lambda s: s.rolling(7, min_periods=1).mean())
    df[f"{c}_d7"] = df.groupby("bearing_id")[c].diff(7)
df = df.dropna()
X = df.drop(columns=["bearing_id", "day", "rul_days", "fail_within_14d"])
y = df["rul_days"]
tr, te = next(GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=0).split(X, y, df["bearing_id"]))
rf = RandomForestRegressor(n_estimators=300, min_samples_leaf=5, random_state=0, n_jobs=-1).fit(X.iloc[tr], y.iloc[tr])
pred = rf.predict(X.iloc[te]); yt = y.iloc[te]
print("MAE all", round(mean_absolute_error(yt, pred), 1), "days")
for lo, hi in ((0, 30), (30, 90), (90, 500)):
    m = (yt >= lo) & (yt < hi)
    print(f"  true RUL {lo}-{hi}: MAE {mean_absolute_error(yt[m], pred[m]):.1f} days (n={m.sum()})")
