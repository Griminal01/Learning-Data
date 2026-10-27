# Week 42: Phase 5 build, the Weibull PM interval study

**Phase 5 · Statistics & reliability analytics** · Mon 16 Aug – Sun 22 Aug 2027 · about 5 hours

> **Done when:** you can **defend a PM interval change with numbers** in front of an engineering manager.

This week you write it up as a professional, one-page-plus-appendix recommendation, then present it and take questions.

---

## Session 1 (1.5 h): Build the evidence pack

Pick **one** recurring packing-zone failure mode. The obvious one is **flow wrapper sealing jaws**, but you could choose another for a fresh analysis (carton erector suction cups, case packer grippers).

Produce, from your own code:

1. **Life data summary**: n failures, n suspensions, and how they were defined.
2. **Weibull probability plot**, with β and η and their 95 % CIs.
3. **The current interval in context**: R(current interval). What % of units reach their PM?
4. **Cost curve** with the current, optimal and proposed points marked.
5. **Sensitivity table**: the optimal interval for low, central and high breakdown costs.
6. **Annual impact**: the expected breakdowns per year now vs proposed (number of units × 365 ÷ the mean cycle length × F(T)), plus labour hours and £.

> **Tip for 6:** with age replacement at T, the expected cycle length is ∫₀ᵀ R(t) dt, and the chance a cycle ends in failure is F(T). So breakdowns per unit per day = F(T) ÷ ∫₀ᵀ R(t) dt.
>
> **Check values (jaws, 6 wrappers):** at 182 d the model predicts ~**28.6** jaw failures a year with no inspection. The data shows 35 breakdowns + 24 caught on inspection over two years, about 29.5 a year, so the model matches reality. At 42 d: ~**6** failures a year, plus ~48 planned changes.

---

## Session 2 (1.5 h): Write the recommendation

**Format: one page plus appendix.** Managers read the first page. Engineers check the appendix.

### Page 1 template

> **Recommendation:** Change *Replace sealing jaws* on the 6 Primary Packing flow wrappers from **182 days** to **42 days (6 weeks)**, aligned with the planned-stop schedule, and add a jaw-wear check to the existing weekly inspection.
>
> **Why:** Jaw failures are clearly wear-out (Weibull β ≈ 3.0, 95 % CI 2.3–3.9). Their characteristic life is ~86 days and 10 % fail by day 40. **Practically none reach the current 182-day replacement**, so today's PM prevents nothing: we pay for the PM *and* the breakdowns.
>
> **Expected benefit:** jaw breakdowns fall by about **X per year** (from ~Y to ~Z). Cost per wrapper per day falls from **£37.88 to £16.68**, about **£46k a year across 6 wrappers** at agreed costs (planned change £400, breakdown £2,900).
>
> **Confidence:** the result holds for any breakdown cost between £1,500 and £5,000 (optimum 30–49 days). The main uncertainty is the cost per breakdown, which needs to be agreed with Production.
>
> **How we'll know it worked:** we track jaw breakdowns for 6 months after the change and compare them with the prior rate using a rate test (decided now, before seeing the data).
>
> **Ask:** approve a 6-month trial on 2 wrappers first (LD-PPK-005 and LD-PPK-003, the worst two), with a review in [month].

Fill in X, Y and Z from your own calculation.

### Appendix

The method (life-data rules, suspensions), the plots, the β/η table, the sensitivity table, the assumptions, and the limitations. **State your limitations honestly**: synthetic data, assumed costs, the first life of each asset excluded (its age was unknown at the start of the data), and a 24/7 running assumption.

---

## Weekend (2 h): The done-when test

1. **Present it** to someone in 5 minutes: a supervisor, an engineer, or (at minimum) a friend you brief to act sceptical.
2. Have them ask these, and practise your answers:
   - "How do you know it's wear-out and not random?"
   - "Why should I trust 32 failures?"
   - "What if the breakdown cost is lower than you think?"
   - "Won't more frequent changes mean more installation errors?"
   - "Why not just inspect more?"
3. If you can answer every one **with a number or a chart** from your pack, **Phase 5 is passed.** 🎉

### Portfolio

`portfolio/06-weibull-pm-study/`: the script, plots, one-page recommendation (as PDF) and appendix. This is the strongest piece in your portfolio for reliability roles, so make the README excellent.

> **Credit twice:** this is exactly the kind of project an HNC/HND assignment or a CMRP application can use. Keep it.

---

## Check yourself: model answers to the sceptic's questions

<details>
<summary><strong>Show</strong></summary>

1. **Wear-out?** β ≈ 3.0, and the whole 95 % interval (2.3–3.9) is well above 1. The probability plot is a straight line with no kink. Compare jams on the same machine: β ≈ 0.9, which is genuinely random. The method can tell the difference.
2. **Only 32 failures?** There are also 48 suspensions (jaw sets replaced or still running), which the analysis uses. The confidence interval already reflects the sample size, and even its pessimistic end gives the same decision. The trial on 2 wrappers is also designed to confirm it.
3. **Lower breakdown cost?** Down to £1,500, the optimum is still 49 days, far below 182. The decision doesn't change. Only the exact interval does.
4. **Installation errors?** It's a fair risk (β < 1 behaviour after a change). Mitigate it with a standard work card, a torque or alignment check, and the trial, monitoring failures in the first week after each change. The data would show it.
5. **Inspect more instead?** The weekly inspection already exists and catches about 4 in 10 jaw failures early (24 Corrective vs 35 Reactive jobs coded *Mechanical - jaws* over two years). That still leaves ~17 breakdowns a year. A better jaw-wear check is part of the recommendation, alongside the replacement, not instead of it.

</details>

---

## Tick off

- [ ] Evidence pack: plot, R(current), cost curve, sensitivity, annual impact
- [ ] One-page recommendation plus appendix
- [ ] Presented and defended against the five questions. **Done-when passed.**
- [ ] `portfolio/06-weibull-pm-study/` committed
