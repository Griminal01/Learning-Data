/* Data Skills Studio: tracker for the 62-week course.
   Plain script (no modules, no build step) so it runs from file:// as well as GitHub Pages.
   Depends on app/markdown.js (window.MD) and app/course-data.js (window.COURSE_DATA). */
(function () {
  "use strict";
  const COURSE = window.COURSE_DATA;
  const $ = (id) => document.getElementById(id);
  const esc = window.MD ? MD.esc : (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  if (!COURSE || !window.MD) {
    document.body.insertAdjacentHTML("afterbegin", `<div class="card pad" style="margin:16px">The course data didn't load. Check that the <code>app/</code> folder sits next to <code>index.html</code>, then run <code>python tools/build_tracker.py</code>.</div>`);
    return;
  }
  const WEEKS = COURSE.weeks, PHASES = COURSE.phases;
  const weekByNo = (n) => WEEKS[n - 1];
  const weekByPath = {}; WEEKS.forEach((w) => (weekByPath[w.path] = w));

  // ---------- keys & defaults ----------
  const KEY = "data-skills-studio-v2";          // synced progress
  const OLD_KEY = "data-skills-studio-v1";      // the first version of the app; read once, never written
  const PREFS_KEY = "data-skills-studio-prefs"; // this device only: theme, device, time, pending action
  const GIST_KEY = "data-skills-studio-gist";   // this device only: gist token and id. Never exported.
  const DEFAULT_REPO = "https://github.com/griminal01/learning-data/blob/HEAD/";
  const DEF = { start: "2026-11-02", target: 5, repo: DEFAULT_REPO };
  const INTERVALS = [1, 3, 7, 14, 30]; // Leitner boxes 1-5, days until the next review
  const NEW_PER_SESSION = 10;

  const now = () => Date.now();
  const uid = () => now().toString(36) + Math.random().toString(36).slice(2, 7);

  /* ---------- state ----------
     Every synced item is a last-writer-wins register {v, t}: v is the value, t the time (ms, this
     device's clock) it was last changed.

     CONFLICT RULE (used by import-merge and gist sync alike): for each key, keep the copy with the
     larger t. Un-ticking writes {v:false, t:now} instead of deleting, so it is a tombstone: an older
     tick from another device can't bring it back. Deleting a log entry likewise keeps {del:true, t}.
     On a tie (for example two copies both migrated from the old format with t = 0) the more
     progressed value wins (true over false, a date over none), so a merge never loses work.
     Quiz cards keep the most recent review (larger t); on a tie, the higher Leitner box.
     Review days (for the streak) take the larger count per day.
     Caveat: if two devices' clocks disagree, the one that is ahead wins a genuine conflict on the
     same item. That is rare and harmless here (the worst case is one tick flipping back). */
  function blank() {
    return { v: 2, settings: {}, ticks: {}, doneWhen: {}, sec: {}, read: {}, step: {}, watched: {}, pos: {}, quiz: {}, days: {}, log: {} };
  }
  function normalise(o) {
    const s = blank();
    if (!o || typeof o !== "object") return s;
    if (o.v === 2) {
      for (const k of Object.keys(s)) if (k !== "v" && o[k] && typeof o[k] === "object" && !Array.isArray(o[k])) s[k] = o[k];
      return s;
    }
    return migrateV1(o);
  }
  // The first app stored {start, target, repo, theme, ticks:{"w:i":true}, doneWhen:{p:"date"}, log:[...]}.
  function migrateV1(o) {
    const s = blank();
    for (const k of ["start", "target", "repo"]) if (o[k] != null && o[k] !== "") s.settings[k] = { v: o[k], t: 0 };
    for (const [k, v] of Object.entries(o.ticks || {})) if (v) s.ticks[k] = { v: true, t: 0 };
    for (const [k, v] of Object.entries(o.doneWhen || {})) if (v) s.doneWhen[k] = { v: String(v), t: 0 };
    (Array.isArray(o.log) ? o.log : []).forEach((e, i) => {
      if (!e || !e.date) return;
      const id = String(e.id || "m" + i);
      s.log[id] = { id, date: e.date, hours: +e.hours || 0, studied: e.studied || "", built: e.built || "", blockers: e.blockers || "", t: 0 };
    });
    return s;
  }
  const truthy = (r) => !!(r && r.v);
  function pickReg(a, b) {
    if (!a) return b; if (!b) return a;
    if (b.t > a.t) return b; if (a.t > b.t) return a;
    return truthy(b) && !truthy(a) ? b : a;
  }
  function mergeMap(a, b, pick) {
    const out = Object.assign({}, a);
    for (const k of Object.keys(b || {})) out[k] = pick(a[k], b[k]);
    return out;
  }
  function pickCard(a, b) {
    if (!a) return b; if (!b) return a;
    if ((b.t || 0) !== (a.t || 0)) return (b.t || 0) > (a.t || 0) ? b : a;
    return (b.box || 0) > (a.box || 0) ? b : a;
  }
  function pickLog(a, b) {
    if (!a) return b; if (!b) return a;
    if ((b.t || 0) !== (a.t || 0)) return (b.t || 0) > (a.t || 0) ? b : a;
    return a.del && !b.del ? b : a;
  }
  function merge(a, b) {
    a = normalise(a); b = normalise(b);
    const out = blank();
    for (const k of ["settings", "ticks", "doneWhen", "sec", "read", "step", "watched", "pos"]) out[k] = mergeMap(a[k], b[k], pickReg);
    out.quiz = mergeMap(a.quiz, b.quiz, pickCard);
    out.log = mergeMap(a.log, b.log, pickLog);
    out.days = mergeMap(a.days, b.days, (x, y) => Math.max(x || 0, y || 0));
    return out;
  }
  // Stable stringify, so "did anything change?" doesn't depend on key order.
  function canon(o) {
    if (Array.isArray(o)) return "[" + o.map(canon).join(",") + "]";
    if (o && typeof o === "object") return "{" + Object.keys(o).sort().map((k) => JSON.stringify(k) + ":" + canon(o[k])).join(",") + "}";
    return JSON.stringify(o);
  }

  function readJSON(key) { try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : null; } catch (e) { return null; } }
  function writeJSON(key, v) { try { localStorage.setItem(key, JSON.stringify(v)); return true; } catch (e) { return false; } }

  let S = load();
  let P = Object.assign({ theme: "auto", device: null, minutes: 15, pending: null, focus: false }, readJSON(PREFS_KEY) || {});
  function load() {
    const cur = readJSON(KEY);
    if (cur) return normalise(cur);
    const old = readJSON(OLD_KEY);
    if (old) {
      const s = migrateV1(old);
      if (old.theme && old.theme !== "auto") writeJSON(PREFS_KEY, Object.assign(readJSON(PREFS_KEY) || {}, { theme: old.theme }));
      writeJSON(KEY, s);
      return s;
    }
    return blank();
  }
  function save(opts) {
    if (!writeJSON(KEY, S)) toast("Couldn't save in this browser. Export a backup.");
    if (!(opts && opts.noSync)) Sync.schedule();
  }
  function savePrefs() { writeJSON(PREFS_KEY, P); }

  const get = (map, k) => (S[map][k] ? S[map][k].v : undefined);
  const put = (map, k, v) => { S[map][k] = { v, t: now() }; };
  const setting = (k) => { const v = get("settings", k); return v == null || v === "" ? DEF[k] : v; };

  // ---------- small helpers ----------
  function toast(msg, action) {
    const t = $("toast");
    t.innerHTML = esc(msg) + (action ? ` <button type="button" class="linkbtn" id="toastAct">${esc(action.label)}</button>` : "");
    t.classList.add("show");
    if (action) $("toastAct").onclick = () => { action.run(); t.classList.remove("show"); };
    clearTimeout(toast._h); toast._h = setTimeout(() => t.classList.remove("show"), action ? 6000 : 2400);
  }
  const reduced = () => window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches;
  const inl = (s) => MD.inline(s, mdCtx(null));
  function mdCtx(w) {
    return { path: w ? w.path : "", repo: setting("repo"), internal: (p) => (weekByPath[p] ? `#read/${weekByPath[p].week}` : null) };
  }
  const plain = (s) => String(s || "").replace(/`([^`]*)`/g, "$1").replace(/\*\*|__|[*_]/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
  const secLabel = (s) => { const t = s.title.replace(/\s*\(\d+(?:\.\d+)?\s*h\)/, ""); return /^weekend$/i.test(t.trim()) ? "the weekend block" : t; };
  const shortTitle = (t) => t.replace(/\s*\(\d+(?:\.\d+)?\s*h\)/, "").replace(/:.*$/, "");
  function fmtMins(m) { return m >= 60 ? `${+(m / 60).toFixed(1)} h` : `${m} min`; }
  function fmtDur(h) { return h >= 1 ? `${+h.toFixed(2)} h` : `${Math.round(h * 60)} min`; }

  // ---------- dates ----------
  function parseISO(s) { const [y, m, d] = String(s).split("-").map(Number); return new Date(y, m - 1, d); }
  function iso(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }
  function addDays(d, n) { const x = new Date(d); x.setDate(x.getDate() + n); return x; }
  function fmt(d) { return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" }); }
  function fmtY(d) { return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" }); }
  const today = () => iso(new Date());
  function weekStart(n) { return addDays(parseISO(setting("start")), (n - 1) * 7); }
  function mondayOf(d) { const x = new Date(d.getFullYear(), d.getMonth(), d.getDate()); return addDays(x, -((x.getDay() + 6) % 7)); }
  function calendarWeekNo() { return Math.floor(Math.round((mondayOf(new Date()) - parseISO(setting("start"))) / 864e5) / 7) + 1; }

  // ---------- progress ----------
  const tickKey = (w, i) => `${w}:${i}`;
  const weekDone = (w) => w.ticks.filter((_, i) => get("ticks", tickKey(w.week, i))).length;
  const weekComplete = (w) => w.ticks.length > 0 && weekDone(w) === w.ticks.length;
  const phaseWeeks = (p) => WEEKS.filter((w) => w.phase === p);
  const passed = (p) => !!get("doneWhen", String(p));
  const phaseUnlocked = (p) => p === 0 || passed(p - 1);

  /* The week to work on: the first week, in an unlocked phase, with unticked items. If every unlocked
     week is ticked but the phase's done-when test isn't passed, it's that phase's last week (gate). */
  function currentWeek() {
    let lastUnlocked = null;
    for (const w of WEEKS) {
      if (!phaseUnlocked(w.phase)) break;
      lastUnlocked = w;
      if (!weekComplete(w)) return { w, gate: false };
    }
    if (lastUnlocked && !passed(lastUnlocked.phase)) return { w: lastUnlocked, gate: true };
    return null; // everything ticked and passed
  }

  // sections
  const secKey = (w, s) => `${w.week}:${s.id}`;
  const secDone = (w, s) => !!get("sec", secKey(w, s));
  const secRead = (w, s) => !!get("read", secKey(w, s));
  const progressSections = (w) => w.sections.filter((s) => s.kind !== "short" && s.kind !== "tick");
  /* Steps: the numbered items of a hands-on section's "Do it" lists. build_tracker.py gives each one
     an id that is a hash of its text, so a tick stays with its step if steps around it change.
     The step you're on is the first one not ticked; -1 means all done. */
  const stepsOf = (s) => (s && s.steps) || [];
  const stepKey = (w, s, id) => `${w.week}:${s.id}:${id}`;
  const stepDone = (w, s, id) => !!get("step", stepKey(w, s, id));
  const stepsDone = (w, s) => stepsOf(s).filter((id) => stepDone(w, s, id)).length;
  const stepIndex = (w, s) => stepsOf(s).findIndex((id) => !stepDone(w, s, id));
  function nextHands(w) { return w.sections.find((s) => s.kind === "hands" && !secDone(w, s)); }
  function nextReading(w) {
    return w.sections.find((s) =>
      (s.kind === "intro" && !secDone(w, s)) ||
      (s.kind === "hands" && s.why && !secRead(w, s) && !secDone(w, s)) ||
      (s.kind === "other" && !secDone(w, s)));
  }
  const watchKey = (w, i) => `${w.week}:${i}`;
  const watched = (w, i) => !!get("watched", watchKey(w, i));
  function nextWatch(w) { return w.watch.find((x) => !watched(w, x.i) && (x.searches.length || x.urls.length)); }

  // ---------- quiz (Leitner) ----------
  function availableWeeks() {
    const cur = currentWeek();
    return WEEKS.filter((w) => weekComplete(w) || !cur || w.week === cur.w.week);
  }
  function dueCards(weeks) {
    const t = today(), due = [], fresh = [];
    for (const w of weeks || availableWeeks()) for (const c of w.quiz) {
      const st = S.quiz[c.id];
      if (!st) fresh.push(c); else if (st.due <= t) due.push(c);
    }
    due.sort((a, b) => S.quiz[a.id].due.localeCompare(S.quiz[b.id].due));
    return { due, fresh };
  }
  function grade(card, ok) {
    const st = S.quiz[card.id] || { box: 0, n: 0 };
    const box = ok ? Math.min((st.box || 0) + 1, INTERVALS.length) : 1;
    S.quiz[card.id] = { box, due: iso(addDays(new Date(), INTERVALS[box - 1])), t: now(), n: (st.n || 0) + 1 };
    const d = today(); S.days[d] = (S.days[d] || 0) + 1;
    save();
  }

  // ---------- log & streak ----------
  const logList = () => Object.values(S.log).filter((e) => !e.del);
  function addLog(entry) {
    const id = uid();
    S.log[id] = Object.assign({ id, date: today(), hours: 0, studied: "", built: "", blockers: "" }, entry, { id, t: now() });
    save();
  }
  function activeDays() {
    const set = new Set(logList().filter((e) => +e.hours > 0 || e.studied).map((e) => e.date));
    for (const [d, n] of Object.entries(S.days)) if (n > 0) set.add(d);
    return set;
  }
  function streak() {
    const days = activeDays();
    let d = new Date(), todayDone = days.has(iso(d));
    if (!todayDone) d = addDays(d, -1);
    let n = 0;
    while (days.has(iso(d))) { n++; d = addDays(d, -1); }
    return { n, todayDone };
  }

  // ---------- theme & device ----------
  function applyTheme() {
    const r = document.documentElement;
    if (P.theme === "auto") r.removeAttribute("data-theme"); else r.setAttribute("data-theme", P.theme);
  }
  function autoDevice() {
    const coarse = window.matchMedia && matchMedia("(pointer: coarse)").matches;
    return coarse || window.innerWidth < 700 ? "phone" : "pc";
  }
  const device = () => P.device || autoDevice();

  // ---------- routing ----------
  const VIEWS = ["today", "course", "reader", "cards", "log", "data", "settings"];
  let route = { view: "today" };
  function parseHash() {
    const h = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
    const parts = h.split("/");
    if (parts[0] === "read" && weekByNo(+parts[1])) return { view: "reader", week: +parts[1], sid: parts[2] || null, why: parts[3] === "why" };
    if (parts[0] === "cards") return { view: "cards", mode: parts[1] || null, week: +parts[2] || null };
    if (VIEWS.includes(parts[0]) && parts[0] !== "reader") return { view: parts[0] };
    return { view: "today" };
  }
  function go(hash) { if (location.hash === hash) onRoute(); else location.hash = hash; }
  function onRoute() {
    route = parseHash();
    VIEWS.forEach((v) => $("view-" + v).classList.toggle("hidden", v !== route.view));
    const tab = route.view === "reader" ? "course" : route.view === "data" ? (isPhone() ? "settings" : "data") : route.view;
    document.querySelectorAll("[data-tab]").forEach((b) => b.setAttribute("aria-current", b.dataset.tab === tab ? "page" : "false"));
    if (route.view === "today") renderToday();
    if (route.view === "course") renderCourse();
    if (route.view === "reader") renderReader(true);
    if (route.view === "cards") renderCards();
    if (route.view === "log") renderLog();
    if (route.view === "settings") renderSettings();
    if (route.view !== "reader") window.scrollTo(0, 0);
  }
  const isPhone = () => window.innerWidth <= 720;

  // ---------- header ----------
  function renderHeader() {
    const total = WEEKS.reduce((a, w) => a + w.ticks.length, 0);
    const done = WEEKS.reduce((a, w) => a + weekDone(w), 0);
    const pct = total ? Math.round(done / total * 100) : 0;
    $("overallPct").textContent = `${pct}% · ${done}/${total}`;
    $("overallBar").style.width = pct + "%";
    const due = dueCards(); const n = due.due.length + due.fresh.length;
    document.querySelectorAll("[data-badge=cards]").forEach((b) => { b.textContent = n ? String(n) : ""; b.classList.toggle("hidden", !n); });
  }

  // ---------- Today ----------
  function actionHtml(a, primary) {
    const steps = a.steps ? `<ol class="steps">${a.steps.map((s, i) => `<li><span>${esc(s.title)} <span class="muted">· ${fmtMins(s.mins)}</span></span>
        <button class="btn small" type="button" data-act="${a.id}" data-step="${i}">${esc(s.cta)}</button></li>`).join("")}</ol>` : "";
    return `<div class="card rec ${primary ? "primary-rec" : "alt-rec"}" data-kind="${a.kind}">
      <div class="rec-label">${primary ? "Recommended" : "Or"}</div>
      <h3>${esc(a.title)}</h3>
      ${a.detail ? `<p class="rec-detail">${a.detailHtml ? a.detail : esc(a.detail)}</p>` : ""}
      ${steps}
      ${a.note ? `<p class="note">${esc(a.note)}</p>` : ""}
      ${a.cta ? `<div class="row"><button class="btn ${primary ? "primary" : ""}" type="button" data-act="${a.id}">${esc(a.cta)}</button>${a.cta2 ? `<button class="btn" type="button" data-act="${a.id}" data-alt="1">${esc(a.cta2)}</button>` : ""}</div>` : ""}
    </div>`;
  }
  let ACTIONS = {};
  function planToday(minutes, dev) {
    const cur = currentWeek();
    if (!cur) return { done: true };
    const w = cur.w;
    const q = dueCards(); const qn = q.due.length + q.fresh.length;
    const read = nextReading(w), hands = nextHands(w), watch = nextWatch(w);
    const left = w.ticks.length - weekDone(w);
    const A = {};
    const quiz = qn ? {
      kind: "quiz", title: `Review ${Math.min(qn, minutes <= 5 ? 8 : 20)} quiz card${qn === 1 ? "" : "s"}`,
      detail: `${q.due.length} due, ${q.fresh.length} new. Read the question, think of the answer, then tap to check. One card is enough to keep your streak going.`,
      cta: "Start cards", mins: minutes, label: `Quiz cards, Week ${w.week}`, run: () => go("#cards/review"),
    } : null;
    const readA = read ? {
      kind: "read",
      title: read.kind === "hands" ? `Read "Why it works" from ${shortTitle(read.title)}` : read.kind === "intro" ? `Read this week's overview` : `Read: ${shortTitle(read.title)}`,
      detail: `About ${read.readMins || 5} min, and fine on a phone.${(read.readMins || 5) < minutes / 2 ? " If there's time left, keep going: the reader saves your place." : " The reader saves your place."}`,
      cta: "Open in the reader", mins: minutes, label: `Read: ${plain(shortTitle(read.title))} (Week ${w.week})`,
      run: () => go(`#read/${w.week}/${read.id}${read.kind === "hands" ? "/why" : ""}`),
    } : null;
    const watchA = watch ? {
      kind: "watch", title: /^search\b/i.test(plain(watch.md)) && watch.searches[0] ? `Watch a video: ${watch.searches[0]}` : `Watch: ${plain(watch.md).split(/[:.(]/)[0].trim()}`,
      detail: watch.md, detailHtml: false, cta: watch.searches.length ? "Search YouTube" : "Open link", cta2: "Mark watched",
      mins: minutes, label: `Watched: ${plain(watch.md).slice(0, 60)}`,
      run: (alt) => {
        if (alt) { put("watched", watchKey(w, watch.i), true); save(); finished(); renderToday(); return; }
        window.open(watch.searches.length ? ytUrl(watch.searches[0]) : watch.urls[0], "_blank", "noopener");
      },
    } : null;
    if (watchA) { watchA.detail = MD.inline(watch.md, mdCtx(w)); watchA.detailHtml = true; }
    const handsA = hands ? {
      kind: "hands", title: stepsDone(w, hands) && stepIndex(w, hands) >= 0
        ? `Continue ${secLabel(hands)} at step ${stepIndex(w, hands) + 1} of ${stepsOf(hands).length}`
        : `${get("pos", String(w.week)) === hands.id ? "Continue" : "Start"} ${secLabel(hands)}`,
      detail: hands.mins && minutes < hands.mins ? `Planned as ${fmtMins(hands.mins)}. Do what you can in ${minutes} min: the reader remembers where you got to.` : `About ${fmtMins(hands.mins || 90)} at your PC.`,
      cta: "Open in the reader", mins: minutes, label: `${plain(shortTitle(hands.title))} (Week ${w.week})`, run: () => go(`#read/${w.week}/${hands.id}`),
    } : null;
    const tipA = w.short && w.short.phone ? {
      kind: "tip", title: "This week's phone plan", detail: MD.inline(w.short.phone.text, mdCtx(w)), detailHtml: true,
      cta: "Open the lesson", mins: minutes, label: `Phone plan, Week ${w.week}`, run: () => go(`#read/${w.week}`),
    } : null;
    const tickA = left ? {
      kind: "tick", title: `Tick off Week ${w.week}`, detail: `${left} item${left === 1 ? "" : "s"} left on the official checklist. Tick what you've done.`,
      cta: "Open the checklist", mins: minutes, label: `Checklist, Week ${w.week}`, run: () => go(`#read/${w.week}/tick-off`),
    } : null;
    const gateA = cur.gate ? {
      kind: "gate", title: `Take the Phase ${w.phase} done-when test`, detail: PHASES[w.phase].done_when,
      cta: "Open the course", mins: minutes, label: `Phase ${w.phase} done-when test`, run: () => go("#course"),
    } : null;

    let primary, alts = [];
    const pcNote = hands ? `Hands-on work (${shortTitle(hands.title)}) needs a PC. It'll be waiting in the reader.` : "";
    if (gateA) { primary = dev === "pc" && minutes >= 30 ? gateA : quiz || readA || gateA; alts = [gateA, readA, quiz]; }
    else if (dev === "phone") {
      if (minutes <= 5) { primary = quiz || readA || tipA || watchA; alts = [readA, tipA]; }
      else if (minutes <= 15) { primary = readA || watchA || tipA || quiz; alts = [watchA, quiz, tipA]; }
      else {
        const steps = [readA, watchA, quiz].filter(Boolean);
        primary = steps.length > 1 ? {
          kind: "mix", title: `A ${minutes}-minute phone mix`, detail: "Reading, a video and quiz cards: all fine on a phone.", note: pcNote,
          steps: steps.map((s) => ({ title: s.title, mins: s.kind === "quiz" ? 5 : s.kind === "watch" ? Math.max(10, minutes - 5 - (read ? read.readMins || 5 : 0)) : (read.readMins || 5), cta: s.kind === "quiz" ? "Cards" : s.kind === "watch" ? "Watch" : "Read", run: s.run })),
          mins: minutes, label: `Phone mix, Week ${w.week}`,
        } : (steps[0] ? Object.assign({}, steps[0], { note: pcNote }) : tipA);
        alts = [tipA, tickA];
      }
    } else {
      if (minutes <= 5) { primary = quiz || readA || tickA; alts = [readA, handsA]; }
      else if (minutes <= 15) { primary = readA || quiz || handsA || tickA; alts = [handsA, quiz]; }
      else { primary = handsA || tickA || readA || quiz; alts = [quiz, readA, watchA]; }
    }
    if (!primary) primary = tickA || tipA || { kind: "rest", title: "Nothing left this week", detail: "Every section is done. Tick off the checklist in the Course tab.", cta: "Open the course", mins: 5, label: "", run: () => go("#course") };
    alts = alts.filter((a) => a && a !== primary && a.kind !== primary.kind && !(primary.steps && ["read", "watch", "quiz"].includes(a.kind))).slice(0, 2);
    if (!alts.length && primary.kind !== "tick" && tickA && dev === "pc") alts = [tickA];
    let k = 0;
    for (const a of [primary, ...alts]) { a.id = "a" + k++; A[a.id] = a; }
    return { w, cur, primary, alts, actions: A };
  }
  function ytUrl(q) { return "https://www.youtube.com/results?search_query=" + encodeURIComponent(q); }

  function renderToday() {
    renderHeader();
    const dev = device(), minutes = P.minutes || 15;
    const plan = planToday(minutes, dev);
    ACTIONS = plan.actions || {};
    const st = streak();
    const streakHtml = st.n
      ? `<span class="chip streak" data-streak="${st.n}">${st.n}-day streak${st.todayDone ? " ✓" : ""}</span>`
      : `<span class="chip streak" data-streak="0">No streak yet</span>`;
    const streakNote = st.n && !st.todayDone ? `<p class="muted small">One quiz card today keeps it going.</p>` : !st.n ? `<p class="muted small">Any logged time or one quiz card a day starts a streak.</p>` : "";
    let head;
    if (plan.done) {
      head = `<div class="card pad today-head"><h2>Course complete</h2><p>All 62 weeks ticked and every done-when test passed. Keep your cards going if you like.</p>${streakHtml}</div>`;
    } else {
      const w = plan.w, cal = calendarWeekNo();
      let calNote;
      if (cal < 1) calNote = `The plan starts on ${fmtY(parseISO(setting("start")))}. A head start never hurts.`;
      else if (cal > WEEKS.length) calNote = `The planned 62 weeks are over on the calendar. Carry on at your own pace.`;
      else if (cal > w.week) calNote = `The calendar says Week ${cal}. Going at your own pace is fine. If you'd like the dates to match, move the start date in Settings.`;
      else if (cal < w.week) calNote = `You're ahead of the calendar (it says Week ${cal}).`;
      else calNote = `On schedule: w/c ${fmt(weekStart(w.week))}.`;
      head = `<div class="card pad today-head">
        <div class="head-row"><div class="eyebrow">Week ${w.week} · Phase ${w.phase}: ${esc(PHASES[w.phase].short)}</div>${streakHtml}</div>
        <h2><a href="#read/${w.week}">${inl(w.title)}</a></h2>
        <div class="bar thin"><span style="width:${Math.round(weekDone(w) / w.ticks.length * 100)}%"></span></div>
        <p class="muted small">${weekDone(w)}/${w.ticks.length} ticked · ${progressSections(w).filter((s) => secDone(w, s)).length}/${progressSections(w).length} sections done · <span data-cal>${esc(calNote)}</span></p>
        ${streakNote}
      </div>`;
    }
    const seg = (name, opts, val) => `<div class="seg" role="radiogroup" aria-label="${name}">${opts.map(([v, l]) =>
      `<button type="button" role="radio" aria-checked="${String(v) === String(val)}" data-${name === "Time available" ? "min" : "dev"}="${v}">${l}</button>`).join("")}</div>`;
    const picker = `<div class="card pad picker">
      <div class="pick"><span class="pick-label">Time</span>${seg("Time available", [[5, "5 min"], [15, "15"], [30, "30"], [60, "60"]], minutes)}</div>
      <div class="pick"><span class="pick-label">On</span>${seg("Device", [["phone", "Phone"], ["pc", "PC"]], dev)}</div>
    </div>`;
    let recs = "";
    if (!plan.done) recs = actionHtml(plan.primary, true) + plan.alts.map((a) => actionHtml(a, false)).join("");
    const short = plan.w ? shortCard(plan.w) : "";
    const quick = `<div class="card pad quicklog"><h3>Did something else?</h3><div class="row">${[5, 15, 30, 60].map((m) =>
      `<button class="btn" type="button" data-quicklog="${m}">Log ${m} min</button>`).join("")}</div></div>`;
    $("view-today").innerHTML = `<div class="today-main">${head}${picker}<div class="recs">${recs}</div></div><aside class="today-side">${short}${quick}</aside>`;
  }
  function shortCard(w, collapsed) {
    if (!w.short) return "";
    const row = (k, cls) => w.short[k] ? `<div class="short-row ${cls}"><strong>${esc(w.short[k].label)}</strong><div>${MD.inline(w.short[k].text, mdCtx(w))}</div></div>` : "";
    const rows = row("must", "must") + row("phone", "phone") + row("skip", "skip");
    if (collapsed) return `<details class="card short-card collapsible" data-short="${w.week}"><summary><span>Short on time? <span class="muted">Must do · phone · skip</span></span><span class="caret" aria-hidden="true"></span></summary><div class="pad">${rows}</div></details>`;
    return `<div class="card pad short-card" data-short="${w.week}"><h3>Short on time? Week ${w.week}</h3>${rows}</div>`;
  }
  $("view-today").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b) return;
    if (b.dataset.min) { P.minutes = +b.dataset.min; savePrefs(); renderToday(); return; }
    if (b.dataset.dev) { P.device = b.dataset.dev; savePrefs(); renderToday(); return; }
    if (b.dataset.quicklog) { logMinutes(+b.dataset.quicklog, "Study session"); return; }
    if (b.dataset.act) {
      const a = ACTIONS[b.dataset.act]; if (!a) return;
      if (b.dataset.step != null) {
        const s = a.steps[+b.dataset.step];
        startPending(a.mins, a.label); s.run(); return;
      }
      if (a.label) startPending(a.mins, a.label);
      a.run(!!b.dataset.alt);
    }
  });

  // ---------- pending action & one-tap log ----------
  function startPending(mins, label) { P.pending = { mins, label, at: now() }; savePrefs(); renderPending(); }
  function finished(mins, label) {
    if (!P.pending && mins) P.pending = { mins, label, at: now() };
    if (P.pending) { P.pending.finished = true; savePrefs(); }
    renderPending();
  }
  function renderPending() {
    const bar = $("pendingBar"), p = P.pending;
    if (!p) { bar.classList.add("hidden"); bar.innerHTML = ""; document.body.classList.remove("has-pending"); return; }
    bar.classList.remove("hidden"); document.body.classList.add("has-pending");
    bar.innerHTML = `<span class="pb-text">${p.finished ? "Nice work." : "When you're done:"} <span class="muted">${esc(p.label)}</span></span>
      <button class="btn primary small" type="button" id="pbLog">Log ${p.mins} min</button>
      <button class="btn small ghost" type="button" id="pbClose" aria-label="Dismiss">✕</button>`;
    $("pbLog").onclick = () => { const q = P.pending; P.pending = null; savePrefs(); renderPending(); logMinutes(q.mins, q.label); };
    $("pbClose").onclick = () => { P.pending = null; savePrefs(); renderPending(); };
  }
  function logMinutes(mins, label) {
    const before = streak().n;
    addLog({ hours: +(mins / 60).toFixed(3), studied: label || "" });
    const after = streak().n;
    toast(`Logged ${mins} min${after > before ? ` · ${after}-day streak` : ""}`);
    renderHeader();
    if (route.view === "today") renderToday();
    if (route.view === "log") renderLog();
  }

  // ---------- Course ----------
  function lessonUrl(w) { return setting("repo").replace(/\/?$/, "/") + w.path; }
  function renderCourse() {
    renderHeader();
    const cur = currentWeek(), cw = cur ? cur.w.week : null, cal = calendarWeekNo();
    const nc = $("nowCard");
    if (!cur) nc.innerHTML = `<div><b>Course complete</b><div class="meta">Every week ticked and every done-when test passed.</div></div>`;
    else {
      const w = cur.w;
      nc.innerHTML = `<div><b>You're on Week ${w.week}: ${inl(w.title)}</b>
        <div class="meta">${weekDone(w)}/${w.ticks.length} done · Phase ${w.phase}: ${esc(PHASES[w.phase].name)}${cal >= 1 && cal <= WEEKS.length && cal !== w.week ? ` · Calendar: Week ${cal}` : ""}</div></div>
        <a class="btn primary" href="#read/${w.week}">Open lesson</a>`;
    }
    const host = $("phases");
    const openState = {};
    host.querySelectorAll("details[data-key]").forEach((d) => (openState[d.dataset.key] = d.open));
    host.innerHTML = PHASES.map((ph) => {
      const ws = phaseWeeks(ph.id);
      const t = ws.reduce((a, w) => a + w.ticks.length, 0), d = ws.reduce((a, w) => a + weekDone(w), 0);
      const p = t ? Math.round(d / t * 100) : 0;
      const unlocked = phaseUnlocked(ph.id), ok = passed(ph.id);
      const first = ws[0].week, last = ws[ws.length - 1].week;
      const chip = ok ? `<span class="chip done">Passed</span>` : unlocked ? `<span class="chip">${p}%</span>` : `<span class="chip locked">Locked</span>`;
      const isOpen = openState["p" + ph.id] ?? (cw != null && cw >= first && cw <= last);
      return `<details class="card phase" data-key="p${ph.id}" ${isOpen ? "open" : ""}>
        <summary><div><h2>Phase ${ph.id}: ${esc(ph.name)}</h2>
          <div class="sub">Weeks ${first}–${last} · ${fmt(weekStart(first))} – ${fmtY(addDays(weekStart(last), 6))}</div></div>${chip}
          <div class="pbar bar ${ok ? "good" : ""}"><span style="width:${p}%"></span></div></summary>
        ${unlocked ? "" : `<div class="lockmsg">Pass the Phase ${ph.id - 1} done-when test to unlock ticking here. You can still read the lessons.</div>`}
        ${doneWhenHtml(ph, unlocked, ok, "dw")}
        ${ws.map((w) => weekHtml(w, unlocked, cw, openState)).join("")}
      </details>`;
    }).join("");
  }
  function doneWhenHtml(ph, unlocked, ok, prefix) {
    return `<div class="donewhen ${ok ? "passed" : ""}">
      <input type="checkbox" id="${prefix}${ph.id}" data-dw="${ph.id}" ${ok ? "checked" : ""} ${unlocked ? "" : "disabled"}>
      <label for="${prefix}${ph.id}"><strong>Done when</strong>${esc(ph.done_when)}</label></div>`;
  }
  function ticksHtml(w, unlocked, prefix) {
    return `<ul class="ticks">${w.ticks.map((t, i) => `<li><label class="tick">
      <input type="checkbox" data-tick="${tickKey(w.week, i)}" ${get("ticks", tickKey(w.week, i)) ? "checked" : ""} ${unlocked ? "" : "disabled"}>
      <span>${inl(t)}</span></label></li>`).join("")}</ul>`;
  }
  function weekHtml(w, unlocked, cw, openState) {
    const s = weekStart(w.week), d = weekDone(w), complete = weekComplete(w);
    const isOpen = openState["w" + w.week] ?? (w.week === cw);
    return `<details class="week ${w.week === cw ? "current" : ""} ${complete ? "complete" : ""}" data-key="w${w.week}" ${isOpen ? "open" : ""}>
      <summary><span class="num">W${w.week}</span>
        <span class="t">${inl(w.title)}<span>${fmt(s)} – ${fmt(addDays(s, 6))}</span></span>
        <span class="chip ${complete ? "done" : ""}">${complete ? "✓ " : ""}${d}/${w.ticks.length}</span></summary>
      <div class="body">${ticksHtml(w, unlocked)}
        <div class="row"><a class="btn" href="#read/${w.week}">Open lesson</a>
        <a class="btn ghost" href="${esc(lessonUrl(w))}" target="_blank" rel="noopener">GitHub ↗</a></div></div>
    </details>`;
  }
  function onTickChange(e) {
    const t = e.target;
    if (t.dataset.tick) { put("ticks", t.dataset.tick, t.checked); }
    else if (t.dataset.dw) {
      const p = +t.dataset.dw;
      if (t.checked) { put("doneWhen", String(p), iso(new Date())); toast(`Phase ${p} passed. Well done.`); }
      else for (let q = p; q < PHASES.length; q++) if (S.doneWhen[q]) put("doneWhen", String(q), null);
    } else return;
    save();
    if (route.view === "course") renderCourse(); else if (route.view === "reader") renderReader(false); else renderHeader();
  }
  $("phases").addEventListener("change", onTickChange);

  // ---------- Reader ----------
  let readerWeek = null, openSecs = new Set();
  function sectionChip(w, s) {
    if (s.kind === "short" || s.kind === "tick") return "";
    if (secDone(w, s)) return `<span class="chip done">Done</span>`;
    const n = stepsOf(s).length, d = stepsDone(w, s);
    if (n && d) return `<span class="chip">${d}/${n} steps</span>`;
    if (secRead(w, s)) return `<span class="chip">Read</span>`;
    return "";
  }
  /* The hands-on section the step bar follows: the one you last opened, if it's open and has steps,
     else the first open one with steps. */
  function activeStepSec(w, secs) {
    const has = (s) => s && openSecs.has(s.id) && stepsOf(s).length;
    const pos = secs.find((s) => s.id === get("pos", String(w.week)));
    return has(pos) ? pos : secs.find(has) || null;
  }
  function hereLine(w, secs) {
    const pos = secs.find((s) => s.id === get("pos", String(w.week)));
    const s = pos && stepsOf(pos).length && stepIndex(w, pos) >= 0 ? pos : secs.find((x) => stepsOf(x).length && stepsDone(w, x) && stepIndex(w, x) >= 0);
    if (!s || !stepsDone(w, s)) return "";
    return `<p class="here-line"><span class="here-dot" aria-hidden="true"></span>You're on <a href="#read/${w.week}/${s.id}">${esc(shortTitle(s.title))} · step ${stepIndex(w, s) + 1} of ${stepsOf(s).length}</a></p>`;
  }
  function stepBarHtml(w, s, secs) {
    const n = stepsOf(s).length, cur = stepIndex(w, s), d = stepsDone(w, s);
    const name = esc(shortTitle(s.title));
    if (cur < 0) {
      const next = secs[secs.indexOf(s) + 1];
      return `<div class="stepbar" role="region" aria-label="Step controls" data-sid="${s.id}">
        <span class="sb-text"><strong>All ${n} steps done</strong> <span class="muted">· ${name}</span></span>
        <button type="button" class="btn small ghost" data-stepback="1">‹ Back</button>
        ${next ? `<button type="button" class="btn primary" data-barnext="${next.id}">Next: ${esc(shortTitle(next.title))} ›</button>` : ""}
      </div>`;
    }
    return `<div class="stepbar" role="region" aria-label="Step controls" data-sid="${s.id}">
      <span class="sb-text"><strong>Step ${cur + 1} of ${n}</strong> <span class="muted">· ${name}</span></span>
      <button type="button" class="btn small ghost" data-stepback="1"${d ? "" : " disabled"}>‹ Back</button>
      <button type="button" class="btn small toggle" data-focus="1" aria-pressed="${!!P.focus}" title="Show only the step you're on (F)">Focus</button>
      <button type="button" class="btn primary" data-stepnext="1" title="Tick this step and move on (N)">Done → next step</button>
    </div>`;
  }
  /* Turn the rendered "Do it" lists of one open section into tickable steps. The build script and
     app/markdown.js agree on which <li>s these are: top-level <ol> items outside "Why ..." parts.
     If the counts ever disagree the section stays plain rather than ticking the wrong step. */
  function decorateSteps(w, s, focus) {
    const el = document.querySelector(`.rsec[data-sid="${CSS.escape(s.id)}"] .rsec-body`);
    const ids = stepsOf(s);
    if (!el || !ids.length) return;
    const lis = []; let why = false;
    for (const node of el.children) {
      if (node.tagName === "H3") { why = /^why/i.test(node.textContent.trim()); continue; }
      if (node.tagName === "OL" && !why) { node.classList.add("steps-ol"); lis.push(...node.children); }
    }
    if (lis.length !== ids.length) { el.querySelectorAll("ol.steps-ol").forEach((o) => o.classList.remove("steps-ol")); return; }
    const cur = stepIndex(w, s);
    lis.forEach((li, i) => {
      const done = stepDone(w, s, ids[i]), num = i + 1;
      li.classList.add("step");
      li.classList.toggle("done", done);
      li.classList.toggle("current", i === cur);
      if (cur >= 0) { li.classList.toggle("prev", i === cur - 1); li.classList.toggle("next", i === cur + 1); }
      li.insertAdjacentHTML("afterbegin", `<button type="button" class="stepbox" data-step="${i}" data-sid="${s.id}" aria-pressed="${done}" aria-label="Step ${num}${done ? ", done. Untick" : ". Tick when done"}">${done ? "✓" : num}</button>${i === cur ? `<span class="here">You are here</span>` : ""}`);
      li.querySelectorAll("p").forEach((p) => { if (/^You should see\b/.test(p.textContent.trim())) p.classList.add("expect"); });
    });
    if (focus && cur >= 0) {
      el.classList.add("focus");
      lis.forEach((li) => { if (li.matches(".current, .prev, .next")) li.parentElement.classList.add("in-focus"); });
      el.insertAdjacentHTML("afterbegin", `<p class="focus-note muted small">Focus view: just the step you're on. <button type="button" class="linkbtn" data-focus="1">Show the whole session</button></p>`);
    }
  }
  function tickStep(w, s, i, on) {
    const ids = stepsOf(s); if (!ids[i]) return;
    put("step", stepKey(w, s, ids[i]), on);
    put("pos", String(w.week), s.id);
    const all = on && stepIndex(w, s) < 0;
    if (all && !secDone(w, s)) {
      put("sec", secKey(w, s), true);
      save(); renderReader(false);
      finished(s.mins ? Math.min(s.mins, 90) : 30, `${plain(shortTitle(s.title))} (Week ${w.week})`);
      toast(`${shortTitle(s.title)}: all ${ids.length} steps done`);
      return;
    }
    save(); renderReader(false);
  }
  function scrollToCurrent(smooth) {
    const el = document.querySelector(".rsec.open li.step.current") || document.querySelector(".stepbar");
    if (el) el.scrollIntoView({ block: "center", behavior: smooth && !reduced() ? "smooth" : "auto" });
  }
  function stepNext(w) {
    const secs = w.sections.filter((x) => x.kind !== "short"), s = activeStepSec(w, secs);
    if (!s) return;
    const cur = stepIndex(w, s); if (cur < 0) return;
    tickStep(w, s, cur, true);
    scrollToCurrent(true);
  }
  function stepBack(w) {
    const secs = w.sections.filter((x) => x.kind !== "short"), s = activeStepSec(w, secs);
    if (!s) return;
    const cur = stepIndex(w, s), i = (cur < 0 ? stepsOf(s).length : cur) - 1;
    if (i < 0) return;
    tickStep(w, s, i, false);
    scrollToCurrent(true);
  }
  function renderReader(fromRoute) {
    renderHeader();
    const w = weekByNo(route.week);
    if (!w) return;
    if (readerWeek !== w.week) { readerWeek = w.week; openSecs = new Set(); }
    const secs = w.sections.filter((s) => s.kind !== "short");
    let target = route.sid && secs.find((s) => s.id === route.sid);
    if (fromRoute) {
      if (!target) target = secs.find((s) => s.id === get("pos", String(w.week))) || secs.find((s) => !secDone(w, s) && s.kind !== "tick") || secs[0];
      openSecs.add(target.id);
    }
    const ps = progressSections(w), nd = ps.filter((s) => secDone(w, s)).length;
    const unlocked = phaseUnlocked(w.phase);
    const html = `<div class="card pad reader-head">
        <div class="eyebrow">Week ${w.week} · Phase ${w.phase}: ${esc(PHASES[w.phase].name)}</div>
        <h2>${inl(w.title)}</h2>
        <div class="bar thin"><span style="width:${ps.length ? Math.round(nd / ps.length * 100) : 0}%"></span></div>
        <p class="muted small">${nd}/${ps.length} sections done · ${weekDone(w)}/${w.ticks.length} ticked${unlocked ? "" : " · phase locked for ticking"}</p>
        ${hereLine(w, secs)}
        <div class="row">
          ${w.week > 1 ? `<a class="btn small" href="#read/${w.week - 1}">‹ Week ${w.week - 1}</a>` : ""}
          ${w.week < WEEKS.length ? `<a class="btn small" href="#read/${w.week + 1}">Week ${w.week + 1} ›</a>` : ""}
          <a class="btn small ghost" href="${esc(lessonUrl(w))}" target="_blank" rel="noopener">Open on GitHub ↗</a>
        </div>
      </div>
      ${shortCard(w, true)}
      <nav class="toc" aria-label="Sections">${secs.map((s) => `<a href="#read/${w.week}/${s.id}" class="toc-item ${secDone(w, s) ? "done" : ""}">${secDone(w, s) ? "✓ " : ""}${esc(shortTitle(s.title))}</a>`).join("")}</nav>
      ${secs.map((s, i) => sectionHtml(w, s, i, secs, unlocked)).join("")}`;
    const act = activeStepSec(w, secs);
    $("view-reader").innerHTML = html + (act ? stepBarHtml(w, act, secs) : "");
    $("view-reader").classList.toggle("has-stepbar", !!act);
    secs.forEach((s) => { if (openSecs.has(s.id) && stepsOf(s).length) decorateSteps(w, s, !!P.focus && s === act); });
    if (fromRoute && target) {
      const midSteps = stepsDone(w, target) > 0 && stepIndex(w, target) >= 0 && !route.why;
      const hadPlace = !!route.sid || get("pos", String(w.week)) === target.id && target !== secs[0] || midSteps;
      if (get("pos", String(w.week)) !== target.id) { put("pos", String(w.week), target.id); save(); }
      requestAnimationFrame(() => {
        let el = document.querySelector(`.rsec[data-sid="${CSS.escape(target.id)}"]`);
        if (route.why && target.why) el = el.querySelector(`[data-h="${target.why[0]}"]`) || el;
        const cur = midSteps && el && el.querySelector("li.step.current");
        if (cur) cur.scrollIntoView({ block: "center", behavior: "auto" });
        else if (el && hadPlace) el.scrollIntoView({ block: "start", behavior: "auto" });
        else window.scrollTo(0, 0);
      });
    }
  }
  function sectionHtml(w, s, i, secs, unlocked) {
    const open = openSecs.has(s.id);
    const meta = s.mins ? fmtMins(s.mins) : s.readMins ? `${s.readMins} min read` : s.kind === "check" ? `${w.quiz.length} cards` : "";
    let foot = "";
    const next = secs[i + 1];
    const toggle = (map, label, on) => `<button type="button" class="btn small toggle" aria-pressed="${on}" data-mark="${map}" data-sid="${s.id}">${on ? "✓ " : ""}${label}</button>`;
    if (s.kind === "hands") foot = (s.why ? toggle("read", "Read it", secRead(w, s)) : "") + toggle("sec", "Done it", secDone(w, s));
    else if (s.kind === "intro") foot = toggle("sec", "Read", secDone(w, s));
    else if (s.kind !== "tick") foot = toggle("sec", "Done", secDone(w, s));
    if (s.kind === "check" && w.quiz.length) foot = `<a class="btn small primary" href="#cards/week/${w.week}">Practise as cards</a>` + foot;
    if (next) foot += `<button type="button" class="btn small ghost" data-next="${next.id}">Next: ${esc(shortTitle(next.title))} ›</button>`;
    return `<section class="card rsec ${open ? "open" : ""}" data-sid="${s.id}" data-kind="${s.kind}">
      <button type="button" class="rsec-head" aria-expanded="${open}" data-toggle="${s.id}">
        <span class="rsec-title">${esc(s.title)}</span>
        <span class="rsec-meta">${meta ? `<span class="muted small">${esc(meta)}</span>` : ""}${sectionChip(w, s)}<span class="caret" aria-hidden="true"></span></span>
      </button>
      ${open ? `<div class="rsec-body md">${sectionBody(w, s, unlocked)}</div><div class="rsec-foot row">${foot}</div>` : ""}
    </section>`;
  }
  function sectionBody(w, s, unlocked) {
    const ctx = mdCtx(w);
    if (s.kind === "tick") {
      const ph = PHASES[w.phase], ws = phaseWeeks(w.phase);
      const isLast = ws[ws.length - 1].week === w.week;
      return `${unlocked ? "" : `<p class="lockmsg">Pass the Phase ${w.phase - 1} done-when test to unlock ticking here.</p>`}
        <p class="muted small">The official checklist. Ticks here are the same as in the Course tab.</p>
        ${ticksHtml(w, unlocked)}${isLast ? doneWhenHtml(ph, unlocked, passed(ph.id), "rdw") : ""}`;
    }
    if (s.kind === "watch") {
      const lines = s.md.split("\n"); const k = lines.findIndex((l) => /^[-*]\s/.test(l));
      const intro = k > 0 ? MD.render(lines.slice(0, k).join("\n"), ctx) : "";
      return intro + `<ul class="watch">${w.watch.map((x) => `<li class="${watched(w, x.i) ? "watched" : ""}">
        <div>${MD.inline(x.md, ctx)}</div>
        <div class="row">${x.searches.map((q) => `<a class="btn small" href="${esc(ytUrl(q))}" target="_blank" rel="noopener">▶ YouTube: ${esc(q)}</a>`).join("")}
        ${x.urls.map((u) => `<a class="btn small" href="${esc(u)}" target="_blank" rel="noopener">Open ${esc(u.replace(/^https?:\/\/(www\.)?/, "").split("/")[0])} ↗</a>`).join("")}
        <button type="button" class="btn small toggle" aria-pressed="${watched(w, x.i)}" data-watch="${x.i}">${watched(w, x.i) ? "✓ Watched" : "Mark watched"}</button></div>
      </li>`).join("")}</ul>`;
    }
    return MD.render(s.md, ctx);
  }
  $("view-reader").addEventListener("click", (e) => {
    const w = weekByNo(readerWeek); if (!w) return;
    const b = e.target.closest("button, a"); if (!b) return;
    if (b.dataset.step != null) {
      const s = w.sections.find((x) => x.id === b.dataset.sid); if (!s) return;
      tickStep(w, s, +b.dataset.step, b.getAttribute("aria-pressed") !== "true");
      return;
    }
    if (b.dataset.stepnext) { stepNext(w); return; }
    if (b.dataset.stepback) { stepBack(w); return; }
    if (b.dataset.focus) { P.focus = !P.focus; savePrefs(); renderReader(false); scrollToCurrent(false); return; }
    if (b.dataset.barnext) {
      const sid = b.closest(".stepbar").dataset.sid;
      openSecs.delete(sid); openSecs.add(b.dataset.barnext);
      put("pos", String(w.week), b.dataset.barnext); save();
      renderReader(false);
      const el = document.querySelector(`.rsec[data-sid="${CSS.escape(b.dataset.barnext)}"]`);
      if (el) el.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
      return;
    }
    if (b.dataset.toggle) {
      const id = b.dataset.toggle;
      if (openSecs.has(id)) openSecs.delete(id); else { openSecs.add(id); put("pos", String(w.week), id); save(); }
      renderReader(false);
      return;
    }
    if (b.dataset.next) {
      const cur = b.closest(".rsec").dataset.sid;
      openSecs.delete(cur); openSecs.add(b.dataset.next);
      put("pos", String(w.week), b.dataset.next); save();
      renderReader(false);
      const el = document.querySelector(`.rsec[data-sid="${CSS.escape(b.dataset.next)}"]`);
      if (el) el.scrollIntoView({ block: "start", behavior: reduced() ? "auto" : "smooth" });
      return;
    }
    if (b.dataset.mark) {
      const s = w.sections.find((x) => x.id === b.dataset.sid);
      const k = secKey(w, s), on = !get(b.dataset.mark, k);
      put(b.dataset.mark, k, on); save();
      renderReader(false);
      if (on) finished(s.mins && b.dataset.mark === "sec" ? Math.min(s.mins, 90) : s.readMins || 10, `${plain(shortTitle(s.title))} (Week ${w.week})`);
      return;
    }
    if (b.dataset.watch != null) {
      const i = +b.dataset.watch, on = !watched(w, i);
      put("watched", watchKey(w, i), on); save(); renderReader(false);
      if (on) finished(15, `Watched a video (Week ${w.week})`);
    }
  });
  $("view-reader").addEventListener("change", onTickChange);

  // ---------- Cards ----------
  let review = null; // {queue:[card], i, shown, done, again:Set, weekOnly}
  function startReview(weekNo) {
    let queue;
    if (weekNo) {
      const w = weekByNo(weekNo); const t = today();
      queue = [...w.quiz].sort((a, b) => ((S.quiz[a.id]?.due || "") <= t ? 0 : 1) - ((S.quiz[b.id]?.due || "") <= t ? 0 : 1));
    } else {
      const q = dueCards(); queue = q.due.concat(q.fresh.slice(0, NEW_PER_SESSION));
    }
    review = { queue, i: 0, shown: false, done: 0, again: new Set(), weekOnly: weekNo || null, started: now() };
  }
  function renderCards() {
    renderHeader();
    const host = $("view-cards");
    if (route.mode === "review" || route.mode === "week") {
      if (!review || review.weekOnly !== (route.mode === "week" ? route.week : null)) startReview(route.mode === "week" ? route.week : null);
      return renderCard(host);
    }
    review = null;
    const q = dueCards(), n = q.due.length + q.fresh.length, cur = currentWeek(), st = streak();
    const reviewed = Object.keys(S.quiz).length, total = WEEKS.reduce((a, w) => a + w.quiz.length, 0);
    const avail = availableWeeks().filter((w) => w.quiz.length);
    const nextDue = Object.values(S.quiz).map((c) => c.due).filter((d) => d > today()).sort()[0];
    host.innerHTML = `<div class="card pad cards-home">
        <h2><span data-due>${n}</span> due today</h2>
        <p class="muted">${q.due.length} to review, ${q.fresh.length} new. Cards come from the weeks you've finished and the week you're on${cur ? ` (Week ${cur.w.week})` : ""}.</p>
        ${n ? `<a class="btn primary big" href="#cards/review">Start (${Math.min(n, q.due.length + NEW_PER_SESSION)} cards)</a>` : `<p>You're up to date.${nextDue ? ` Next cards are due ${fmt(parseISO(nextDue))}.` : ""}</p>`}
        <p class="muted small">${st.n ? `${st.n}-day streak. ` : ""}One card counts as a minimum day for your streak. Got it moves a card up a box (back in 1, 3, 7, 14, then 30 days). Again sends it back to box 1.</p>
      </div>
      <div class="card pad"><h3>Practise a week</h3>
        <div class="row">${avail.map((w) => `<a class="btn small" href="#cards/week/${w.week}">W${w.week} · ${w.quiz.length}</a>`).join("") || `<span class="muted">No cards yet.</span>`}</div>
        <p class="muted small">${reviewed} of ${total} cards seen so far.</p></div>`;
  }
  function renderCard(host) {
    const r = review;
    if (!r.queue.length || r.i >= r.queue.length) {
      const q = dueCards();
      host.innerHTML = `<div class="card pad cards-done"><h2>${r.done ? "Done for now" : "No cards here"}</h2>
        <p>${r.done ? `You went through ${r.done} card${r.done === 1 ? "" : "s"}.` : "Nothing is due."} ${q.due.length + q.fresh.length ? `${q.due.length + q.fresh.length} more available.` : ""}</p>
        <div class="row"><a class="btn" href="#cards">Back to cards</a><a class="btn" href="#today">Today</a></div></div>`;
      if (r.done && !r._logged) { r._logged = true; finished(Math.max(5, Math.round((now() - r.started) / 60000 / 5) * 5), `Quiz cards (${r.done})`); }
      return;
    }
    const c = r.queue[r.i], [wn] = c.id.split("-").map(Number), w = weekByNo(wn), st = S.quiz[c.id];
    const ctx = mdCtx(w);
    host.innerHTML = `<div class="quiz">
      <div class="quiz-top"><a class="btn small ghost" href="#cards">‹ Cards</a><span class="muted small">${r.i + 1} of ${r.queue.length} · Week ${wn} · ${st ? `box ${st.box}` : "new"}</span></div>
      <div class="card qcard">
        <div class="q md">${MD.render(c.q, ctx)}</div>
        ${r.shown ? `<hr><div class="a md">${MD.render(c.a, ctx)}</div>` : ""}
      </div>
      <div class="quiz-actions">${r.shown
        ? `<button class="btn big again" type="button" data-grade="0">Again</button><button class="btn big primary" type="button" data-grade="1">Got it</button>`
        : `<button class="btn big primary wide" type="button" data-reveal="1">Show answer</button>`}</div>
    </div>`;
  }
  $("view-cards").addEventListener("click", (e) => {
    const b = e.target.closest("button"); if (!b || !review) return;
    if (b.dataset.reveal) { review.shown = true; renderCard($("view-cards")); return; }
    if (b.dataset.grade != null) gradeCurrent(b.dataset.grade === "1");
  });
  function gradeCurrent(ok) {
    const r = review, c = r.queue[r.i];
    const was = streak().n;
    grade(c, ok); r.done++;
    if (!ok && !r.again.has(c.id)) { r.again.add(c.id); r.queue.push(c); }
    r.i++; r.shown = false;
    if (streak().n > was) toast(`${streak().n}-day streak`);
    renderHeader(); renderCard($("view-cards"));
    window.scrollTo(0, 0);
  }
  // Reader keys, for when the reader is on a second monitor: N = done, next step; B = back; F = focus.
  document.addEventListener("keydown", (e) => {
    if (route.view !== "reader" || e.ctrlKey || e.metaKey || e.altKey || e.target.closest("input, textarea, select")) return;
    const w = weekByNo(readerWeek); if (!w || !document.querySelector(".stepbar")) return;
    const k = e.key.toLowerCase();
    if (k === "n") { e.preventDefault(); stepNext(w); }
    else if (k === "b") { e.preventDefault(); stepBack(w); }
    else if (k === "f") { e.preventDefault(); P.focus = !P.focus; savePrefs(); renderReader(false); scrollToCurrent(false); }
  });
  document.addEventListener("keydown", (e) => {
    if (route.view !== "cards" || !review || e.target.closest("input, textarea, select")) return;
    if (!review.shown && (e.key === " " || e.key === "Enter")) { e.preventDefault(); review.shown = true; renderCard($("view-cards")); }
    else if (review.shown && (e.key === "1" || e.key === "ArrowLeft")) gradeCurrent(false);
    else if (review.shown && (e.key === "2" || e.key === "ArrowRight")) gradeCurrent(true);
  });

  // ---------- weekly log ----------
  function renderLog() {
    renderHeader();
    const target = +setting("target") || 5, list = logList();
    const byWeek = {};
    list.forEach((e) => { const k = iso(mondayOf(parseISO(e.date))); byWeek[k] = (byWeek[k] || 0) + (+e.hours || 0); });
    const totalHrs = list.reduce((a, e) => a + (+e.hours || 0), 0);
    const weeks = Object.keys(byWeek).sort();
    const hit = weeks.filter((k) => byWeek[k] >= target).length;
    const avg = weeks.length ? totalHrs / weeks.length : 0;
    const st = streak();
    $("logStats").innerHTML = [
      ["Total hours", totalHrs.toFixed(1)], ["Weeks logged", weeks.length],
      ["Avg per week", avg.toFixed(1)], [`Weeks ≥ ${target} h`, `${hit}/${weeks.length}`], ["Day streak", st.n],
    ].map(([l, v]) => `<div class="card stat"><b>${v}</b><span>${l}</span></div>`).join("");

    let end = mondayOf(new Date());
    if (weeks.length && parseISO(weeks[weeks.length - 1]) > end) end = parseISO(weeks[weeks.length - 1]);
    const startW = weeks.length ? parseISO(weeks[0]) : addDays(end, -7 * 7);
    let first = addDays(end, -15 * 7); if (startW > first) first = startW;
    if (first > addDays(end, -7 * 7)) first = addDays(end, -7 * 7);
    const cols = [];
    for (let d = new Date(first); d <= end; d = addDays(d, 7)) cols.push(iso(d));
    if (!cols.length) cols.push(iso(end));
    const max = Math.max(target * 1.5, ...cols.map((k) => byWeek[k] || 0));
    const W = 640, H = 200, pl = 28, pb = 22, pt = 8, bw = (W - pl) / cols.length;
    const y = (v) => pt + (H - pt - pb) * (1 - v / max);
    let svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Hours per week chart">`;
    [0, target, Math.floor(max)].filter((v, i, a) => a.indexOf(v) === i).forEach((v) => (svg += `<text x="${pl - 6}" y="${y(v) + 4}" text-anchor="end">${v}</text>`));
    cols.forEach((k, i) => {
      const v = byWeek[k] || 0, x = pl + i * bw + bw * 0.15, h = H - pb - y(v);
      const col = v >= target ? "var(--good)" : v > 0 ? "var(--accent)" : "var(--surface-2)";
      svg += `<rect x="${x}" y="${y(v)}" width="${bw * 0.7}" height="${Math.max(h, v ? 1 : 2)}" rx="3" fill="${col}"><title>w/c ${fmt(parseISO(k))}: ${+v.toFixed(2)} h</title></rect>`;
      if (cols.length <= 16 && (i % 2 === 0 || cols.length <= 8)) svg += `<text x="${x + bw * 0.35}" y="${H - 6}" text-anchor="middle">${fmt(parseISO(k))}</text>`;
    });
    svg += `<line x1="${pl}" x2="${W}" y1="${y(target)}" y2="${y(target)}" stroke="var(--bad)" stroke-dasharray="4 4"/>`;
    svg += `<text x="${pl + 4}" y="${y(target) - 5}" text-anchor="start">target ${target} h</text></svg>`;
    $("chart").innerHTML = svg;

    const rows = list.sort((a, b) => b.date.localeCompare(a.date) || (b.t || 0) - (a.t || 0));
    $("logTable").innerHTML = rows.length
      ? `<tr><th>Date</th><th>Time</th><th>Studied / built / blockers</th><th></th></tr>` + rows.map((e) => `<tr>
          <td>${fmt(parseISO(e.date))}</td><td>${fmtDur(+e.hours || 0)}</td>
          <td>${e.studied ? esc(e.studied) : ""}${e.built ? `<div class="muted">Built: ${esc(e.built)}</div>` : ""}${e.blockers ? `<div class="muted">Blocker: ${esc(e.blockers)}</div>` : ""}</td>
          <td><button class="btn danger small" data-del="${esc(e.id)}" type="button" aria-label="Delete entry">✕</button></td></tr>`).join("")
      : `<tr><td class="muted">No entries yet. Log any session, however short: Today has one-tap buttons.</td></tr>`;
  }
  $("logForm").addEventListener("submit", (e) => {
    e.preventDefault();
    addLog({ date: $("lDate").value, hours: +$("lHours").value, studied: $("lStudied").value.trim(), built: $("lBuilt").value.trim(), blockers: $("lBlockers").value.trim() });
    renderLog(); toast("Entry saved");
    ["lHours", "lStudied", "lBuilt", "lBlockers"].forEach((id) => ($(id).value = ""));
  });
  $("logTable").addEventListener("click", (e) => {
    const b = e.target.closest("[data-del]"); if (!b) return;
    if (!confirm("Delete this entry?")) return;
    const x = S.log[b.dataset.del]; if (x) S.log[x.id] = Object.assign({}, x, { del: true, t: now() });
    save(); renderLog();
  });

  // ---------- settings, backup ----------
  function renderSettings() {
    $("sStart").value = setting("start"); $("sTarget").value = setting("target"); $("sRepo").value = setting("repo"); $("sTheme").value = P.theme;
    $("sDevice").value = P.device || "auto";
    $("bShare").classList.toggle("hidden", !canShareFiles());
    Sync.render();
    $("installBtn").classList.toggle("hidden", !deferredInstall);
    $("installNote").innerHTML = location.protocol.startsWith("http")
      ? "On Android (Chrome): menu ⋮ → <b>Install app</b> or <b>Add to Home screen</b>. On iPhone (Safari): Share → <b>Add to Home Screen</b>. Once installed it opens full screen and works offline."
      : "Installing needs the web address (GitHub Pages, see the README). This copy was opened from a file, which works fine on this PC but can't be installed.";
  }
  $("sStart").addEventListener("change", (e) => { if (e.target.value) { const v = iso(mondayOf(parseISO(e.target.value))); put("settings", "start", v); e.target.value = v; save(); toast("Plan dates updated"); } });
  $("sTarget").addEventListener("change", (e) => { put("settings", "target", Math.max(1, +e.target.value || 5)); save(); });
  $("sRepo").addEventListener("change", (e) => { put("settings", "repo", e.target.value.trim() || DEFAULT_REPO); save(); });
  $("sTheme").addEventListener("change", (e) => { P.theme = e.target.value; savePrefs(); applyTheme(); });
  $("sDevice").addEventListener("change", (e) => { P.device = e.target.value === "auto" ? null : e.target.value; savePrefs(); });

  function backupText() { return JSON.stringify(Object.assign({ app: "data-skills-studio", exported: new Date().toISOString() }, S), null, 1); }
  const backupName = () => `data-skills-progress-${today()}.json`;
  function canShareFiles() {
    try { return !!(navigator.canShare && navigator.canShare({ files: [new File(["{}"], "x.json", { type: "application/json" })] })); } catch (e) { return false; }
  }
  $("bExport").addEventListener("click", () => download(backupName(), backupText(), "application/json"));
  $("bShare").addEventListener("click", async () => {
    const file = new File([backupText()], backupName(), { type: "application/json" });
    try { await navigator.share({ files: [file], title: "Data Skills Studio progress" }); }
    catch (e) { if (e && e.name !== "AbortError") download(backupName(), backupText(), "application/json"); }
  });
  $("bImport").addEventListener("change", async (e) => {
    const f = e.target.files[0]; if (!f) return;
    try {
      const obj = JSON.parse(await f.text());
      if (!obj || typeof obj !== "object" || !obj.ticks) throw new Error("not a progress file");
      const before = canon(S);
      S = merge(S, normalise(obj)); save();
      renderAll();
      toast(before === canon(S) ? "Nothing new in that backup" : "Backup merged with your progress");
    } catch (err) { toast("That file isn't a Data Skills Studio backup"); }
    e.target.value = "";
  });
  $("bReset").addEventListener("click", () => {
    if (!confirm("Reset ALL ticks, done-when tests, cards and log entries on this device? Export a backup first if unsure.")) return;
    const t = now(), r = blank();
    // Tombstone everything so a sync doesn't bring it straight back.
    for (const k of ["ticks", "sec", "read", "watched"]) for (const key of Object.keys(S[k])) r[k][key] = { v: false, t };
    for (const key of Object.keys(S.doneWhen)) r.doneWhen[key] = { v: null, t };
    for (const [id, x] of Object.entries(S.log)) r.log[id] = Object.assign({}, x, { del: true, t });
    for (const id of Object.keys(S.quiz)) r.quiz[id] = { box: 0, due: today(), t, n: 0 };
    r.settings = S.settings;
    S = r; save(); renderAll(); toast("Reset");
  });
  function download(name, text, type) {
    const url = URL.createObjectURL(new Blob([text], { type }));
    const a = Object.assign(document.createElement("a"), { href: url, download: name });
    document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ---------- optional sync with a private GitHub gist ----------
  const Sync = (function () {
    const API = "https://api.github.com", FILE = "data-skills-studio.json";
    let G = Object.assign({ token: "", gistId: "", last: 0, status: "" }, readJSON(GIST_KEY) || {});
    let timer = null, busy = false, again = false;
    const store = () => writeJSON(GIST_KEY, G);
    function setStatus(msg, bad) { G.status = msg; G.bad = !!bad; store(); render(); }
    async function gh(path, opts) {
      opts = opts || {};
      const headers = { Accept: "application/vnd.github+json", Authorization: "Bearer " + G.token, "X-GitHub-Api-Version": "2022-11-28" };
      if (opts.body) headers["Content-Type"] = "application/json";
      const res = await fetch(API + path, { method: opts.method || "GET", headers, body: opts.body, cache: "no-store" });
      if (!res.ok) { const err = new Error("GitHub " + res.status); err.status = res.status; throw err; }
      return res.status === 204 ? null : res.json();
    }
    const payload = () => JSON.stringify(Object.assign({ app: "data-skills-studio", synced: new Date().toISOString() }, S));
    function explain(e) {
      if (!navigator.onLine || e instanceof TypeError) return "Couldn't reach GitHub (offline?). Your progress is safe here and will sync later.";
      if (e.status === 401) return "GitHub didn't accept the token. It may have expired: make a new one and paste it below.";
      if (e.status === 403 || e.status === 429) return "GitHub refused the request (rate limit, or the token lacks gist permission). Try again later.";
      if (e.status === 404) return "The sync gist wasn't found. Press Sync now to make a new one.";
      return "Sync failed (GitHub said " + (e.status || "an error") + "). Your progress is safe here.";
    }
    async function syncNow() {
      if (!G.token) return;
      if (busy) { again = true; return; }
      if (!navigator.onLine) { setStatus("Offline. Will sync when you're back online.", false); return; }
      busy = true; clearTimeout(timer); setStatus("Syncing…");
      try {
        let gist = null;
        if (G.gistId) {
          try { gist = await gh("/gists/" + G.gistId); }
          catch (e) { if (e.status === 404) { G.gistId = ""; store(); } else throw e; }
        }
        if (!gist) {
          const list = await gh("/gists?per_page=100");
          const hit = (list || []).find((g) => g.files && g.files[FILE]);
          if (hit) { G.gistId = hit.id; store(); gist = await gh("/gists/" + hit.id); }
        }
        if (!gist) {
          const made = await gh("/gists", { method: "POST", body: JSON.stringify({ description: "Data Skills Studio progress (private sync)", public: false, files: { [FILE]: { content: payload() } } }) });
          G.gistId = made.id; G.last = now(); store();
          setStatus("Synced. Made a new secret gist for your progress.");
          return;
        }
        const f = gist.files && gist.files[FILE];
        let text = f && f.content;
        if (f && f.truncated && f.raw_url) text = await (await fetch(f.raw_url)).text();
        let remote = null;
        try { remote = text ? normalise(JSON.parse(text)) : null; } catch (e) { remote = null; }
        const before = canon(S);
        if (remote) S = merge(S, remote);
        if (canon(S) !== before) { save({ noSync: true }); renderAll(); }
        if (!remote || canon(S) !== canon(remote)) await gh("/gists/" + G.gistId, { method: "PATCH", body: JSON.stringify({ files: { [FILE]: { content: payload() } } }) });
        G.last = now(); store();
        setStatus("Synced " + new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }) + ".");
      } catch (e) {
        setStatus(explain(e), true);
      } finally {
        busy = false;
        if (again) { again = false; schedule(); }
      }
    }
    function schedule() { if (!G.token) return; clearTimeout(timer); timer = setTimeout(syncNow, window.__DSS_SYNC_DELAY__ || 4000); }
    function render() {
      const on = !!G.token;
      if (!$("syncOn")) return;
      $("syncOn").classList.toggle("hidden", !on); $("syncOff").classList.toggle("hidden", on);
      const s = $("syncStatus"); s.textContent = G.status || (on ? "Connected." : ""); s.classList.toggle("bad", !!G.bad);
    }
    function connect(token) {
      token = String(token || "").trim();
      if (!/^(ghp_|github_pat_|gho_)?[A-Za-z0-9_]{20,}$/.test(token)) { toast("That doesn't look like a GitHub token"); return; }
      G = { token, gistId: "", last: 0, status: "" }; store(); render(); syncNow();
    }
    function disconnect() { G = { token: "", gistId: "", last: 0, status: "" }; try { localStorage.removeItem(GIST_KEY); } catch (e) {} render(); toast("Sync turned off. The token is deleted from this browser."); }
    window.addEventListener("online", () => { if (G.token) syncNow(); });
    document.addEventListener("visibilitychange", () => { if (document.visibilityState === "visible" && G.token && now() - G.last > 60000) syncNow(); });
    return { syncNow, schedule, render, connect, disconnect, on: () => !!G.token };
  })();
  $("syncConnect").addEventListener("click", () => { const v = $("syncToken").value; $("syncToken").value = ""; Sync.connect(v); });
  $("syncNow").addEventListener("click", () => Sync.syncNow());
  $("syncDisconnect").addEventListener("click", () => { if (confirm("Turn off sync on this device? This deletes the token from this browser. Your progress here stays.")) Sync.disconnect(); });

  // ---------- practice data generator ----------
  // Same model as data/generate_data.py, simplified: competing Weibull failure modes per asset type,
  // PMs that renew or lubricate their target modes, inspections that sometimes catch wear-out early.
  function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const ZONES = [["COK", "Cooking"], ["DRY", "Drying"], ["FLK", "Flaking"], ["FRM", "Forming"], ["BAK", "Baking"], ["PPK", "Primary Packing"], ["EOL", "End of Line"]];
  const M = (code, beta, eta, mttr) => ({ code, beta, eta, mttr });
  const TYPES = {
    MTR: ["Drive motor", [M("Electrical - motor", .9, 1500, 3), M("Mechanical - bearing", 2.2, 500, 2.5)], [["Motor inspection & temperature check", 28, "Inspection", "inspect", []], ["Grease motor bearings", 91, "Lubrication", "lube", ["Mechanical - bearing"]]]],
    GBX: ["Gearbox", [M("Mechanical - gears", 2.8, 900, 6), M("Mechanical - bearing", 2.4, 600, 4)], [["Gearbox oil level & leak check", 28, "Inspection", "inspect", []], ["Gearbox oil change", 182, "Lubrication", "lube", ["Mechanical - gears", "Mechanical - bearing"]]]],
    CNV: ["Conveyor", [M("Mechanical - belt/chain", 2.6, 200, 1.5), M("Mechanical - bearing", 2, 400, 1.5), M("Electrical - sensor", .9, 500, .7)], [["Belt tension & tracking check", 14, "Inspection", "inspect", []], ["Replace conveyor belt", 182, "Replacement", "replace", ["Mechanical - belt/chain"]]]],
    PMP: ["Pump", [M("Mechanical - seal", 2.5, 300, 3), M("Electrical - motor", .9, 1500, 3)], [["Pump seal & vibration check", 28, "Inspection", "inspect", []], ["Replace pump mechanical seal", 365, "Replacement", "replace", ["Mechanical - seal"]]]],
    FAN: ["Fan", [M("Mechanical - bearing", 2.6, 350, 3), M("Mechanical - imbalance", 1.5, 600, 2)], [["Fan bearing vibration reading", 28, "Condition Monitoring", "inspect", []], ["Grease fan bearings", 91, "Lubrication", "lube", ["Mechanical - bearing"]]]],
    BRN: ["Burner", [M("Combustion - ignition", 1, 250, 2), M("Control - flame safeguard", .8, 900, 3)], [["Burner ignition & flame check", 28, "Inspection", "inspect", []]]],
    SNS: ["Sensor / transmitter", [M("Electrical - sensor", .9, 400, 1)], [["Calibrate transmitter", 182, "Inspection", "none", []]]],
    SRV: ["Servo drive", [M("Electrical - drive fault", 1, 450, 2), M("Mechanical - cooling fan", 2, 600, 1)], [["Servo drive fan & fault log check", 91, "Inspection", "inspect", []]]],
    ROL: ["Flaking roll", [M("Mechanical - bearing", 3, 260, 6), M("Mechanical - roll wear", 3.5, 140, 5)], [["Roll gap & bearing temperature check", 14, "Inspection", "inspect", []], ["Regrind / swap flaking roll", 120, "Replacement", "replace", ["Mechanical - roll wear"]]]],
    PNU: ["Pneumatic cylinder", [M("Pneumatic leak", 1.8, 250, .7), M("Mechanical - seal", 2, 400, .8)], [["Pneumatic leak check", 28, "Inspection", "inspect", []]]],
    FWR: ["Flow wrapper", [M("Mechanical - jaws", 3, 75, 1.2), M("Electrical - sensor", .9, 150, .8), M("Operational - jam", 1, 60, .5)], [["Jaw & knife inspection", 7, "Inspection", "inspect", []], ["Replace sealing jaws", 182, "Replacement", "replace", ["Mechanical - jaws"]]]],
    CSP: ["Case packer", [M("Mechanical - grippers", 2.4, 160, 1.5), M("Operational - jam", 1, 80, .5)], [["Gripper & guide inspection", 14, "Inspection", "inspect", []], ["Case packer overhaul", 365, "Replacement", "replace", ["Mechanical - grippers"]]]],
    PAL: ["Palletiser", [M("Mechanical - chain", 2.8, 300, 3), M("Control - PLC/IO", .8, 600, 2)], [["Chain & safety circuit check", 14, "Inspection", "inspect", []], ["Replace lift chain", 365, "Replacement", "replace", ["Mechanical - chain"]]]],
  };
  const MIX = { COK: { MTR: 10, GBX: 6, CNV: 10, PMP: 8, SNS: 6 }, DRY: { MTR: 8, FAN: 10, BRN: 4, CNV: 8, SNS: 8 },
    FLK: { MTR: 8, ROL: 10, CNV: 8, GBX: 6, SNS: 6 }, FRM: { MTR: 6, SRV: 10, CNV: 10, PNU: 10, SNS: 4 },
    BAK: { MTR: 6, BRN: 8, FAN: 8, CNV: 6, SNS: 10 }, PPK: { FWR: 6, CNV: 12, SRV: 10, PNU: 6, SNS: 4 },
    EOL: { CSP: 3, PAL: 2, CNV: 14, MTR: 6, PNU: 5 } };

  function generate(seed, perZone, months, packOnTime) {
    const R = mulberry32(seed >>> 0 || 1);
    const rnd = (a, b) => a + Math.floor(R() * (b - a + 1));
    const pick = (arr) => arr[Math.floor(R() * arr.length)];
    const weib = (eta, beta) => eta * Math.pow(-Math.log(1 - R()), 1 / beta);
    const logn = (mean, s) => mean * Math.exp(s * Math.sqrt(-2 * Math.log(1 - R())) * Math.cos(2 * Math.PI * R()) - s * s / 2);
    const start = new Date(2024, 6, 1), days = Math.round(months * 30.44), end = addDays(start, days - 1);
    const onTime = { COK: .88, DRY: .86, FLK: .84, FRM: .82, BAK: .87, PPK: packOnTime / 100, EOL: Math.min(.95, packOnTime / 100 + .08) };
    const assets = [], pms = [], wos = [], dts = [];
    for (const [zc, zn] of ZONES) {
      const mix = MIX[zc], base = Object.values(mix).reduce((a, b) => a + b, 0);
      let n = 0;
      for (const [tc, cnt] of Object.entries(mix)) {
        const k = Math.max(1, Math.round(cnt * perZone / base));
        for (let i = 0; i < k; i++) {
          n++;
          assets.push({ asset_id: `LD-${zc}-${String(n).padStart(3, "0")}`, asset_name: `${zn} ${TYPES[tc][0]} ${i + 1}`, zone_code: zc, zone: zn,
            asset_type: TYPES[tc][0], criticality: pick(["A", "B", "B", "C"]), install_date: `${rnd(2008, 2022)}-${String(rnd(1, 12)).padStart(2, "0")}-01`, _t: tc });
        }
      }
    }
    let pmN = 0;
    for (const a of assets) for (const [desc, freq, ttype, eff, targets] of TYPES[a._t][2]) {
      pmN++; pms.push({ pm_id: `PM-${String(pmN).padStart(5, "0")}`, asset_id: a.asset_id, task_description: desc, task_type: ttype, frequency_days: freq,
        est_minutes: { Inspection: 30, Lubrication: 45, "Condition Monitoring": 20, Replacement: 180 }[ttype], _eff: eff, _targets: targets, _first: rnd(0, freq - 1) });
    }
    const at = (day, mins) => { const d = addDays(start, day); d.setMinutes(mins); return d; };
    const dts_ = (d) => `${iso(d)} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    for (const a of assets) {
      const modes = TYPES[a._t][1], st = {};
      for (const m of modes) { const age = R() * m.eta * .8; let life = m.beta < 1.05 ? age + weib(m.eta, m.beta) : weib(m.eta, m.beta); let g = 0; while (life <= age && g++ < 50) life = weib(m.eta, m.beta); if (life <= age) life = age + 1; st[m.code] = [age, life, m]; }
      const events = {};
      for (const t of pms.filter((p) => p.asset_id === a.asset_id)) {
        for (let due = t._first; due < days; due += t.frequency_days) {
          const r = R(); let done = null, status = "Cancelled";
          if (r < onTime[a.zone_code]) { done = due - rnd(0, Math.min(3, Math.floor(t.frequency_days / 3))); status = "Completed"; }
          else if (r < .95) { done = due + rnd(1, Math.max(2, Math.min(45, t.frequency_days))); status = "Completed"; }
          if (done !== null && done >= days) { done = null; status = "Open"; }
          const wo = { asset_id: a.asset_id, pm_id: t.pm_id, wo_type: "PM", priority: 3, description: t.task_description, failure_code: "",
            _raised: at(Math.max(0, due - Math.min(7, t.frequency_days)), 360), due_date: iso(addDays(start, due)), completed_date: done === null ? "" : iso(addDays(start, Math.max(done, 0))),
            status, labour_hours: done === null ? 0 : +(t.est_minutes / 60 * (0.7 + R() * .8)).toFixed(2), technician: done === null ? "" : `T${String(rnd(1, 12)).padStart(2, "0")}` };
          wos.push(wo); if (done !== null) (events[done] = events[done] || []).push(t);
        }
      }
      const prio = { A: 1, B: 2, C: 3 }[a.criticality], stopP = { A: 1, B: .75, C: .3 }[a.criticality];
      for (let day = 0; day < days; day++) {
        for (const k in st) st[k][0] += 1;
        for (const t of (events[day] || [])) {
          if (t._eff === "replace") t._targets.forEach((c) => { const m = st[c][2]; st[c] = [0, weib(m.eta, m.beta), m]; });
          else if (t._eff === "lube") t._targets.forEach((c) => (st[c][0] *= .6));
          else if (t._eff === "inspect") for (const c in st) {
            const [age, life, m] = st[c];
            if (m.beta > 1.4 && age > .85 * life && R() < .35) {
              const cd = Math.min(days - 1, day + rnd(1, 10));
              wos.push({ asset_id: a.asset_id, pm_id: t.pm_id, wo_type: "Corrective", priority: 2, description: `Found on PM: ${c.split(" - ").pop()} - planned repair`,
                failure_code: c, _raised: at(day, rnd(7, 20) * 60), due_date: iso(addDays(start, cd)), completed_date: iso(addDays(start, cd)), status: "Completed",
                labour_hours: +logn(m.mttr * .8, .4).toFixed(2), technician: `T${String(rnd(1, 12)).padStart(2, "0")}` });
              st[c] = [0, weib(m.eta, m.beta), m];
            }
          }
        }
        for (const c in st) {
          const [age, life, m] = st[c]; if (age < life) continue;
          const when = at(day, rnd(0, 1439)), hrs = logn(m.mttr, .6), comp = new Date(when.getTime() + hrs * 3.6e6);
          const wo = { asset_id: a.asset_id, pm_id: "", wo_type: "Reactive", priority: prio, description: `Breakdown: ${c.split(" - ").pop()}`, failure_code: c,
            _raised: when, due_date: "", completed_date: comp > end ? "" : iso(comp), status: comp > end ? "Open" : "Completed",
            labour_hours: +(hrs * (1 + R() * .6)).toFixed(2), technician: `T${String(rnd(1, 12)).padStart(2, "0")}` };
          wos.push(wo);
          if (R() < stopP) dts.push({ asset_id: a.asset_id, _wo: wo, _start: when, duration_min: Math.max(5, Math.round(hrs * 60 * (.8 + R() * .5))), category: "Breakdown", cause: c });
          st[c] = [0, weib(m.eta, m.beta), m];
        }
      }
    }
    const rates = { COK: .3, DRY: .2, FLK: .5, FRM: 1.2, BAK: .3, PPK: 3, EOL: 2 }, scale = perZone / 40;
    const byZone = {}; assets.forEach((a) => (byZone[a.zone_code] = byZone[a.zone_code] || []).push(a));
    for (let day = 0; day < days; day++) for (const [z, rate] of Object.entries(rates)) {
      let k = 0; for (let i = 0; i < 6; i++) if (R() < rate * scale / 6) k++;
      for (let i = 0; i < k; i++) {
        const a = pick(byZone[z]);
        dts.push({ asset_id: a.asset_id, _wo: null, _start: at(day, rnd(0, 1439)), duration_min: rnd(2, 15), category: "Minor stop",
          cause: pick(z === "PPK" || z === "EOL" ? ["Jam / blockage", "Sensor misread", "Film / carton misfeed", "Guard door opened"] : ["Product build-up", "Blockage", "Sensor misread", "Guard door opened"]) });
      }
    }
    wos.sort((x, y) => x._raised - y._raised || x.asset_id.localeCompare(y.asset_id));
    wos.forEach((w, i) => { w.wo_id = `WO-${100001 + i}`; w.raised_datetime = dts_(w._raised); });
    dts.sort((x, y) => x._start - y._start);
    dts.forEach((d, i) => { d.event_id = `DT-${String(i + 1).padStart(6, "0")}`; d.wo_id = d._wo ? d._wo.wo_id : "";
      d.start_datetime = dts_(d._start); d.end_datetime = dts_(new Date(d._start.getTime() + d.duration_min * 6e4)); });
    return { assets, pms, wos, dts };
  }
  function toCSV(rows, cols) {
    const q = (v) => { const s = String(v ?? ""); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
    return [cols.join(","), ...rows.map((r) => cols.map((c) => q(r[c])).join(","))].join("\r\n");
  }
  $("gRun").addEventListener("click", () => {
    const seed = +$("gSeed").value || 1, per = Math.min(150, Math.max(5, +$("gScale").value || 40));
    const months = Math.min(60, Math.max(3, +$("gMonths").value || 24)), pack = Math.min(100, Math.max(20, +$("gPack").value || 66));
    $("gStatus").textContent = "Generating…";
    setTimeout(() => {
      const t0 = performance.now(), g = generate(seed, per, months, pack);
      const reactive = g.wos.filter((w) => w.wo_type === "Reactive").length;
      const pm = g.wos.filter((w) => w.wo_type === "PM"), ontime = pm.filter((w) => w.completed_date && w.completed_date <= w.due_date).length;
      $("gStatus").textContent = `${g.assets.length} assets · ${g.pms.length} PM tasks · ${g.wos.length.toLocaleString()} work orders (${reactive} reactive) · ` +
        `${g.dts.length.toLocaleString()} downtime events · PM compliance ${(ontime / pm.length * 100).toFixed(1)}% · ${Math.round(performance.now() - t0)} ms`;
      const files = [
        ["assets.csv", g.assets, ["asset_id", "asset_name", "zone_code", "zone", "asset_type", "criticality", "install_date"]],
        ["pm_tasks.csv", g.pms, ["pm_id", "asset_id", "task_description", "task_type", "frequency_days", "est_minutes"]],
        ["work_orders.csv", g.wos, ["wo_id", "asset_id", "pm_id", "wo_type", "priority", "description", "failure_code", "raised_datetime", "due_date", "completed_date", "status", "labour_hours", "technician"]],
        ["downtime_events.csv", g.dts, ["event_id", "asset_id", "wo_id", "start_datetime", "end_datetime", "duration_min", "category", "cause"]],
      ];
      const box = $("gDownloads"); box.innerHTML = "";
      files.forEach(([name, rows, cols]) => {
        const b = Object.assign(document.createElement("button"), { className: "btn", type: "button", textContent: `⬇ ${name}` });
        b.onclick = () => download(`seed${seed}_${name}`, toCSV(rows, cols), "text/csv");
        box.appendChild(b);
      });
    }, 20);
  });

  // ---------- PWA (only when served over http/https; silent on file://) ----------
  let deferredInstall = null;
  if (/^https?:$/.test(location.protocol)) {
    const link = Object.assign(document.createElement("link"), { rel: "manifest", href: "manifest.webmanifest" });
    document.head.appendChild(link);
    if ("serviceWorker" in navigator) {
      window.addEventListener("load", () => {
        navigator.serviceWorker.register("sw.js").catch(() => { /* no offline mode; the app still works */ });
      });
      let reloaded = false;
      navigator.serviceWorker.addEventListener && navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (reloaded || !window.__DSS_HAD_CONTROLLER__) return;
        reloaded = true; toast("Updated to the latest version");
      });
      window.__DSS_HAD_CONTROLLER__ = !!navigator.serviceWorker.controller;
    }
    window.addEventListener("beforeinstallprompt", (e) => { e.preventDefault(); deferredInstall = e; if (route.view === "settings") renderSettings(); });
  }
  $("installBtn").addEventListener("click", async () => {
    if (!deferredInstall) return;
    deferredInstall.prompt();
    try { await deferredInstall.userChoice; } catch (e) {}
    deferredInstall = null; renderSettings();
  });

  // ---------- boot ----------
  document.querySelectorAll("[data-tab]").forEach((b) => b.addEventListener("click", () => go("#" + b.dataset.tab)));
  function renderAll() { renderHeader(); renderPending(); onRoute(); }
  window.addEventListener("hashchange", onRoute);
  $("lDate").value = today();
  applyTheme();
  renderAll();
  if (Sync.on()) Sync.syncNow();

  // Small hooks for tools/test_app.js. They expose nothing that isn't already in localStorage.
  window.DSS = { state: () => JSON.parse(JSON.stringify(S)), merge, plan: (m, d) => { const p = planToday(m, d); return p.done ? { done: true } : { week: p.w.week, primary: p.primary.kind, alts: p.alts.map((a) => a.kind) }; }, syncNow: () => Sync.syncNow(), currentWeek: () => (currentWeek() || {}).w?.week || null };
})();
