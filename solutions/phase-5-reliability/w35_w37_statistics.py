"""Weeks 35-37: descriptive stats, distributions, confidence intervals, tests, regression."""
from pathlib import Path
import numpy as np
import pandas as pd
from scipy import stats
import statsmodels.formula.api as smf

DATA = Path(__file__).resolve().parents[2] / "data"
wo = pd.read_csv(DATA / "csv" / "work_orders.csv", parse_dates=["raised_datetime", "due_date", "completed_date"])
dt = pd.read_csv(DATA / "csv" / "downtime_events.csv", parse_dates=["start_datetime"])
assets = pd.read_csv(DATA / "csv" / "assets.csv")
bd = dt[dt["category"] == "Breakdown"].merge(assets, on="asset_id")

print("== Week 35: describe breakdown durations (min)")
d = bd["duration_min"]
print(d.describe().round(1).to_dict())
print("skew", round(stats.skew(d), 2), "P90", d.quantile(0.9))
# Which distribution fits repair time best?
for name, dist in [("norm", stats.norm), ("expon", stats.expon), ("lognorm", stats.lognorm), ("weibull_min", stats.weibull_min)]:
    params = dist.fit(d, floc=0) if name != "norm" else dist.fit(d)
    ll = np.sum(dist.logpdf(d, *params))
    k = len(params) - (0 if name == "norm" else 1)
    print(f"{name:12} AIC={2 * k - 2 * ll:,.0f}")

print("== Week 36: confidence interval for MTTR, packing vs flaking")
ppk = bd.loc[bd["zone_code"] == "PPK", "duration_min"] / 60
flk = bd.loc[bd["zone_code"] == "FLK", "duration_min"] / 60
for lab, x in (("PPK", ppk), ("FLK", flk)):
    ci = stats.t.interval(0.95, len(x) - 1, loc=x.mean(), scale=stats.sem(x))
    print(lab, len(x), round(x.mean(), 2), [round(c, 2) for c in ci])
rng = np.random.default_rng(1)
boot = [rng.choice(ppk, len(ppk)).mean() for _ in range(5000)]
print("PPK bootstrap CI", np.round(np.percentile(boot, [2.5, 97.5]), 2))
print("Welch t-test", stats.ttest_ind(flk, ppk, equal_var=False))
print("Mann-Whitney", stats.mannwhitneyu(flk, ppk))

pm = wo[wo["wo_type"] == "PM"].merge(assets, on="asset_id")
pm["on_time"] = pm["completed_date"].le(pm["due_date"])
h1 = pm[pm["due_date"].between("2026-01-01", "2026-06-30")]
tab = pd.crosstab(h1["zone_code"] == "PPK", h1["on_time"])
print(tab)
print("chi2", stats.chi2_contingency(tab)[:2])

r = wo[wo["wo_type"] == "Reactive"]
n25 = r["raised_datetime"].between("2025-01-01", "2025-06-30 23:59").sum()
n26 = r["raised_datetime"].between("2026-01-01", "2026-06-30 23:59").sum()
print("H1 failures 2025 vs 2026", n25, n26, "poisson exact test p", round(stats.binomtest(n26, n25 + n26, 0.5).pvalue, 3))

print("== Week 37: regression - do late PMs mean more breakdowns?")
per = (pm.groupby("asset_id").agg(pm_on_time=("on_time", "mean"), pms=("wo_id", "count")).reset_index()
       .merge(r.groupby("asset_id").size().rename("breakdowns").reset_index(), on="asset_id", how="left")
       .fillna({"breakdowns": 0}).merge(assets, on="asset_id"))
print("corr", round(per["pm_on_time"].corr(per["breakdowns"]), 3))
m1 = smf.ols("breakdowns ~ pm_on_time", data=per).fit()
print(m1.params.round(2).to_dict(), "R2", round(m1.rsquared, 3), "p", round(m1.pvalues["pm_on_time"], 4))
m2 = smf.ols("breakdowns ~ pm_on_time + C(asset_type)", data=per).fit()
print("with asset type: coef", round(m2.params["pm_on_time"], 2), "p", round(m2.pvalues["pm_on_time"], 4), "R2", round(m2.rsquared, 3))
m3 = smf.poisson("breakdowns ~ pm_on_time + C(asset_type)", data=per).fit(disp=0)
print("poisson coef", round(m3.params["pm_on_time"], 2), "p", round(m3.pvalues["pm_on_time"], 4), "rate ratio per +10pts", round(np.exp(m3.params["pm_on_time"] * 0.1), 3))
