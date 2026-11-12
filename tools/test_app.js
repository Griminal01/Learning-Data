/* Browser tests for Data Skills Studio (index.html + app/).
   Run from the repo root with Playwright installed globally:
       NODE_PATH=$(npm root -g) node tools/test_app.js
   Optional: SHOTS_DIR=/some/folder also saves screenshots for a visual check.
   Exits non-zero if any check fails. */
"use strict";
const { chromium } = require("playwright");
const fs = require("fs");
const os = require("os");
const path = require("path");
const http = require("http");

const ROOT = path.resolve(__dirname, "..");
const FILE_URL = "file://" + path.join(ROOT, "index.html");
const SHOTS = process.env.SHOTS_DIR || "";
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), "dss-test-"));
const TOKEN = "ghp_" + "T3stT0kenAbcdefghijklmnopqrstuvwxyz12";

let passed = 0, failed = 0;
const results = [];
function check(cond, msg) {
  if (cond) { passed++; } else { failed++; results.push("  FAIL " + msg); }
  return !!cond;
}
async function test(name, fn) {
  const before = failed;
  try { await fn(); } catch (e) { failed++; results.push(`  FAIL ${name}: threw ${e && e.stack ? e.stack.split("\n").slice(0, 3).join(" | ") : e}`); }
  console.log(`${failed === before ? "ok  " : "FAIL"} ${name}`);
}

// A fresh browser profile with console/page errors collected.
async function open(browser, opts = {}) {
  const context = await browser.newContext(Object.assign({ viewport: { width: 390, height: 844 }, acceptDownloads: true }, opts.context || {}));
  if (opts.syncDelay) await context.addInitScript(() => { window.__DSS_SYNC_DELAY__ = 50; });
  // The welcome tour and the Week 0 suggestion are off unless a test asks for them.
  if (!opts.onboarding) await context.addInitScript(() => { window.__DSS_NO_ONBOARDING__ = true; });
  const page = await context.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push("console: " + m.text()); });
  page.on("pageerror", (e) => errors.push("pageerror: " + e.message));
  if (opts.time) await page.clock.setFixedTime(new Date(opts.time));
  await page.goto(opts.url || FILE_URL);
  await page.waitForSelector("#view-today .rec, #view-today .today-head", { state: "attached", timeout: 10000 });
  return { context, page, errors };
}
const state = (page) => page.evaluate(() => window.DSS.state());
const reg = (st, map, key) => (st[map][key] ? st[map][key].v : undefined);
async function goHash(page, hash) { await page.evaluate((h) => { location.hash = h; }, hash); await page.waitForTimeout(80); }
// No page-level horizontal scroll, and no visible element sticking out past the right edge
// (body has overflow-x: hidden, so scrollWidth alone could hide a too-wide card).
async function noOverflow(page) {
  return page.evaluate(() => {
    if (document.documentElement.scrollWidth > window.innerWidth + 1) return false;
    const vw = window.innerWidth;
    return [...document.querySelectorAll(".card, .btn, .rec, .qcard, .rsec, nav, main section")].every((e) => {
      if (!e.offsetParent && getComputedStyle(e).position !== "fixed") return true;
      const r = e.getBoundingClientRect();
      return r.width === 0 || r.right <= vw + 1;
    });
  });
}
async function shot(page, name, full) { if (SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); await page.screenshot({ path: path.join(SHOTS, name + ".png"), fullPage: !!full }); } }
async function setTime(page, minutes, device) {
  await page.click(`#view-today [data-min="${minutes}"]`);
  await page.click(`#view-today [data-dev="${device}"]`);
}

// ---------- static server for the PWA tests ----------
const TYPES = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json", ".webmanifest": "application/manifest+json", ".png": "image/png", ".md": "text/markdown" };
function serve() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(ROOT, p);
      if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); res.end("not found"); return; }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(file)] || "application/octet-stream", "Cache-Control": "max-age=600" });
      fs.createReadStream(file).pipe(res);
    });
    const sockets = new Set();
    server.on("connection", (s) => { sockets.add(s); s.on("close", () => sockets.delete(s)); });
    server.listen(0, "127.0.0.1", () => resolve({ server, port: server.address().port, kill: () => new Promise((r) => { sockets.forEach((s) => s.destroy()); server.close(r); }) }));
  });
}

// ---------- mock GitHub gist API ----------
function mockGist(context) {
  const m = { gists: {}, calls: [], failNext: 0, failStatus: 500, sawToken: true };
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-GitHub-Api-Version",
    "Access-Control-Allow-Methods": "GET, POST, PATCH, OPTIONS", "Content-Type": "application/json" };
  context.route("https://api.github.com/**", async (route) => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    if (method === "OPTIONS") return route.fulfill({ status: 204, headers: cors, body: "" });
    m.calls.push(method + " " + url.pathname);
    if ((req.headers()["authorization"] || "") !== "Bearer " + TOKEN) m.sawToken = false;
    if (m.failNext > 0) { m.failNext--; return route.fulfill({ status: m.failStatus, headers: cors, body: JSON.stringify({ message: "boom" }) }); }
    const json = (status, body) => route.fulfill({ status, headers: cors, body: JSON.stringify(body) });
    const view = (g) => ({ id: g.id, description: g.description, public: false, files: Object.fromEntries(Object.entries(g.files).map(([k, v]) => [k, { filename: k, content: v.content, truncated: false }])) });
    if (url.pathname === "/gists" && method === "GET") return json(200, Object.values(m.gists).map(view));
    if (url.pathname === "/gists" && method === "POST") {
      const body = JSON.parse(req.postData()); const id = "g" + (Object.keys(m.gists).length + 1);
      m.gists[id] = { id, description: body.description, files: body.files, public: body.public };
      return json(201, view(m.gists[id]));
    }
    const mm = url.pathname.match(/^\/gists\/(\w+)$/);
    if (mm && m.gists[mm[1]]) {
      if (method === "GET") return json(200, view(m.gists[mm[1]]));
      if (method === "PATCH") { const body = JSON.parse(req.postData()); Object.assign(m.gists[mm[1]].files, body.files); return json(200, view(m.gists[mm[1]])); }
    }
    return json(404, { message: "Not Found" });
  });
  return m;
}

(async () => {
  const browser = await chromium.launch();

  await test("loads from file:// with no console or page errors", async () => {
    const { context, page, errors } = await open(browser);
    await page.waitForTimeout(300);
    check(errors.length === 0, "errors on load: " + errors.join(" / "));
    check(await page.isVisible("#view-today .primary-rec"), "Today shows a recommendation");
    check(await page.evaluate(() => !document.querySelector('link[rel="manifest"]')), "no manifest link on file:// (avoids a CORS error)");
    check(await page.evaluate(() => window.COURSE_DATA.weeks.length === 62), "62 weeks loaded");
    for (const h of ["#course", "#read/13", "#cards", "#log", "#data", "#settings", "#read/59", "#read/50/check-yourself-model-answers-to-the-scep"]) await goHash(page, h);
    check(errors.length === 0, "errors while visiting every view: " + errors.join(" / "));
    await context.close();
  });

  await test("course data is complete: no lesson loses its tail to a code fence", async () => {
    const { context, page, errors } = await open(browser);
    const d = await page.evaluate(() => window.COURSE_DATA.weeks.map((w) => ({ week: w.week, ticks: w.ticks.length, kinds: w.sections.map((s) => s.kind),
      short: !!(w.short && w.short.must && w.short.phone && w.short.skip && w.short.must.text && w.short.phone.text && w.short.skip.text) })));
    check(d.length === 62, "62 weeks");
    check(d.every((w) => w.ticks > 0), "every week has tick items: missing in " + d.filter((w) => !w.ticks).map((w) => w.week).join(","));
    check(d.every((w) => w.kinds.includes("tick")), "every week has a Tick off section");
    check(d.every((w) => w.short), "every week has all three Short on time? parts: missing in " + d.filter((w) => !w.short).map((w) => w.week).join(","));
    // Independent count straight from the lesson files: '- [ ] ' lines under '## Tick off'.
    // (Week 62 has 5 more checkbox lines in a portfolio checklist in Session 2; those are not tick items.)
    let raw = 0;
    for (const dir of fs.readdirSync(path.join(ROOT, "course")).filter((x) => x.startsWith("phase-"))) {
      for (const f of fs.readdirSync(path.join(ROOT, "course", dir)).filter((x) => /^week-.*\.md$/.test(x))) {
        let inside = false;
        for (const line of fs.readFileSync(path.join(ROOT, "course", dir, f), "utf8").split(/\r?\n/)) {
          if (line.startsWith("## ")) inside = line.trim() === "## Tick off";
          else if (inside && line.startsWith("- [ ] ")) raw++;
        }
      }
    }
    const total = d.reduce((a, w) => a + w.ticks, 0);
    check(total === raw && total === 289, `tick total ${total} = ${raw} lines under '## Tick off' = 289`);
    const literal = await page.evaluate(() => {
      const bad = [], fence = "`".repeat(3);
      for (const w of window.COURSE_DATA.weeks) {
        for (const s of w.sections) if (MD.render(s.md).includes(fence)) bad.push(w.week + ":" + s.id);
        for (const q of w.quiz) if ((MD.render(q.q) + MD.render(q.a)).includes(fence)) bad.push(q.id);
      }
      return bad;
    });
    check(literal.length === 0, "no literal fences left in any rendered section or card: " + literal.join(", "));
    // Week 5 card 4: the answer opens a fence on the list-number line ("4. " then the fence).
    await goHash(page, "#cards/week/5");
    for (let i = 0; i < 3; i++) { await page.waitForSelector("[data-reveal]"); await page.click("[data-reveal]"); await page.click('[data-grade="1"]'); }
    await page.waitForSelector("[data-reveal]");
    check((await page.textContent(".quiz-top")).includes("4 of"), "on week 5 card 4");
    await page.click("[data-reveal]");
    const code = await page.textContent(".qcard .a pre.code");
    check(code && code.includes("=LET("), "week 5 card 4 answer is a code block containing =LET(");
    check(!(await page.textContent(".qcard")).includes("`".repeat(3)), "no literal backticks on the card");
    const fits = await page.evaluate(() => [".qcard", '[data-grade="1"]', '[data-grade="0"]'].every((q) => { const r = document.querySelector(q).getBoundingClientRect(); return r.left >= 0 && r.right <= window.innerWidth + 1; }));
    check(fits, "card and both buttons fit the phone width (long code scrolls inside its box)");
    await shot(page, "phone-light-week5-quiz-card4");
    // Week 5 reader shows the tail of the lesson.
    await goHash(page, "#read/5");
    check(await page.isVisible("#view-reader [data-short]"), "week 5 reader shows Short on time?");
    await page.click("#view-reader [data-short] > summary");
    check((await page.textContent("#view-reader [data-short]")).includes("Must do"), "week 5 Short on time? has its content");
    await goHash(page, "#read/5/tick-off");
    check((await page.$$('#view-reader .rsec[data-sid="tick-off"] [data-tick^="5:"]')).length === 5, "week 5 Tick off shows its 5 checklist items");
    await goHash(page, "#read/5/check-yourself");
    // The answers sit in a collapsed <details>, so check the element exists rather than that it's visible.
    const ans = await page.$$eval(".rsec.open details.md-details pre.code", (els) => els.map((e) => e.textContent));
    check(ans.some((t) => t.includes("=LET(")), "week 5 Check yourself renders answer 4 as a code block");
    await page.click(".rsec.open details.md-details > summary");
    await shot(page, "phone-light-week5-reader-check");
    await goHash(page, "#read/5"); await page.evaluate(() => window.scrollTo(0, 0));
    await shot(page, "phone-light-week5-reader-top");
    check(errors.length === 0, "no errors: " + errors.join(" / "));
    await context.close();
  });

  await test("old saved state (v1) migrates with nothing lost", async () => {
    const { context, page } = await open(browser);
    const old = { start: "2026-11-09", target: 6, repo: "https://github.com/griminal01/learning-data/blob/HEAD/", theme: "dark",
      ticks: { "1:0": true, "1:2": true, "3:1": true, "5:4": true, "42:3": true }, doneWhen: { "0": "2026-11-08" },
      log: [{ id: "abc", date: "2026-11-03", hours: 1.5, studied: "Week 1 session 1", built: "", blockers: "" },
            { id: "def", date: "2026-11-05", hours: 2, studied: "Session 2", built: "workbook", blockers: "none" }] };
    await page.evaluate((o) => { localStorage.clear(); localStorage.setItem("data-skills-studio-v1", JSON.stringify(o)); }, old);
    await page.reload(); await page.waitForSelector("#view-today .today-head");
    const st = await state(page);
    check(reg(st, "ticks", "1:0") === true && reg(st, "ticks", "1:2") === true && reg(st, "ticks", "3:1") === true, "ticks kept");
    check(reg(st, "doneWhen", "0") === "2026-11-08", "done-when date kept");
    check(reg(st, "ticks", "5:4") === true && reg(st, "ticks", "42:3") === true, "ticks in previously mis-parsed weeks kept");
    const last = await page.evaluate(() => [window.COURSE_DATA.weeks[4].ticks[4], window.COURSE_DATA.weeks[41].ticks[3]]);
    check(/Phase 1 done-when|LAMBDA/i.test(last[0]) && /pycomm3/i.test(last[1]), "v1 index 5:4 and 42:3 still name the same items: " + last.join(" | "));
    check(st.log.abc && st.log.abc.hours === 1.5 && st.log.def && st.log.def.built === "workbook", "log entries kept");
    check(reg(st, "settings", "start") === "2026-11-09" && reg(st, "settings", "target") === 6, "start date and target kept");
    check(await page.evaluate(() => document.documentElement.getAttribute("data-theme")) === "dark", "theme kept");
    check(await page.evaluate(() => !!localStorage.getItem("data-skills-studio-v1")), "old key left in place as a fallback");
    await goHash(page, "#course");
    check(await page.isChecked('#view-course [data-tick="1:0"]'), "migrated tick shows in the Course tab");
    check(await page.isEnabled('#view-course [data-tick="3:1"]'), "phase 1 unlocked by the migrated done-when");
    await goHash(page, "#log");
    check((await page.textContent("#logTable")).includes("Session 2"), "migrated log entry shows in the log");
    await page.reload(); await page.waitForSelector("#view-log:not(.hidden)");
    const st2 = await state(page);
    check(reg(st2, "ticks", "1:0") === true && Object.keys(st2.log).length === 2, "still there after a second reload");
    await context.close();
  });

  await test("Today recommendations for every time and device", async () => {
    const { context, page, errors } = await open(browser, { time: "2026-11-10T09:00:00" });
    const expect = { phone: { 5: "quiz", 15: "read", 30: "mix", 60: "mix" }, pc: { 5: "quiz", 15: "read", 30: "hands", 60: "hands" } };
    for (const dev of ["phone", "pc"]) for (const m of [5, 15, 30, 60]) {
      await setTime(page, m, dev);
      const kind = await page.getAttribute("#view-today .primary-rec", "data-kind");
      check(kind === expect[dev][m], `${dev} ${m} min: expected ${expect[dev][m]}, got ${kind}`);
      const alts = await page.$$("#view-today .alt-rec");
      check(alts.length >= 1 && alts.length <= 2, `${dev} ${m} min: 1-2 alternatives (got ${alts.length})`);
      if (dev === "phone" && m >= 30) check((await page.textContent("#view-today .primary-rec")).includes("needs a PC"), `phone ${m}: says hands-on needs a PC`);
    }
    check(await page.isVisible("#view-today [data-short]"), "Short on time card shown for the current week");
    // remembered after reload
    await setTime(page, 30, "pc");
    await page.reload(); await page.waitForSelector("#view-today .primary-rec");
    check(await page.getAttribute('#view-today [data-min="30"]', "aria-checked") === "true", "time choice remembered");
    check(await page.getAttribute('#view-today [data-dev="pc"]', "aria-checked") === "true", "device choice remembered");
    check((await page.textContent("#view-today [data-cal]")).includes("Week 2"), "shows the calendar week when behind (Week 2 on 10 Nov)");
    // PC + 30 opens the next session in the reader
    await page.click("#view-today .primary-rec .btn.primary");
    await page.waitForTimeout(150);
    check(await page.evaluate(() => location.hash.startsWith("#read/1/session-1")), "PC 30 opens Session 1 in the reader");
    check(await page.isVisible("#pendingBar"), "pending bar offers to log the time");
    check(errors.length === 0, "no errors: " + errors.join(" / "));
    await context.close();
  });

  await test("reader: open a section, mark it done, persists after reload", async () => {
    const { context, page } = await open(browser);
    const sid = await page.evaluate(() => window.COURSE_DATA.weeks[0].sections.find((s) => s.kind === "hands").id);
    await goHash(page, "#read/1/" + sid);
    check(await page.isVisible(`.rsec[data-sid="${sid}"] .rsec-body`), "section opens");
    check(await page.isVisible(`.rsec[data-sid="${sid}"] .rsec-body pre.code, .rsec[data-sid="${sid}"] .rsec-body ol`), "section content rendered");
    await page.click(`.rsec[data-sid="${sid}"] [data-mark="sec"]`);
    await page.reload(); await page.waitForSelector(".rsec");
    const st = await state(page);
    check(reg(st, "sec", "1:" + sid) === true, "section done stored");
    check((await page.textContent(`.rsec[data-sid="${sid}"] .rsec-head`)).includes("Done"), "Done chip after reload");
    check(await page.isVisible(`.rsec[data-sid="${sid}"] .rsec-body`), "last-read section reopened");
    check(reg(st, "pos", "1") === sid, "last-read position stored per week");
    // collapse and step with Next
    await page.click(`.rsec[data-sid="${sid}"] [data-next]`);
    const pos = reg(await state(page), "pos", "1");
    check(pos && pos !== sid, "Next moves the saved position on");
    await goHash(page, "#today"); await goHash(page, "#read/1");
    check(await page.isVisible(`.rsec[data-sid="${pos}"] .rsec-body`), "reopening the week returns to the saved position");
    // tables and code scroll inside their own boxes
    await goHash(page, "#read/13/session-2-reliability-metrics");
    check(await page.isVisible(".rsec.open .table-wrap"), "table rendered in a scroll container");
    check(await noOverflow(page), "no page-level horizontal scroll in the reader at 390px");
    // markdown safety: script in lesson text is escaped
    const html = await page.evaluate(() => MD.render('Hi <script>alert(1)</script> [x](javascript:alert(1)) <img src=x onerror=alert(1)>\n\n<details>\n<summary><strong>A</strong></summary>\n\n1. one\n</details>'));
    check(!/<script|<img|javascript:/i.test(html) && html.includes("<details") && html.includes("<strong>A</strong>"), "renderer escapes HTML and drops javascript: links");
    const math = await page.evaluate(() => MD.render("$$R(t) = e^{-(t/\\eta)^\\beta}$$"));
    check(math.includes('class="math"') && math.includes("η") && math.includes("β"), "maths block shown readably");
    await context.close();
  });

  await test("steps: every lesson's steps line up with the rendered lists", async () => {
    const { context, page } = await open(browser);
    const bad = await page.evaluate(() => {
      const out = [];
      for (const w of window.COURSE_DATA.weeks) for (const s of w.sections) {
        if (!s.steps) continue;
        const div = document.createElement("div"); div.innerHTML = MD.render(s.md, {});
        let n = 0, why = false;
        for (const node of div.children) {
          if (node.tagName === "H3") why = /^why/i.test(node.textContent.trim());
          else if (node.tagName === "OL" && !why) n += node.children.length;
        }
        if (n !== s.steps.length) out.push(`week ${w.week} ${s.id}: ${s.steps.length} steps, ${n} rendered`);
        if (new Set(s.steps).size !== s.steps.length) out.push(`week ${w.week} ${s.id}: duplicate step ids`);
      }
      return out;
    });
    check(bad.length === 0, "step counts match the rendered lists: " + bad.slice(0, 5).join("; "));
    await context.close();
  });

  await test("steps: tick, You are here, Done → next, back, resume, focus", async () => {
    const { context, page, errors } = await open(browser, { context: { viewport: { width: 1280, height: 800 } } });
    const s1 = await page.evaluate(() => { const s = window.COURSE_DATA.weeks[0].sections.find((x) => x.kind === "hands"); return { id: s.id, n: s.steps.length }; });
    check(s1.n >= 10, `Week 1 Session 1 has one-action steps (${s1.n})`);
    await goHash(page, "#read/1/" + s1.id);
    const sec = `.rsec[data-sid="${s1.id}"]`;
    check(await page.locator(`${sec} li.step`).count() === s1.n, "every step gets a tick box");
    check((await page.textContent(".stepbar")).includes(`Step 1 of ${s1.n}`), "step bar starts at step 1");
    check(await page.isVisible(`${sec} li.step.current .here`), "You are here on the first step");
    check(await page.locator(`${sec} p.expect`).count() > 3, "'You should see' lines are marked");
    for (let i = 0; i < 3; i++) await page.click("[data-stepnext]");
    let st = await state(page);
    check(Object.keys(st.step).filter((k) => k.startsWith("1:" + s1.id) && st.step[k].v).length === 3, "Done → next ticks 3 steps");
    check((await page.textContent(".stepbar")).includes(`Step 4 of ${s1.n}`), "step bar moves to step 4");
    check(await page.locator(`${sec} li.step`).nth(3).evaluate((li) => li.classList.contains("current")), "4th step is current");
    check((await page.textContent(".reader-head")).includes(`step 4 of ${s1.n}`), "header says which step you're on");
    check((await page.textContent(`${sec} .rsec-head`)).includes(`3/${s1.n} steps`), "section chip counts steps");
    const box = await page.locator(`${sec} li.step.current`).boundingBox();
    check(box && box.y >= 0 && box.y < 800, "current step scrolled into view");
    await page.keyboard.press("b");
    check((await page.textContent(".stepbar")).includes(`Step 3 of ${s1.n}`), "B key steps back");
    await page.keyboard.press("n");
    check((await page.textContent(".stepbar")).includes(`Step 4 of ${s1.n}`), "N key ticks and moves on");
    await page.click(`${sec} li.step >> nth=0 >> .stepbox`);
    check((await page.textContent(".stepbar")).includes(`Step 1 of ${s1.n}`), "unticking step 1 makes it current again");
    await page.click(`${sec} li.step >> nth=0 >> .stepbox`);
    // resume: leave, come back to the week, land on the current step
    await goHash(page, "#today");
    await setTime(page, 60, "pc");
    check((await page.textContent("#view-today .primary-rec")).includes("at step 4 of"), "Today says which step to continue at");
    await page.reload(); await page.waitForSelector("#view-today .rec");
    await goHash(page, "#read/1");
    await page.waitForTimeout(150);
    const rb = await page.locator(`${sec} li.step.current`).boundingBox();
    check(rb && rb.y > 0 && rb.y < 800, "reopening the week lands on the current step");
    // focus view
    await page.click(".stepbar [data-focus]");
    check(await page.isVisible(`${sec} .rsec-body.focus`), "focus view on");
    const shown = await page.locator(`${sec} li.step:visible`).count();
    check(shown === 3, `focus shows the step before, the current one and the next (${shown})`);
    check(!(await page.isVisible(`${sec} .rsec-body > h3`)), "focus hides the rest of the session");
    await page.reload(); await page.waitForSelector(".rsec");
    check(await page.isVisible(`${sec} .rsec-body.focus`), "focus view remembered on this device");
    await page.keyboard.press("f");
    check(!(await page.isVisible(`${sec} .rsec-body.focus`)), "F key turns focus off");
    // finish the session: section is marked done
    for (let i = 3; i < s1.n; i++) await page.click("[data-stepnext]");
    st = await state(page);
    check(reg(st, "sec", "1:" + s1.id) === true, "ticking the last step marks the session done");
    check((await page.textContent(".stepbar")).includes(`All ${s1.n} steps done`), "step bar says all done");
    await page.click("[data-barnext]");
    check(reg(await state(page), "pos", "1") !== s1.id, "Next from the step bar moves on");
    check(errors.length === 0, "no errors: " + errors.join(" | "));
    await context.close();
  });

  await test("quiz cards: reveal, Got it, Leitner rescheduling, Again", async () => {
    const { context, page, errors } = await open(browser, { time: "2026-11-10T09:00:00" });
    await goHash(page, "#cards");
    const n0 = +(await page.textContent("[data-due]"));
    const w1 = await page.evaluate(() => window.COURSE_DATA.weeks[0].quiz.length);
    check(n0 === w1 && n0 > 0, `week 1 cards due on day one (${n0} vs ${w1})`);
    await page.click(".cards-home .btn.primary");
    await page.waitForSelector("[data-reveal]");
    check(await page.isVisible("[data-reveal]"), "question shown with Show answer");
    check(!(await page.isVisible(".qcard .a")), "answer hidden before reveal");
    await page.click("[data-reveal]");
    check(await page.isVisible(".qcard .a"), "answer revealed");
    await page.click('[data-grade="1"]');
    let st = await state(page);
    check(st.quiz["1-1"] && st.quiz["1-1"].box === 1 && st.quiz["1-1"].due === "2026-11-11", "Got it: box 1, due tomorrow");
    check(st.days["2026-11-10"] === 1, "review counted for the streak");
    // Again on card 2
    await page.click("[data-reveal]"); await page.click('[data-grade="0"]');
    st = await state(page);
    check(st.quiz["1-2"].box === 1 && st.quiz["1-2"].due === "2026-11-11", "Again: back to box 1");
    await goHash(page, "#cards");
    check(+(await page.textContent("[data-due]")) === n0 - 2, "due count drops after reviewing");
    // next day: card 1 is due again; Got it moves it to box 2 (3 days)
    await page.clock.setFixedTime(new Date("2026-11-11T08:00:00"));
    await page.reload(); await page.waitForSelector("#view-cards:not(.hidden)");
    await goHash(page, "#cards/week/1");
    await page.waitForSelector("[data-reveal]");
    await page.click("[data-reveal]"); await page.click('[data-grade="1"]');
    st = await state(page);
    check(st.quiz["1-1"].box === 2 && st.quiz["1-1"].due === "2026-11-14", "second Got it: box 2, due in 3 days");
    await page.clock.setFixedTime(new Date("2026-11-14T08:00:00"));
    await page.reload(); await page.waitForSelector("#view-cards:not(.hidden)");
    await goHash(page, "#cards/week/1"); await page.waitForSelector("[data-reveal]");
    await page.click("[data-reveal]"); await page.click('[data-grade="1"]');
    st = await state(page);
    check(st.quiz["1-1"].box === 3 && st.quiz["1-1"].due === "2026-11-21", "third Got it: box 3, due in 7 days");
    // cards from later weeks aren't available yet
    check(!(await page.evaluate(() => Object.keys(window.DSS.state().quiz).some((k) => !k.startsWith("1-")))), "only week 1 cards so far");
    check(errors.length === 0, "no errors: " + errors.join(" / "));
    await context.close();
  });

  await test("tick-offs and done-when gating still work", async () => {
    const { context, page } = await open(browser);
    await goHash(page, "#course");
    await page.evaluate(() => document.querySelectorAll("#phases details").forEach((d) => (d.open = true)));
    check(await page.isDisabled('#view-course [data-tick="3:0"]'), "phase 1 locked before the phase 0 test");
    await page.check('#view-course [data-tick="1:0"]');
    check(reg(await state(page), "ticks", "1:0") === true, "tick stored");
    check((await page.textContent("#overallPct")).includes("1/"), "overall progress updates");
    await page.check('#view-course [data-dw="0"]');
    await page.evaluate(() => document.querySelectorAll("#phases details").forEach((d) => (d.open = true)));
    check(await page.isEnabled('#view-course [data-tick="3:0"]'), "phase 1 unlocked after passing");
    await page.check('#view-course [data-tick="3:0"]');
    await page.uncheck('#view-course [data-dw="0"]');
    await page.evaluate(() => document.querySelectorAll("#phases details").forEach((d) => (d.open = true)));
    check(await page.isDisabled('#view-course [data-tick="3:0"]'), "locked again after un-passing");
    await page.uncheck('#view-course [data-tick="1:0"]');
    const st = await state(page);
    check(st.ticks["1:0"].v === false && st.ticks["1:0"].t > 0, "un-ticking leaves a timestamped tombstone");
    // the reader's checklist is the same checklist
    await goHash(page, "#read/1/tick-off");
    await page.check('#view-reader [data-tick="1:1"]');
    await goHash(page, "#course");
    check(await page.isChecked('#view-course [data-tick="1:1"]'), "reader ticks show in the Course tab");
    // current week moves on when a week is fully ticked
    await page.evaluate(() => { const w = window.COURSE_DATA.weeks[0]; w.ticks.forEach((_, i) => { const el = document.querySelector(`#view-course [data-tick="1:${i}"]`); if (!el.checked) el.click(); }); });
    check(await page.evaluate(() => window.DSS.currentWeek()) === 2, "current week becomes Week 2 once Week 1 is ticked");
    await context.close();
  });

  await test("watch items: search button and watched mark", async () => {
    const { context, page } = await open(browser);
    await goHash(page, "#read/1/watch");
    const href = await page.getAttribute("ul.watch li:first-child a.btn", "href");
    check(href && href.startsWith("https://www.youtube.com/results?search_query=") && href.includes("Kevin%20Stratvert"), "YouTube search link from the quoted phrase: " + href);
    const linkCount = await page.$$eval("ul.watch a.btn", (as) => as.filter((a) => a.href.includes("exceljet.net")).length);
    check(linkCount === 1, "plain URL item links to the site");
    await page.click('ul.watch [data-watch="0"]');
    await page.reload(); await page.waitForSelector("ul.watch");
    check(await page.getAttribute('ul.watch [data-watch="0"]', "aria-pressed") === "true", "watched mark persists");
    check(reg(await state(page), "watched", "1:0") === true, "watched stored");
    await context.close();
  });

  await test("one-tap log and streak", async () => {
    const { context, page } = await open(browser, { time: "2026-11-10T19:00:00" });
    check(await page.getAttribute(".chip.streak", "data-streak") === "0", "no streak at first");
    await setTime(page, 15, "phone");
    await page.click("#view-today .primary-rec .btn.primary");
    await page.waitForSelector("#pendingBar:not(.hidden)");
    check((await page.textContent("#pbLog")).includes("15 min"), "pending bar offers Log 15 min");
    await page.click("#pbLog");
    let st = await state(page);
    const entries = Object.values(st.log).filter((e) => !e.del);
    check(entries.length === 1 && entries[0].hours === 0.25 && entries[0].date === "2026-11-10", "15 min logged to the weekly log");
    await goHash(page, "#today");
    check(await page.getAttribute(".chip.streak", "data-streak") === "1", "1-day streak");
    // next day, a single quiz card (minimum day) extends it
    await page.clock.setFixedTime(new Date("2026-11-11T07:30:00"));
    await page.reload(); await page.waitForSelector("#view-today .today-head");
    check(await page.getAttribute(".chip.streak", "data-streak") === "1", "streak still alive next morning");
    await goHash(page, "#cards/review"); await page.waitForSelector("[data-reveal]");
    await page.click("[data-reveal]"); await page.click('[data-grade="1"]');
    await goHash(page, "#today");
    check(await page.getAttribute(".chip.streak", "data-streak") === "2", "one card keeps the streak: 2 days");
    await page.click('#view-today [data-quicklog="5"]');
    await goHash(page, "#log");
    check((await page.textContent("#logTable")).includes("5 min"), "quick log shows in the table");
    check(await page.isVisible("#chart svg"), "chart still drawn");
    // a gap breaks the streak
    await page.clock.setFixedTime(new Date("2026-11-14T07:30:00"));
    await page.reload(); await page.waitForSelector("#view-log:not(.hidden)");
    await goHash(page, "#today");
    check(await page.getAttribute(".chip.streak", "data-streak") === "0", "a missed day resets the streak");
    await context.close();
  });

  await test("export, then import merges (fresh profile and different ticks)", async () => {
    // Profile A at T1: ticks 1:0 and 1:1, a log entry.
    const A = await open(browser, { time: "2026-11-10T10:00:00" });
    await goHash(A.page, "#course");
    await A.page.check('#view-course [data-tick="1:0"]');
    await A.page.check('#view-course [data-tick="1:1"]');
    await goHash(A.page, "#today");
    await A.page.click('#view-today [data-quicklog="30"]');
    await goHash(A.page, "#settings");
    const [dl] = await Promise.all([A.page.waitForEvent("download"), A.page.click("#bExport")]);
    const file = path.join(TMP, "backup.json");
    await dl.saveAs(file);
    const backup = JSON.parse(fs.readFileSync(file, "utf8"));
    check(backup.ticks["1:0"].v === true && backup.app === "data-skills-studio", "backup file has the ticks");
    check(!JSON.stringify(backup).includes("ghp_"), "backup has no token");

    // Fresh profile B
    const B = await open(browser, { time: "2026-11-10T12:00:00" });
    await goHash(B.page, "#settings");
    await B.page.setInputFiles("#bImport", file);
    await B.page.waitForTimeout(200);
    let st = await state(B.page);
    check(reg(st, "ticks", "1:0") === true && reg(st, "ticks", "1:1") === true, "fresh profile gets the ticks");
    check(Object.values(st.log).filter((e) => !e.del).length === 1, "fresh profile gets the log entry");

    // Profile C at T2 > T1: ticks 1:3, ticks then un-ticks 1:1 (newer than A's tick), own log entry.
    const C = await open(browser, { time: "2026-11-10T11:00:00" });
    await goHash(C.page, "#course");
    await C.page.check('#view-course [data-tick="1:3"]');
    await C.page.check('#view-course [data-tick="1:1"]');
    await C.page.uncheck('#view-course [data-tick="1:1"]');
    await goHash(C.page, "#today");
    await C.page.click('#view-today [data-quicklog="15"]');
    await goHash(C.page, "#settings");
    await C.page.setInputFiles("#bImport", file);
    await C.page.waitForTimeout(200);
    st = await state(C.page);
    check(reg(st, "ticks", "1:0") === true && reg(st, "ticks", "1:3") === true, "union of ticks (1:0 from A, 1:3 from C)");
    check(reg(st, "ticks", "1:1") === false, "the newer un-tick on C is not resurrected by A's older tick");
    check(Object.values(st.log).filter((e) => !e.del).length === 2, "log entries merged by id (2)");
    // importing the same file twice changes nothing
    await C.page.setInputFiles("#bImport", file);
    await C.page.waitForTimeout(200);
    check(Object.values((await state(C.page)).log).filter((e) => !e.del).length === 2, "re-import doesn't duplicate");
    // an old v1 backup also imports (merged, not overwritten)
    const v1 = path.join(TMP, "v1.json");
    fs.writeFileSync(v1, JSON.stringify({ start: "2026-11-02", target: 5, ticks: { "2:0": true }, doneWhen: {}, log: [{ id: "old1", date: "2026-11-01", hours: 1 }] }));
    await C.page.setInputFiles("#bImport", v1);
    await C.page.waitForTimeout(200);
    st = await state(C.page);
    check(reg(st, "ticks", "2:0") === true && reg(st, "ticks", "1:3") === true && st.log.old1, "v1 backup merges in");
    for (const x of [A, B, C]) await x.context.close();
  });

  await test("gist sync against a mocked GitHub API", async () => {
    const { context, page, errors } = await open(browser, { syncDelay: true, time: "2026-11-10T10:00:00" });
    const consoleText = [];
    page.on("console", (msg) => consoleText.push(msg.text()));
    const m = mockGist(context);
    await goHash(page, "#course");
    await page.check('#view-course [data-tick="1:0"]');
    await goHash(page, "#settings");
    check(await page.isVisible("#syncOff"), "sync is off until a token is given");
    await page.fill("#syncToken", TOKEN);
    await page.click("#syncConnect");
    await page.waitForFunction(() => /Synced/.test(document.getElementById("syncStatus").textContent), null, { timeout: 5000 });
    check(m.calls.includes("POST /gists"), "first push creates a gist: " + m.calls.join(", "));
    const g = Object.values(m.gists)[0];
    check(g && g.public === false, "the gist is secret");
    const remote = JSON.parse(g.files["data-skills-studio.json"].content);
    check(remote.ticks["1:0"].v === true, "pushed state contains the tick");
    check(!g.files["data-skills-studio.json"].content.includes(TOKEN), "token not in the gist");
    check(m.sawToken, "token sent as a Bearer header");

    // another device ticks 2:0 and un-ticks 1:0 later: pull-merge brings both in
    remote.ticks["2:0"] = { v: true, t: Date.parse("2026-11-10T11:00:00") };
    remote.ticks["1:0"] = { v: false, t: Date.parse("2026-11-10T11:00:00") };
    remote.log.remote1 = { id: "remote1", date: "2026-11-09", hours: 1, studied: "on the phone", t: 5 };
    g.files["data-skills-studio.json"].content = JSON.stringify(remote);
    m.calls.length = 0;
    await page.click("#syncNow");
    await page.waitForFunction(() => /Synced \d/.test(document.getElementById("syncStatus").textContent), null, { timeout: 5000 });
    let st = await state(page);
    check(reg(st, "ticks", "2:0") === true, "pull-merge brings the other device's tick");
    check(reg(st, "ticks", "1:0") === false, "pull-merge applies the newer un-tick");
    check(st.log.remote1, "pull-merge brings the other device's log entry");
    check(m.calls[0] && m.calls[0].startsWith("GET /gists/"), "pull uses the stored gist id");

    // a local change is pushed after the debounce
    m.calls.length = 0;
    await goHash(page, "#course");
    await page.check('#view-course [data-tick="1:4"]');
    await page.waitForFunction(() => true);
    await page.waitForTimeout(600);
    check(m.calls.some((c) => c.startsWith("PATCH /gists/")), "change pushed automatically: " + m.calls.join(", "));
    check(JSON.parse(g.files["data-skills-studio.json"].content).ticks["1:4"].v === true, "pushed tick reached the gist");

    // pull on open
    m.calls.length = 0;
    await page.reload(); await page.waitForSelector("#view-course:not(.hidden)");
    await page.waitForTimeout(400);
    check(m.calls.some((c) => c.startsWith("GET /gists/")), "pulls when the app opens");

    // API error is reported, nothing breaks
    await goHash(page, "#settings");
    m.failNext = 1; m.failStatus = 500;
    await page.click("#syncNow");
    await page.waitForFunction(() => document.getElementById("syncStatus").classList.contains("bad"), null, { timeout: 5000 });
    check((await page.textContent("#syncStatus")).includes("Sync failed"), "server error explained");
    m.failNext = 1; m.failStatus = 401;
    await page.click("#syncNow");
    await page.waitForFunction(() => /didn't accept the token/.test(document.getElementById("syncStatus").textContent), null, { timeout: 5000 });
    check(true, "401 explained");
    check(reg(await state(page), "ticks", "2:0") === true, "local progress intact after errors");
    // offline
    await context.setOffline(true);
    await page.click("#syncNow");
    await page.waitForTimeout(200);
    check((await page.textContent("#syncStatus")).toLowerCase().includes("offline"), "offline is handled");
    await context.setOffline(false);
    // turning sync off deletes the token
    page.once("dialog", (d) => d.accept());
    await page.click("#syncDisconnect");
    check(await page.evaluate(() => !localStorage.getItem("data-skills-studio-gist")), "token deleted from this browser");
    check(await page.isVisible("#syncOff"), "sync off");
    const allStorage = await page.evaluate(() => JSON.stringify(Object.assign({}, localStorage)));
    check(!allStorage.includes(TOKEN), "token nowhere in localStorage after turning off");
    check(!consoleText.some((t) => t.includes(TOKEN)), "token never logged to the console");
    check(errors.filter((e) => !/Failed to load resource|ERR_INTERNET_DISCONNECTED|status of (500|401)/.test(e)).length === 0, "no unexpected errors: " + errors.join(" / "));
    await context.close();
  });

  await test("first run: welcome asks name and start date, then a short tour", async () => {
    const { context, page, errors } = await open(browser, { onboarding: true, time: "2026-11-12T19:00:00", context: { viewport: { width: 1280, height: 800 } } });
    check(await page.isVisible("#welcome #wName"), "welcome shows on first open");
    check(await page.inputValue("#wStart") === "2026-11-16", "start date defaults to the coming Monday");
    await page.fill("#wName", "Sam");
    await page.fill("#wStart", "2026-11-18");
    await page.click("[data-wnext]");
    let st = await state(page);
    check(reg(st, "settings", "name") === "Sam", "name saved");
    check(reg(st, "settings", "start") === "2026-11-16", "start snapped to its Monday (" + reg(st, "settings", "start") + ")");
    for (let i = 1; i < 4; i++) { check(await page.isVisible("#welcome h2"), "tour slide " + i); await page.click("[data-wnext]"); }
    check(await page.isVisible("[data-wdone='#read/0']"), "last slide offers Week 0 to a new learner");
    await page.click("[data-wdone='#read/0']");
    await page.waitForTimeout(100);
    check(!(await page.isVisible("#welcome")), "welcome closed");
    check(await page.evaluate(() => location.hash) === "#read/0", "went to Week 0");
    check(await page.isVisible(".reader-head h2") && /Week 0: Set up/.test(await page.textContent(".reader-head h2")), "Week 0 opens in the reader");
    check(!!reg(await state(page), "settings", "welcomed"), "welcome remembered");
    await page.reload(); await page.waitForTimeout(150);
    check(!(await page.isVisible("#welcome")), "no welcome the second time");
    await goHash(page, "#today");
    await setTime(page, 60, "pc");
    check(/Hi Sam\./.test(await page.textContent(".today-head")), "Today says hello by name");
    check(await page.getAttribute("#view-today .primary-rec", "data-kind") === "setup", "Today recommends Week 0 first on a PC");
    await setTime(page, 15, "phone");
    check(await page.$("#view-today .alt-rec[data-kind='setup']") !== null, "on a phone Week 0 is an alternative");
    await goHash(page, "#settings");
    await page.click("#sTour");
    check(await page.isVisible("#welcome #wName") && await page.inputValue("#wName") === "Sam", "tour can be shown again from Settings, with the name filled in");
    await page.keyboard.press("Escape");
    check(!(await page.isVisible("#welcome")), "Escape closes it");
    check(errors.length === 0, "no errors: " + errors.join(" / "));
    await context.close();
  });

  await test("someone already part-way through: welcome keeps their dates, no Week 0 nudge", async () => {
    const { context, page } = await open(browser, { onboarding: true, time: "2026-11-12T19:00:00" });
    await page.evaluate(() => { localStorage.setItem("data-skills-studio-v2", JSON.stringify({ v: 2, ticks: { "1:0": { v: true, t: 1 } }, settings: {}, sec: {}, read: {}, step: {}, watched: {}, pos: {}, quiz: {}, days: {}, log: {}, doneWhen: {} })); });
    await page.reload(); await page.waitForSelector("#welcome #wStart");
    check(await page.inputValue("#wStart") === "2026-11-02", "start date stays at 2 Nov");
    for (let i = 0; i < 4; i++) await page.click("[data-wnext]");
    check(await page.isVisible("[data-wdone='#today']") && !(await page.isVisible("[data-wdone='#read/0']")), "last slide just says Done");
    await page.click("[data-wdone='#today']");
    check(!("start" in (await state(page)).settings), "start date not written when unchanged");
    await setTime(page, 60, "pc");
    check(await page.$("#view-today [data-kind='setup']") === null, "no Week 0 suggestion once you've started");
    await context.close();
  });

  await test("lessons show your own week dates", async () => {
    const { context, page } = await open(browser);
    await goHash(page, "#read/3/overview");
    check(/Mon 16 Nov – Sun 22 Nov 2026/.test(await page.textContent(".rsec.open .rsec-body")), "default start: lesson keeps 16–22 Nov");
    await page.evaluate(() => { const s = window.DSS.state(); s.settings.start = { v: "2026-12-28", t: Date.now() }; localStorage.setItem("data-skills-studio-v2", JSON.stringify(s)); });
    await page.reload(); await goHash(page, "#read/3/overview");
    const body = await page.textContent(".rsec.open .rsec-body");
    check(/Mon 11 Jan – Sun 17 Jan 2027/.test(body) && !/16 Nov/.test(body), "lesson date line follows the start date: " + body.slice(0, 160).replace(/\s+/g, " "));
    check(/Mon 11 Jan – Sun 17 Jan 2027/.test(await page.textContent(".reader-head .eyebrow")), "reader header shows the dates too");
    await goHash(page, "#read/1/overview");
    check(/Mon 28 Dec 2026 – Sun 3 Jan 2027/.test(await page.textContent(".rsec.open .rsec-body")), "a week spanning New Year shows both years");
    await context.close();
  });

  await test("Week 0: steps tick but don't count towards course progress", async () => {
    const { context, page, errors } = await open(browser, { context: { viewport: { width: 1280, height: 800 } } });
    await goHash(page, "#read/1/overview");
    const link = await page.$(".rsec.open a[href='#read/0']");
    check(!!link, "Week 1 links to Week 0");
    check(await page.$(".reader-head a[href='#read/0']") !== null, "Week 1 header has a ‹ Week 0 button");
    await goHash(page, "#read/0/set-up-files-windows-and-your-first-back");
    const n = await page.$$eval(".rsec.open li.step", (l) => l.length);
    check(n === 14, "14 tickable set-up steps (" + n + ")");
    await page.click("[data-stepnext]");
    const st = await state(page);
    check(Object.keys(st.step).some((k) => k.startsWith("0:set-up-files-windows-and-your-first-back:")), "set-up step saved under week 0");
    check((await page.textContent("#overallPct")).startsWith("0%"), "overall progress unchanged");
    check(await page.$(".reader-head a[href='#read/1']") !== null, "Week 0 leads on to Week 1");
    check(await page.evaluate(() => window.DSS.currentWeek()) === 1, "you're still on Week 1");
    check(errors.length === 0, "no errors: " + errors.join(" / "));
    await context.close();
  });

  await test("Confusing? notes: save, show, send on WhatsApp, mark sent", async () => {
    const { context, page, errors } = await open(browser, { context: { viewport: { width: 1280, height: 800 } } });
    await page.evaluate(() => { const s = window.DSS.state(); s.settings.name = { v: "Sam", t: Date.now() }; localStorage.setItem("data-skills-studio-v2", JSON.stringify(s)); });
    await page.reload();
    await goHash(page, "#read/1/session-1-find-your-way-around");
    check((await page.$$(".rsec.open .fbbtn")).length === 17, "every step has a Confusing? button");
    check(await page.isVisible(".rsec.open li.step.current .fbbtn") && !(await page.isVisible(".rsec.open li.step:nth-of-type(5) .fbbtn")), "it shows on the step you're on, not on every step");
    await page.hover(".rsec.open li.step:nth-of-type(3)");
    await page.click(".rsec.open li.step:nth-of-type(3) .fbbtn");
    check(await page.isVisible("#fbNote"), "note box opens");
    await page.keyboard.type("Which button is select all?");
    check((await state(page)).step && Object.keys((await state(page)).step).length === 0, "typing N in the note box doesn't tick a step");
    await page.click("[data-fbsave]");
    let st = await state(page);
    const notes = Object.values(st.fb);
    check(notes.length === 1 && notes[0].week === 1 && notes[0].step === 3 && notes[0].note === "Which button is select all?", "note saved with week and step");
    check(/^Make it readable/.test(notes[0].text), "note keeps the step's words: " + notes[0].text);
    check(/Noted/.test(await page.textContent(".rsec.open li.step:nth-of-type(3) .fbbtn")), "step shows it's noted");
    check(/1 confusing step noted/.test(await page.textContent(".reader-head")), "reader header counts notes to send");
    // edit the same step: still one note
    await page.click(".rsec.open li.step:nth-of-type(3) .fbbtn");
    check(await page.inputValue("#fbNote") === "Which button is select all?", "existing note opens for editing");
    await page.fill("#fbNote", "Ctrl+A selected only one cell");
    await page.click("[data-fbsave]");
    check(Object.values((await state(page)).fb).length === 1, "editing doesn't duplicate the note");
    await goHash(page, "#settings");
    check((await page.$$("#fbList .fblist li")).length === 1, "Settings lists the note");
    const href = await page.getAttribute("#fbWhatsApp", "href");
    const msg = decodeURIComponent(href.replace("https://wa.me/?text=", ""));
    check(href.startsWith("https://wa.me/?text=") && /from Sam/.test(msg) && /Week 1 · Session 1 · step 3/.test(msg) && /Ctrl\+A selected only one cell/.test(msg), "WhatsApp message names the week, step and note: " + msg);
    await page.click("#fbCopy");
    check(await page.isVisible("#toast.show"), "copy gives feedback");
    await page.click("#fbSent");
    st = await state(page);
    check(Object.values(st.fb).every((n) => n.sent), "marked as sent");
    check(await page.isVisible("#fbClear") && /1 sent already/.test(await page.textContent("#fbList")), "sent notes are counted, not listed");
    check(await page.evaluate(() => document.getElementById("fbCopy").disabled), "nothing left to copy");
    // merge keeps notes from both devices
    const merged = await page.evaluate(() => { const a = window.DSS.state(); const b = { v: 2, fb: { x1: { id: "x1", week: 2, sid: "s", step: 1, text: "t", note: "n", t: 5 } } }; return window.DSS.merge(a, b).fb; });
    check(Object.keys(merged).length === 2, "backup merge keeps both devices' notes");
    await page.click("#fbClear");
    check(Object.values((await state(page)).fb).every((n) => n.del), "clearing sent notes deletes them");
    check(errors.length === 0, "no errors: " + errors.join(" / "));
    await context.close();
  });

  await test("course files: the ZIP, each week's files, and sharing the course", async () => {
    const zipInfo = await (async () => { const { context, page } = await open(browser); const z = await page.evaluate(() => window.COURSE_DATA.zip); await context.close(); return z; })();
    const zipFile = path.join(ROOT, zipInfo.path);
    check(fs.existsSync(zipFile) && fs.statSync(zipFile).size > 500000, "course ZIP exists");
    const zbytes = fs.readFileSync(zipFile).toString("latin1");
    check(zbytes.includes("Learning-Data/START HERE.txt") && zbytes.includes("Learning-Data/data/week01/shift_downtime_log.csv") && zbytes.includes("Learning-Data/my_work/README.md"), "ZIP has one Learning-Data folder with the data, my_work and START HERE");
    check(!/Learning-Data\/(app|course|tools)\//.test(zbytes) && !zbytes.includes("__pycache__"), "ZIP leaves out the app, lessons, tools and caches");
    // every listed file exists
    const weeks = await (async () => { const { context, page } = await open(browser); const w = await page.evaluate(() => window.COURSE_DATA.weeks.map((x) => x.files)); await context.close(); return w; })();
    const missing = weeks.flat().filter((f) => !fs.existsSync(path.join(ROOT, f.p)));
    check(missing.length === 0, "every listed week file exists: " + missing.map((f) => f.p).join(", "));
    check(weeks[2].some((f) => f.p === "data/csv/assets.csv") && weeks[6].some((f) => f.dir && f.p === "data/exports/work_orders/" && f.n === 24), "Week 3 lists assets.csv, Week 7 the exports folder");

    const srv = await serve();
    const base = `http://127.0.0.1:${srv.port}/`;
    const { context, page, errors } = await open(browser, { url: base, context: { viewport: { width: 390, height: 844 } } });
    await goHash(page, "#read/3");
    check(await page.isVisible(".files-card summary"), "Files for this week box in the reader");
    await page.click(".files-card summary");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click(".files-card a[href='data/csv/assets.csv']")]);
    check(dl.suggestedFilename() === "assets.csv", "a week's file downloads from the site");
    check(/Documents\\Learning-Data\\data\\csv/.test(await page.textContent(".files-card")), "says which folder it belongs in");
    const [zdl] = await Promise.all([page.waitForEvent("download"), page.click(".files-card a[href='downloads/Learning-Data.zip']")]);
    check(zdl.suggestedFilename() === "Learning-Data.zip", "the course ZIP downloads from the reader");
    await goHash(page, "#settings");
    const wa = decodeURIComponent((await page.getAttribute("#shWhatsApp", "href")).replace("https://wa.me/?text=", ""));
    check(wa.includes(base) && /Week 0/.test(wa), "Share the course sends this site's link and what to do: " + wa);
    check((await page.textContent("#shLink")) === base, "Settings shows the link to share");
    check(await page.$("#shZip a[href='downloads/Learning-Data.zip']") !== null, "Settings offers the files on their own");
    check(await noOverflow(page), "no overflow on Settings at phone width");
    check(errors.filter((e) => !/Failed to load resource/.test(e)).length === 0, "no errors: " + errors.join(" / "));
    await context.close();
    await srv.kill();
  });

  await test("Stage 3: check my answer, glossary, checkpoints, fix boxes, pictures", async () => {
    const { context, page, errors } = await open(browser, { context: { viewport: { width: 390, height: 844 } } });
    // answer matching rules
    const cases = await page.evaluate(() => {
      const c = window.DSS.checkAnswer;
      const t1 = "You should see: Average ≈ 15.6, Count 125 (124 rows plus the header) and Sum 1931.";
      return [c(t1, "1931"), c(t1, "1,931"), c(t1, "15.57"), c(t1, "126"), c(t1, "15.9"), c("You should see: 15.57…", "15.6"),
        c("You should see: `LD-PPK-021` become `PPK`.", "21"), c("You should see: 79.5 %", "79.5%"), c("You should see: 79.5 %", "80"),
        c("You should see: `I3` change to 1080.", "3"), c("You should see: 1931.", "abc")];
    });
    check(JSON.stringify(cases) === JSON.stringify([true, true, true, false, false, true, false, true, false, false, null]), "answer matching: " + JSON.stringify(cases));
    await goHash(page, "#read/1/session-2-formulas-and-cell-references");
    await page.click("[data-stepnext]");
    check(await page.isVisible(".rsec.open li.step.current .chk input"), "Check my answer box on the step you're on");
    check((await page.$$(".rsec.open .chk")).length === 1, "only on that step");
    await page.fill("#chkIn", "1930"); await page.keyboard.press("Enter");
    check(/Not a match/.test(await page.textContent(".chk-res")) && /If your numbers don't match/.test(await page.textContent(".chk-res")), "a wrong number points to the fix box");
    await page.fill("#chkIn", "1931"); await page.click("[data-chk]");
    check(/matches/.test(await page.textContent(".chk-res")), "the right number gets a tick");
    check(Object.keys((await state(page)).step).length === 1, "typing in the box doesn't tick steps");
    // checkpoints and fix box
    check((await page.$$(".rsec.open p.checkpoint")).length === 2, "two checkpoints in Week 1 Session 2");
    check(await page.isVisible(".rsec.open .md-fix h3") && (await page.$$(".rsec.open .md-fix li")).length === 6, "If your numbers don't match box with its six fixes");
    const lessonFix = await page.evaluate(() => window.COURSE_DATA.weeks.slice(0, 4).map((w) => w.sections.filter((s) => s.kind === "hands" && /If your numbers don't match/.test(s.md)).length));
    check(JSON.stringify(lessonFix) === "[2,3,3,3]", "Weeks 1–4 have fix boxes: " + JSON.stringify(lessonFix));
    // glossary
    const gl = await page.$$eval(".rsec.open button.gl", (b) => b.map((x) => x.textContent.toLowerCase()));
    check(gl.includes("fill handle") && new Set(gl).size === gl.length, "glossary terms underlined once each: " + gl.join(", "));
    check(await page.$(".rsec.open code button.gl, .rsec.open a button.gl") === null, "never inside code or links");
    await page.click(".rsec.open button.gl >> text=fill handle");
    check(await page.isVisible("#glPop") && /small square/.test(await page.textContent("#glPop")), "tapping a term shows its meaning");
    await page.keyboard.press("Escape");
    check(!(await page.isVisible("#glPop")), "Escape closes it");
    // pictures: only rendered when the file exists
    const md = await page.evaluate(() => [
      MD.render("![Freeze Panes](../img/x.png)", { path: "course/phase-0/w.md", image: (p) => p === "course/img/x.png" }),
      MD.render("![Missing](../img/y.png)", { path: "course/phase-0/w.md", image: () => false })]);
    check(/<img class="md-img" src="course\/img\/x.png" alt="Freeze Panes"/.test(md[0]) && !/<img/.test(md[1]), "pictures show when present and vanish when not");
    check(await noOverflow(page), "no overflow at phone width");
    check(errors.length === 0, "no errors: " + errors.join(" / "));
    await context.close();
  });

  await test("practice data generator still produces downloads", async () => {
    const { context, page } = await open(browser, { context: { viewport: { width: 1280, height: 800 } } });
    await goHash(page, "#data");
    await page.fill("#gScale", "10"); await page.fill("#gMonths", "6");
    await page.click("#gRun");
    await page.waitForSelector("#gDownloads button", { timeout: 15000 });
    check((await page.$$("#gDownloads button")).length === 4, "four CSV buttons");
    const [dl] = await Promise.all([page.waitForEvent("download"), page.click("#gDownloads button:nth-child(3)")]);
    check(dl.suggestedFilename() === "seed7_work_orders.csv", "work orders file name");
    const p = path.join(TMP, "wo.csv"); await dl.saveAs(p);
    const text = fs.readFileSync(p, "utf8");
    check(text.startsWith("wo_id,asset_id,pm_id,wo_type") && text.split("\n").length > 50, "CSV has header and rows");
    await context.close();
  });

  await test("no horizontal overflow at 360x740 and 1280x800, light and dark", async () => {
    for (const vp of [{ width: 360, height: 740 }, { width: 1280, height: 800 }]) for (const scheme of ["light", "dark"]) {
      const { context, page, errors } = await open(browser, { context: { viewport: vp, colorScheme: scheme } });
      const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
      check(scheme === "dark" ? bg === "rgb(18, 21, 27)" : bg === "rgb(246, 247, 249)", `${scheme} background applied (${bg})`);
      for (const h of ["#today", "#course", "#read/1", "#cards/week/5", "#read/5/check-yourself", "#read/9/check-yourself", "#read/14/session-2-views-and-the-done-when-query", "#read/13/session-2-reliability-metrics", "#read/59/session-2-bearing-frequencies-and-envelo", "#read/33", "#cards/review", "#log", "#data", "#settings"]) {
        await goHash(page, h);
        if (h === "#cards/review" && await page.isVisible("[data-reveal]")) await page.click("[data-reveal]");
        if (h === "#course") await page.evaluate(() => document.querySelectorAll("#phases details").forEach((d) => (d.open = true)));
        if (h === "#read/33") await page.evaluate(() => document.querySelectorAll(".rsec-head").forEach((b) => b.click()));
        if (h.startsWith("#read/")) await page.evaluate(() => document.querySelectorAll("details.md-details").forEach((d) => (d.open = true)));
        check(await noOverflow(page), `no horizontal page scroll: ${vp.width}px ${scheme} ${h}`);
      }
      if (vp.width === 360) {
        await goHash(page, "#today");
        const small = await page.$$eval("#view-today button, nav.bottombar button, #pendingBar button", (bs) => bs.filter((b) => b.offsetParent && b.getBoundingClientRect().height < 44).map((b) => b.textContent.trim()));
        check(small.length === 0, "tap targets on Today are at least 44px tall: " + small.join(", "));
        check(await page.isVisible("nav.bottombar") && !(await page.isVisible("nav.tabs")), "phone: bottom tab bar");
      } else {
        check(await page.isVisible("nav.tabs") && !(await page.isVisible("nav.bottombar")), "desktop: top tabs");
      }
      check(errors.length === 0, "no errors: " + errors.join(" / "));
      await context.close();
    }
  });

  await test("served over http: manifest, icons, service worker, works offline", async () => {
    const srv = await serve();
    const base = `http://127.0.0.1:${srv.port}/`;
    const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
    await context.addInitScript(() => { window.__DSS_NO_ONBOARDING__ = true; });
    const page = await context.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    await page.goto(base);
    await page.waitForSelector("#view-today .primary-rec");
    const man = await page.evaluate(async () => { const r = await fetch(document.querySelector('link[rel="manifest"]').href); return r.text(); });
    let manifest = null; try { manifest = JSON.parse(man); } catch (e) { /* checked below */ }
    check(manifest && manifest.name && manifest.start_url && manifest.display === "standalone", "manifest is valid JSON with the basics");
    for (const icon of (manifest ? manifest.icons : [])) {
      const f = path.join(ROOT, icon.src);
      const ok = fs.existsSync(f);
      check(ok, "icon exists: " + icon.src);
      if (ok) { const b = fs.readFileSync(f); const w = b.readUInt32BE(16), h = b.readUInt32BE(20); check(`${w}x${h}` === icon.sizes, `icon ${icon.src} is ${icon.sizes} (got ${w}x${h})`); }
    }
    check(manifest && manifest.icons.some((i) => i.purpose === "maskable"), "has a maskable icon");
    const swOk = await page.evaluate(async () => { const r = await navigator.serviceWorker.ready; return !!r.active; });
    check(swOk, "service worker registered and active");
    await page.reload(); await page.waitForSelector("#view-today .primary-rec");
    check(await page.evaluate(() => !!navigator.serviceWorker.controller), "page is controlled by the service worker");
    await goHash(page, "#read/7"); await page.waitForSelector(".rsec");
    // go offline (and stop the server, to be sure)
    await context.setOffline(true);
    await srv.kill();
    await page.reload(); await page.waitForSelector("#view-today .primary-rec, .rsec", { timeout: 10000 });
    check(await page.evaluate(() => window.COURSE_DATA && window.COURSE_DATA.weeks.length === 62), "course data loads offline");
    await goHash(page, "#read/13/session-1-window-function-basics");
    check(await page.isVisible(".rsec.open pre.code"), "lessons readable offline");
    await page.goto(base + "index.html#cards").catch(() => {});
    await page.waitForSelector("#view-cards:not(.hidden)", { timeout: 10000 });
    check(true, "index.html opens offline");
    check(errors.length === 0, "no page errors: " + errors.join(" / "));
    await context.close();
  });

  await test("screenshots for visual review", async () => {
    if (!SHOTS) { check(true, "skipped (set SHOTS_DIR)"); return; }
    for (const scheme of ["light", "dark"]) {
      const { context, page } = await open(browser, { context: { viewport: { width: 390, height: 844 }, colorScheme: scheme }, time: "2026-11-10T19:00:00" });
      await page.evaluate(() => { const s = window.DSS.state(); }); // warm
      await setTime(page, 15, "phone");
      await shot(page, `phone-${scheme}-today`);
      await shot(page, `phone-${scheme}-today-full`, true);
      await goHash(page, "#read/13/session-2-reliability-metrics");
      await page.waitForTimeout(100);
      await shot(page, `phone-${scheme}-reader`);
      await goHash(page, "#read/48/session-1-beta-and-eta");
      await page.waitForTimeout(100);
      await shot(page, `phone-${scheme}-reader-maths`);
      await goHash(page, "#cards/review"); await page.waitForSelector("[data-reveal]");
      await shot(page, `phone-${scheme}-quiz-question`);
      await page.click("[data-reveal]");
      await shot(page, `phone-${scheme}-quiz-answer`);
      await goHash(page, "#course");
      await shot(page, `phone-${scheme}-course`);
      await goHash(page, "#settings");
      await shot(page, `phone-${scheme}-settings`, true);
      await context.close();
    }
    const { context, page } = await open(browser, { context: { viewport: { width: 1280, height: 800 } }, time: "2026-11-10T19:00:00" });
    await setTime(page, 60, "pc");
    await shot(page, "desktop-today");
    await goHash(page, "#read/1/session-2-formulas-and-cell-references");
    await page.waitForTimeout(100);
    await shot(page, "desktop-reader");
    await goHash(page, "#log");
    await shot(page, "desktop-log");
    await context.close();
    check(true, "screenshots saved to " + SHOTS);
  });

  await browser.close();
  fs.rmSync(TMP, { recursive: true, force: true });
  console.log(results.join("\n"));
  console.log(`\n${passed} checks passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
