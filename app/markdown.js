/* Small markdown renderer for the lesson files, written for what they actually use:
   headings, paragraphs, nested ordered/unordered lists, task lists, tables, fenced code,
   inline code, bold/italic, links, blockquotes, <details>/<summary>, horizontal rules and
   $$...$$ maths. Everything is HTML-escaped first; the only tags that come out are the
   ones this file writes, so lesson text cannot inject script or markup. No dependencies. */
(function (root) {
  "use strict";
  const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ESC[c]);

  const RE = {
    fence: /^( *)(`{3,}|~{3,})\s*([\w+#.-]*)/,
    heading: /^ {0,3}(#{1,6})\s+(.*?)\s*#*\s*$/,
    hr: /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/,
    marker: /^( *)([-*+]|\d{1,9}[.)])( +|$)(.*)$/,
    quote: /^ {0,3}> ?/,
    tableSep: /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/,
    math: /^\s*\$\$/,
    html: /^\s*<\/?(details|summary)\b/i,
  };

  // ---------- URLs ----------
  function resolvePath(base, rel) {
    const parts = base ? base.split("/") : [];
    parts.pop(); // drop the file name
    for (const seg of rel.split("/")) {
      if (seg === "..") parts.pop();
      else if (seg !== "." && seg !== "") parts.push(seg);
    }
    return parts.join("/");
  }
  function linkFor(url, ctx) {
    url = url.trim();
    if (/^(https?:|mailto:)/i.test(url)) return { href: url, ext: true };
    if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return null; // javascript:, data:, etc. are dropped
    if (url.startsWith("#")) return null;               // in-page anchors: plain text
    const [path] = url.split("#");
    const full = resolvePath(ctx.path || "", path);
    if (ctx.internal) { const h = ctx.internal(full); if (h) return { href: h, ext: false }; }
    if (ctx.repo) return { href: ctx.repo.replace(/\/?$/, "/") + full, ext: true };
    return null;
  }

  // ---------- inline ----------
  function inline(src, ctx) {
    ctx = ctx || {};
    const slots = [];
    const hold = (html) => "\u0000" + (slots.push(html) - 1) + "\u0001";
    let s = String(src);
    // code spans first: their content is literal
    s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, t, code) => {
      const c = code.replace(/\n/g, " ");
      return hold("<code>" + esc(c.length > 2 && c[0] === " " && c[c.length - 1] === " " ? c.slice(1, -1) : c) + "</code>");
    });
    // backslash escapes
    s = s.replace(/\\([\\`*_{}\[\]()#+\-.!|<>"'~$])/g, (_, c) => hold(esc(c)));
    // the few inline tags the lessons use (in <summary>)
    s = s.replace(/<(\/?)(strong|em|b|i|kbd)>/gi, (_, sl, tag) => hold("<" + sl + tag.toLowerCase() + ">"));
    s = s.replace(/<br\s*\/?>/gi, () => hold("<br>"));
    // images ![alt](path): shown only when ctx.image says the file exists, so a lesson can name a
    // picture before anyone has taken it.
    s = s.replace(/!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?\s*\)/g, (_, alt, url) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(url)) return hold("");
      const full = resolvePath(ctx.path || "", url.trim());
      if (!ctx.image || !ctx.image(full)) return hold("");
      return hold(`<img class="md-img" src="${esc(full)}" alt="${esc(alt)}" loading="lazy">`);
    });
    // links [text](url "title")
    s = s.replace(/\[([^\]]+)\]\(\s*<?([^)\s>]+)>?(?:\s+"[^"]*")?\s*\)/g, (_, text, url) => {
      const l = linkFor(url, ctx);
      const inner = emph(esc(text));
      if (!l) return hold(inner);
      return hold(`<a href="${esc(l.href)}"${l.ext ? ' target="_blank" rel="noopener noreferrer"' : ""}>${inner}</a>`);
    });
    // <https://...> autolinks
    s = s.replace(/<(https?:\/\/[^>\s]+)>/g, (_, u) => hold(`<a href="${esc(u)}" target="_blank" rel="noopener noreferrer">${esc(u)}</a>`));
    s = emph(esc(s));
    // bare URLs
    s = s.replace(/(^|[\s(])(https?:\/\/[^\s<\u0000]+[^\s<.,;:!?)\u0000\u0001])/g,
      (_, pre, u) => `${pre}<a href="${u}" target="_blank" rel="noopener noreferrer">${u}</a>`);
    s = s.replace(/ {2,}\n|\\\n/g, "<br>").replace(/\n/g, " ");
    for (let k = 0; k < 5 && s.indexOf("\u0000") >= 0; k++) s = s.replace(/\u0000(\d+)\u0001/g, (_, n) => slots[+n]);
    return s;
  }
  function emph(s) {
    return s
      .replace(/\*\*(?=\S)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>")
      .replace(/(^|[^\w])__(?=\S)([\s\S]*?\S)__(?!\w)/g, "$1<strong>$2</strong>")
      .replace(/\*(?=[^\s*])([^*]*?[^\s*])\*/g, "<em>$1</em>")
      .replace(/\*(?=[^\s*])([^*])\*/g, "<em>$1</em>")
      .replace(/(^|[^\w])_(?=[^\s_])([^_]*?[^\s_]|[^\s_])_(?!\w)/g, "$1<em>$2</em>");
  }

  // ---------- maths ----------
  const SYM = { alpha: "α", beta: "β", gamma: "γ", delta: "δ", Delta: "Δ", epsilon: "ε", eta: "η", theta: "θ",
    lambda: "λ", mu: "μ", pi: "π", rho: "ρ", sigma: "σ", Sigma: "Σ", tau: "τ", phi: "φ", varphi: "φ", omega: "ω",
    infty: "∞", cdot: "·", times: "×", le: "≤", ge: "≥", leq: "≤", geq: "≥", neq: "≠", approx: "≈", pm: "±",
    int: "∫", sum: "Σ", sqrt: "√", partial: "∂", to: "→", rightarrow: "→", ldots: "…", dots: "…" };
  function prettyTex(t) {
    let s = t.replace(/\\(?:text|mathrm|mathbf|operatorname)\{([^{}]*)\}/g, "$1")
      .replace(/\\left|\\right/g, "")
      .replace(/\\qquad|\\quad/g, "     ")
      .replace(/\\[,;!]/g, " ");
    const wrap = (x) => (/^[\w.αβγδηθλμπσφω]+$/.test(x.trim()) ? x.trim() : "(" + x.trim() + ")");
    for (let k = 0; k < 6; k++) s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, (_, a, b) => wrap(a) + " / " + wrap(b));
    s = s.replace(/\\(cos|sin|tan|exp|log|ln|max|min)\b/g, "$1")
      .replace(/\\([A-Za-z]+)/g, (m, n) => (SYM[n] != null ? SYM[n] : n));
    for (let k = 0; k < 4; k++) s = s.replace(/\^\{([^{}]*)\}/g, (_, a) => "^" + wrap(a)).replace(/_\{([^{}]*)\}/g, (_, a) => "_" + wrap(a));
    return s.replace(/[{}]/g, "").replace(/ +\n/g, "\n").trim();
  }
  function mathBlock(tex) {
    return `<div class="math" role="math" aria-label="${esc(tex)}"><code>${esc(prettyTex(tex))}</code></div>`;
  }

  // ---------- blocks ----------
  const indentOf = (l) => l.length - l.replace(/^ +/, "").length;
  function strip(l, n) { let k = 0; while (k < n && l[k] === " ") k++; return l.slice(k); }

  function isTableStart(lines, i) {
    return lines[i].indexOf("|") >= 0 && i + 1 < lines.length && RE.tableSep.test(lines[i + 1]) && /[|]/.test(lines[i + 1] + lines[i]);
  }
  function splitRow(line) {
    let s = line.trim();
    if (s.startsWith("|")) s = s.slice(1);
    if (s.endsWith("|") && !s.endsWith("\\|")) s = s.slice(0, -1);
    const cells = []; let cur = "", tick = 0;
    for (let k = 0; k < s.length; k++) {
      const c = s[k];
      if (c === "\\" && s[k + 1] === "|") { cur += "|"; k++; continue; }
      if (c === "`") { let n = 1; while (s[k + n] === "`") n++; tick = tick === n ? 0 : tick || n; cur += s.substr(k, n); k += n - 1; continue; }
      if (c === "|" && !tick) { cells.push(cur.trim()); cur = ""; continue; }
      cur += c;
    }
    cells.push(cur.trim());
    return cells;
  }
  function table(lines, i, ctx) {
    const head = splitRow(lines[i]);
    const aligns = splitRow(lines[i + 1]).map((c) => (/^:-+:$/.test(c) ? "center" : /-+:$/.test(c) ? "right" : /^:-+/.test(c) ? "left" : ""));
    const al = (k) => (aligns[k] ? ` style="text-align:${aligns[k]}"` : "");
    let j = i + 2; const rows = [];
    while (j < lines.length && lines[j].trim() && lines[j].indexOf("|") >= 0) rows.push(splitRow(lines[j++]));
    const html = `<div class="table-wrap" tabindex="0"><table><thead><tr>${head.map((c, k) => `<th${al(k)}>${inline(c, ctx)}</th>`).join("")}</tr></thead>` +
      `<tbody>${rows.map((r) => `<tr>${head.map((_, k) => `<td${al(k)}>${inline(r[k] || "", ctx)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;
    return { html, next: j };
  }

  function startsBlock(lines, i) {
    const l = lines[i];
    return RE.fence.test(l) && indentOf(l) < 4 || RE.heading.test(l) || RE.hr.test(l) || RE.quote.test(l) ||
      RE.html.test(l) || RE.math.test(l) || isTableStart(lines, i) || (RE.marker.test(l) && indentOf(l) < 4);
  }

  function list(lines, i, ctx) {
    const m0 = lines[i].match(RE.marker);
    const base = m0[1].length, ordered = /\d/.test(m0[2]);
    const items = []; let cur = null, j = i, loose = false, blankBefore = false;
    while (j < lines.length) {
      const L = lines[j];
      if (!L.trim()) { if (cur) cur.lines.push(""); blankBefore = true; j++; continue; }
      const ind = indentOf(L), m = L.match(RE.marker);
      if (m && ind <= base + 1 && (/\d/.test(m[2]) === ordered) && !RE.hr.test(L)) {
        if (cur && blankBefore) loose = true;
        const pad = m[3].length > 4 ? 1 : Math.max(1, m[3].length);
        cur = { lines: [m[4]], content: ind + m[2].length + pad, num: parseInt(m[2], 10) };
        items.push(cur); blankBefore = false; j++; continue;
      }
      if (ind > base) {
        if (blankBefore) loose = true;
        cur.lines.push(strip(L, Math.min(ind, cur.content))); blankBefore = false; j++; continue;
      }
      if (!blankBefore && !startsBlock(lines, j)) { cur.lines.push(L.trim()); j++; continue; } // lazy continuation
      break;
    }
    // trailing blank lines belong to no item
    for (const it of items) while (it.lines.length && !it.lines[it.lines.length - 1].trim()) it.lines.pop();
    const tag = ordered ? "ol" : "ul";
    const start = ordered && items[0].num !== 1 ? ` start="${items[0].num}"` : "";
    const lis = items.map((it) => {
      let first = it.lines[0] || "", task = "";
      const t = first.match(/^\[([ xX])\]\s+(.*)$/);
      if (t) { task = `<input type="checkbox" disabled${t[1] !== " " ? " checked" : ""}> `; it.lines[0] = t[2]; }
      const inner = blocks(it.lines, ctx, !loose);
      return `<li${task ? ' class="task"' : ""}>${task}${inner}</li>`;
    });
    return { html: `<${tag}${start}>${lis.join("")}</${tag}>`, next: j };
  }

  function htmlTag(line, ctx) {
    const s = line.trim();
    if (/^<details\b/i.test(s)) return `<details class="md-details"${/\bopen\b/i.test(s) ? " open" : ""}>` + (s.replace(/^<details[^>]*>/i, "").trim() ? inline(s.replace(/^<details[^>]*>/i, ""), ctx) : "");
    if (/^<\/details/i.test(s)) return "</details>";
    if (/^<summary\b/i.test(s)) {
      const inner = s.replace(/^<summary[^>]*>/i, "").replace(/<\/summary>\s*$/i, "");
      return `<summary>${inline(inner, ctx)}</summary>`;
    }
    if (/^<\/summary/i.test(s)) return "";
    return `<p>${inline(s, ctx)}</p>`;
  }

  function blocks(lines, ctx, tight) {
    const out = []; let i = 0;
    while (i < lines.length) {
      const line = lines[i];
      if (!line.trim()) { i++; continue; }
      let m;
      if ((m = line.match(RE.fence)) && m[1].length < 4) {
        const ind = m[1].length, ch = m[2][0], len = m[2].length, lang = m[3];
        const close = new RegExp("^ {0,3}\\" + ch + "{" + len + ",}\\s*$");
        const code = []; i++;
        while (i < lines.length && !close.test(lines[i])) code.push(strip(lines[i++], ind));
        i++;
        out.push(`<pre class="code"${lang ? ` data-lang="${esc(lang)}"` : ""} tabindex="0"><code>${esc(code.join("\n"))}</code></pre>`);
        continue;
      }
      if (RE.math.test(line)) {
        let t = line.trim().slice(2); const buf = [];
        if (t.endsWith("$$")) { buf.push(t.slice(0, -2)); i++; }
        else {
          buf.push(t); i++;
          while (i < lines.length && lines[i].indexOf("$$") < 0) buf.push(lines[i++]);
          if (i < lines.length) { buf.push(lines[i].slice(0, lines[i].indexOf("$$"))); i++; }
        }
        out.push(mathBlock(buf.join("\n").trim()));
        continue;
      }
      if ((m = line.match(RE.heading))) {
        const lvl = m[1].length;
        let attr = "";
        if (lvl === 3) { ctx.h3 = (ctx.h3 == null ? -1 : ctx.h3) + 1; attr = ` data-h="${ctx.h3}"`; }
        out.push(`<h${lvl}${attr}>${inline(m[2], ctx)}</h${lvl}>`);
        i++; continue;
      }
      if (RE.hr.test(line)) { out.push("<hr>"); i++; continue; }
      if (RE.html.test(line)) { out.push(htmlTag(line, ctx)); i++; continue; }
      if (RE.quote.test(line)) {
        const buf = [];
        while (i < lines.length && lines[i].trim() && (RE.quote.test(lines[i]) || !startsBlock(lines, i))) buf.push(lines[i++].replace(RE.quote, ""));
        out.push(`<blockquote>${blocks(buf, ctx)}</blockquote>`);
        continue;
      }
      if (isTableStart(lines, i)) { const r = table(lines, i, ctx); out.push(r.html); i = r.next; continue; }
      if (RE.marker.test(line) && indentOf(line) < 4) { const r = list(lines, i, ctx); out.push(r.html); i = r.next; continue; }
      const buf = [line.trim()]; i++;
      while (i < lines.length && lines[i].trim() && !startsBlock(lines, i)) buf.push(lines[i++].replace(/^ +/, ""));
      const html = inline(buf.join("\n"), ctx);
      out.push(tight ? html : `<p>${html}</p>`);
    }
    return out.join("\n");
  }

  function render(md, ctx) {
    ctx = Object.assign({}, ctx || {});
    return blocks(String(md || "").replace(/\r\n?/g, "\n").replace(/\t/g, "    ").split("\n"), ctx, false);
  }

  root.MD = { render, inline: (s, ctx) => inline(s, ctx || {}), esc, prettyTex };
})(typeof window !== "undefined" ? window : globalThis);
