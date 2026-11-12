"""
Rebuild the tracker's course data from the lesson files.

Week 0 (course/week-00-setup.md) is built too, as "setup": it has steps to tick but no
checklist, quiz or dates, and it doesn't count towards progress.

Run after editing any lesson (title, sections, "Tick off", "Check yourself",
"Watch" or "Short on time?"):
    python tools/build_tracker.py

It writes app/course-data.js, a plain script that sets window.COURSE_DATA.
index.html loads it with a <script src> tag, so the app still works when it is
opened by double-click from disk (file://), where fetch() of local files fails.
It also stamps a content hash into sw.js so a new deploy replaces the old
offline cache.
"""
import hashlib
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "app" / "course-data.js"
SW = ROOT / "sw.js"
INDEX = ROOT / "index.html"
# Files the service worker caches. Their contents feed the cache version hash.
SHELL = ["index.html", "app/app.js", "app/markdown.js", "app/app.css", "app/course-data.js",
         "manifest.webmanifest", "app/icons/icon-192.png", "app/icons/icon-512.png",
         "app/icons/icon-maskable-512.png", "app/icons/apple-touch-icon.png", "app/icons/favicon-32.png"]

PHASES = [
    {"id": 0, "name": "Foundations", "short": "Excel basics",
     "done_when": "You built the two-week downtime summary with SUMIFS formulas that reconcile to 124 events / 1,931 minutes, plus a decluttered chart."},
    {"id": 1, "name": "Advanced Excel & Power Query", "short": "Excel & PQ",
     "done_when": "You drop a new export into the folder, press Refresh All, and every table and chart updates with zero manual edits."},
    {"id": 2, "name": "Data modelling & SQL", "short": "SQL",
     "done_when": "You can answer 'which 10 assets lost the most hours to reactive work last quarter, and were their PMs on time?' in one query."},
    {"id": 3, "name": "Power BI", "short": "Power BI",
     "done_when": "The Model Line team could use the dashboard in a weekly review without you explaining it."},
    {"id": 4, "name": "Production data: OEE, Redzone & Tableau", "short": "OEE & Tableau",
     "done_when": "You can rebuild line OEE from raw shift data to match the dashboard, and show in Tableau what share of lost time is maintenance-related and which assets drive it."},
    {"id": 5, "name": "Python for data", "short": "Python",
     "done_when": "A task that took you an hour a week in Excel now runs from a single command."},
    {"id": 6, "name": "Statistics & reliability analytics", "short": "Reliability",
     "done_when": "You can defend a PM interval change with numbers in front of an engineering manager."},
    {"id": 7, "name": "Machine learning & condition monitoring", "short": "ML & CM",
     "done_when": "You can explain to a non-specialist why your model's alerts are worth acting on, and how many false alarms to expect."},
]

# A code fence line, including one opened straight after a list marker ("4. ```", "- ```sql").
FENCE = re.compile(r"^\s*(?:(?:[-*+]|\d{1,9}[.)])\s+)?(`{3,}|~{3,})[\w+#.-]*\s*$")
NUM_ITEM = re.compile(r"^(\d+)\.\s+(.*)$")
# A search phrase is a quoted phrase in italics: *"Leila Gharani XLOOKUP"* (straight or curly quotes).
SEARCH = re.compile(r"[*_][\"“]([^\"”*]+)[\"”][*_]")
LINK = re.compile(r"\[([^\]]*)\]\((https?://[^)\s]+)\)")
HOURS = re.compile(r"\((\d+(?:\.\d+)?)\s*h\)")


GREEK = {"α": "alpha", "β": "beta", "γ": "gamma", "η": "eta", "λ": "lambda", "μ": "mu", "σ": "sigma"}


def slug(text):
    text = "".join(GREEK.get(c, c) for c in text)
    s = re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")
    return s[:40].strip("-") or "section"


def kind_of(title):
    t = title.lower()
    if t.startswith("short on time"):
        return "short"
    if t.startswith("tick off"):
        return "tick"
    if t.startswith("check yourself"):
        return "check"
    if t.startswith("watch"):
        return "watch"
    if t.startswith(("session", "weekend", "set up")):
        return "hands"
    return "other"


def split_sections(lines):
    """Split a lesson body (after the title line) on '## ' headings outside code fences."""
    sections, cur, in_fence = [], {"title": "Overview", "lines": []}, False
    for line in lines:
        if FENCE.match(line):
            in_fence = not in_fence
        if not in_fence and line.startswith("## "):
            sections.append(cur)
            cur = {"title": line[3:].strip(), "lines": []}
        else:
            cur["lines"].append(line)
    sections.append(cur)
    return sections


def trim(lines):
    """Drop leading/trailing blank lines and horizontal rules."""
    lines = list(lines)
    while lines and lines[0].strip() in ("", "---"):
        lines.pop(0)
    while lines and lines[-1].strip() in ("", "---"):
        lines.pop()
    return lines


def h3_list(lines):
    out, in_fence = [], False
    for line in lines:
        if FENCE.match(line):
            in_fence = not in_fence
        elif not in_fence and line.startswith("### "):
            out.append(line[4:].strip())
    return out


def words(lines):
    return sum(len(l.split()) for l in lines)


def why_parts(lines):
    """Indexes (among the section's h3 headings) of 'Why ...' explanation parts, and their word count."""
    idx, count, k, in_fence, inside = [], 0, -1, False, False
    for line in lines:
        if FENCE.match(line):
            in_fence = not in_fence
        if not in_fence and line.startswith("### "):
            k += 1
            inside = line[4:].strip().lower().startswith("why")
            if inside:
                idx.append(k)
            continue
        if inside:
            count += len(line.split())
    return idx, count


def list_items(lines, pattern):
    """Collect top-level list items matching `pattern` (a compiled regex with the text in its last group).

    An item continues over indented lines, blank lines followed by indented lines, and lazy
    continuation lines (non-blank, straight after a non-blank line). The list ends at the first
    non-indented paragraph after a blank line: anything after it is not part of the list.
    """
    items, cur, started, prev_blank, in_fence = [], None, False, False, False
    for line in lines:
        if cur is not None and in_fence:
            cur["lines"].append(line)
            if FENCE.match(line):
                in_fence = False
            continue
        m = pattern.match(line)
        if m:
            cur = {"m": m, "lines": [m.group(m.lastindex)]}
            items.append(cur)
            started, prev_blank = True, False
            if FENCE.match(m.group(m.lastindex)):
                in_fence = True
            continue
        if not started:
            continue
        if not line.strip():
            prev_blank = True
            if cur is not None:
                cur["lines"].append("")
            continue
        if line.startswith((" ", "\t")):
            if cur is not None:
                cur["lines"].append(line)
                if FENCE.match(line):
                    in_fence = True
            prev_blank = False
            continue
        if not prev_blank and cur is not None and not line.startswith(("<", "#", "|", "---")):
            cur["lines"].append(line)  # lazy continuation
            continue
        break  # a new top-level block: the list is over
    return [{"m": it["m"], "md": "\n".join(dedent(it["lines"])).strip()} for it in items]


def dedent(lines):
    """Remove the common indentation of continuation lines (the first line has none)."""
    if len(lines) <= 1:
        return lines
    rest = [l for l in lines[1:] if l.strip()]
    pad = min((len(l) - len(l.lstrip(" ")) for l in rest), default=0)
    return [lines[0]] + [l[pad:] if l.strip() else "" for l in lines[1:]]


def parse_quiz(week, lines, report):
    """Pair the numbered questions in 'Check yourself' with the numbered answers in its <details> block."""
    before, inside, depth, seen = [], [], 0, False
    for line in lines:
        s = line.strip()
        if s.startswith("<details"):
            depth += 1
            seen = True
            continue
        if s.startswith("</details"):
            depth -= 1
            if depth == 0:
                break
            continue
        if s.startswith("<summary"):
            continue
        (inside if seen else before).append(line)
    qs = {int(i["m"].group(1)): i["md"] for i in list_items(before, NUM_ITEM)}
    ans = {int(i["m"].group(1)): i["md"] for i in list_items(inside, NUM_ITEM)}
    cards = []
    if not qs and ans:
        # Week 50 style: the answers start with the question in bold, e.g. "**Wear-out?** ...".
        for n, a in sorted(ans.items()):
            m = re.match(r"\*\*(.+?)\*\*\s*(.*)", a, re.S)
            if m:
                cards.append({"id": f"{week}-{n}", "n": n, "q": m.group(1), "a": m.group(2).strip() or a})
        report.append(f"week {week}: no numbered questions; used the {len(cards)} bold answer labels as questions")
        return cards
    for n in sorted(qs):
        if n in ans:
            cards.append({"id": f"{week}-{n}", "n": n, "q": qs[n], "a": ans[n]})
    if len(qs) != len(ans) or len(cards) != len(qs):
        report.append(f"week {week}: {len(qs)} questions, {len(ans)} answers, {len(cards)} paired")
    return cards


BULLET = re.compile(r"^[-*]\s+(.*)$")


def parse_watch(lines):
    out = []
    for i, item in enumerate(list_items(lines, BULLET)):
        text = item["md"]
        searches = [s.strip() for s in SEARCH.findall(text)]
        urls = [u for _, u in LINK.findall(text)]
        out.append({"i": i, "md": text, "searches": searches, "urls": urls})
    return out


def parse_short(lines):
    found = {}
    for item in list_items(lines, BULLET):
        m = re.match(r"\*\*(.+?)\*\*\s*:?\s*(.*)", item["md"], re.S)
        if not m:
            continue
        label = m.group(1).strip().rstrip(":").strip()
        text = m.group(2).strip()
        low = label.lower()
        key = "must" if low.startswith("must") else "phone" if "phone" in low else "skip" if "skip" in low else None
        if key:
            found[key] = {"label": label, "text": text}
    return found or None


STEP = re.compile(r"^(\d+)\.\s+(.*)$")
IMG_LINE = re.compile(r"^\s*!\[[^\]]*\]\([^)]*\)\s*$")
SENTENCE = re.compile(r"[.!](?:\s|$)")
QUESTION = re.compile(r"\?[\"*”)]*(\s*\(.*\))?$")


def parse_steps(lines):
    """The steps the reader lets you tick: top-level numbered items, outside 'Why ...' parts.

    Each step's id is a short hash of its text, so a tick stays with its step when steps
    around it are added or moved. Mirrors how app/markdown.js turns them into <ol><li>.
    """
    steps, cur, in_fence, why, prev_blank = [], None, False, False, False
    for line in lines:
        if FENCE.match(line):
            in_fence = not in_fence
            if cur is not None:
                cur.append(line)
            continue
        if in_fence:
            if cur is not None:
                cur.append(line)
            continue
        if line.startswith("### "):
            why = line[4:].strip().lower().startswith("why")
            cur = None
            continue
        m = STEP.match(line)
        if m and not why:
            cur = [m.group(2)]
            steps.append(cur)
            prev_blank = False
            continue
        if cur is None:
            continue
        if not line.strip():
            prev_blank = True
            cur.append("")
            continue
        if line.startswith((" ", "\t")) or not prev_blank:
            cur.append(line)
            prev_blank = False
            continue
        cur, prev_blank = None, False  # a new paragraph ends the list
    out, seen = [], {}
    for st in steps:
        # Picture lines don't count, so adding a screenshot to a step never resets its tick.
        text = " ".join(" ".join(l for l in st if not IMG_LINE.match(l)).split())
        h = hashlib.sha1(text.encode("utf-8")).hexdigest()[:8]
        seen[h] = seen.get(h, 0) + 1
        out.append({"id": h if seen[h] == 1 else f"{h}-{seen[h]}", "lines": st})
    return out


def step_load(lines):
    """Rough count of things a step asks for: sub-bullets plus sentences, ignoring code,
    'You should see' result lines and questions (lines ending in '?'). Used to flag crammed steps (see 'Long steps' in the output)."""
    bullets, text, in_fence = 0, [], False
    for line in lines:
        if FENCE.match(line):
            in_fence = not in_fence
            continue
        if in_fence:
            continue
        s = line.strip()
        if IMG_LINE.match(s):
            continue
        if QUESTION.search(s):  # a question to think about or ask someone isn't an action
            continue
        if re.match(r"^[-*]\s", s):
            bullets += 1
        if re.match(r"^(\*\*)?You should see", s) or s.startswith("|"):
            continue
        text.append(re.sub(r"`[^`]*`", "x", s))
    sentences = len(SENTENCE.findall(" ".join(text)))
    return bullets, sentences


LONG = []  # (week, section title, step number) of steps that look crammed


def parse_lesson(path: Path, report):
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    m = re.match(r"# Week (\d+): (.+)", lines[0])
    week, title = int(m.group(1)), m.group(2).strip()
    phase = int(re.match(r"\*\*Phase (\d+)", lines[2]).group(1))
    ticks, sections, quiz, watch, short, used = [], [], [], [], None, set()
    for sec in split_sections(lines[1:]):
        body = trim(sec["lines"])
        kind = kind_of(sec["title"]) if sec["title"] != "Overview" or sections else "intro"
        sid = slug(HOURS.sub("", sec["title"]))
        while sid in used:
            sid += "-2"
        used.add(sid)
        hrs = HOURS.search(sec["title"])
        why, why_words = why_parts(body)
        entry = {"id": sid, "title": sec["title"], "kind": kind, "md": "\n".join(body)}
        if hrs:
            entry["mins"] = round(float(hrs.group(1)) * 60)
        if why:
            entry["why"] = why
            entry["readMins"] = max(2, round(why_words / 180))
        if kind == "hands":
            steps = parse_steps(body)
            if steps:
                entry["steps"] = [st["id"] for st in steps]
                for k, st in enumerate(steps, 1):
                    bullets, sentences = step_load(st["lines"])
                    if bullets >= 2 or sentences >= 5:
                        LONG.append((week, sec["title"], k))
        if kind in ("intro", "other"):
            entry["readMins"] = max(2, round(words(body) / 180))
        if kind == "tick":
            ticks = [re.sub(r"\*\*(.+?)\*\*", r"\1", l[6:].strip()) for l in body if l.startswith("- [ ] ")]
        elif kind == "check" and not quiz:
            quiz = parse_quiz(week, body, report)
        elif kind == "watch":
            watch = parse_watch(body)
        elif kind == "short":
            short = parse_short(body)
        sections.append(entry)
    return {"week": week, "phase": phase, "title": title, "path": path.relative_to(ROOT).as_posix(),
            "ticks": ticks, "sections": sections, "quiz": quiz, "watch": watch, "short": short}


def raw_tick_count(path: Path):
    """Count '- [ ] ' lines under '## Tick off' with a plain line scan (no fence tracking), as a cross-check."""
    n, inside = 0, False
    for line in path.read_text(encoding="utf-8").splitlines():
        if line.startswith("## "):
            inside = line.strip() == "## Tick off"
        elif inside and line.startswith("- [ ] "):
            n += 1
    return n


def check(weeks, paths):
    """Fail loudly if a lesson didn't parse completely (for example a fence swallowing its tail)."""
    errors = []
    for w in weeks:
        kinds = [s["kind"] for s in w["sections"]]
        if "tick" not in kinds:
            errors.append(f"week {w['week']}: no 'Tick off' section found")
        if not w["ticks"]:
            errors.append(f"week {w['week']}: no tick items")
        short = w["short"] or {}
        missing = [k for k in ("must", "phone", "skip") if not (short.get(k) or {}).get("text")]
        if missing:
            errors.append(f"week {w['week']}: 'Short on time?' section missing or incomplete ({', '.join(missing)})")
        raw = raw_tick_count(paths[w["week"]])
        if raw != len(w["ticks"]):
            errors.append(f"week {w['week']}: parsed {len(w['ticks'])} ticks but the file has {raw} under '## Tick off'")
    return errors


# ---------- course files: one ZIP to download, and each week's files ----------
ZIP = ROOT / "downloads" / "Learning-Data.zip"
ZIP_DIRS = ["data", "solutions", "portfolio", "my_work"]
ZIP_FILES = ["requirements.txt"]
SKIP = re.compile(r"(^|/)(__pycache__|\.ipynb_checkpoints|\.venv|venv)(/|$)|\.pyc$|(^|/)\.DS_Store$")
START_HERE = """Data Skills Studio: course files
================================

This folder holds the files you work on in the course. The lessons
themselves are in the tracker:

    https://griminal01.github.io/Learning-Data/

Put this folder at Documents\\Learning-Data, so the paths in the lessons
match (for example Documents\\Learning-Data\\data\\week01).

  data\\        the practice data: CSVs, the SQLite database, exports
  my_work\\     save your own workbooks, reports and backups here
  solutions\\   worked answers (try the lesson first)
  portfolio\\   how to package each phase build for a portfolio

Back up your progress once a week: in the tracker, Settings > Export
backup, and keep the file in my_work.
"""


def course_files():
    """Every file that goes in the course ZIP, as repo-relative posix paths, sorted."""
    out = [f for f in ZIP_FILES if (ROOT / f).exists()]
    for d in ZIP_DIRS:
        for p in (ROOT / d).rglob("*"):
            rel = p.relative_to(ROOT).as_posix()
            if p.is_file() and not SKIP.search(rel):
                out.append(rel)
    return sorted(out)


def build_zip():
    """Write downloads/Learning-Data.zip: one top folder, Learning-Data/, so 'Extract All' into
    Documents gives Documents\\Learning-Data. Fixed timestamps make it byte-identical when nothing
    changed, so git only stores a new copy when the data does."""
    import io
    import zipfile
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as z:
        def add(name, data):
            info = zipfile.ZipInfo("Learning-Data/" + name, date_time=(2026, 1, 1, 0, 0, 0))
            info.compress_type = zipfile.ZIP_DEFLATED
            info.external_attr = 0o644 << 16
            z.writestr(info, data)
        add("START HERE.txt", START_HERE.replace("\n", "\r\n").encode("utf-8"))
        for rel in course_files():
            add(rel, (ROOT / rel).read_bytes())
    data = buf.getvalue()
    ZIP.parent.mkdir(exist_ok=True)
    if not ZIP.exists() or ZIP.read_bytes() != data:
        ZIP.write_bytes(data)
    return len(data)


def week_files(path: Path, all_files):
    """The data files a lesson mentions, by path ('data/csv/assets.csv', 'data/exports/work_orders/')
    or by file name ('assets.csv'). Folders come back as one entry with their file count."""
    text = path.read_text(encoding="utf-8")
    data_files = [f for f in all_files if f.startswith("data/")]
    by_name = {}
    for f in data_files:
        by_name.setdefault(f.rsplit("/", 1)[-1], []).append(f)
    found, folders = set(), set()
    for ref in re.findall(r"data/[A-Za-z0-9_./-]*[A-Za-z0-9_/]", text):
        ref = ref.rstrip("/.")
        if ref in data_files:
            found.add(ref)
        elif any(f.startswith(ref + "/") for f in data_files):
            folders.add(ref)
    for name, paths in by_name.items():
        if len(paths) == 1 and re.search(r"(?<![\w/.-])" + re.escape(name) + r"(?![\w-])", text):
            found.add(paths[0])
    found = {f for f in found if not any(f.startswith(d + "/") for d in folders)}
    out = [{"p": f, "kb": max(1, round((ROOT / f).stat().st_size / 1024))} for f in sorted(found)]
    for d in sorted(folders):
        inside = [f for f in data_files if f.startswith(d + "/")]
        out.append({"p": d + "/", "dir": True, "n": len(inside), "kb": round(sum((ROOT / f).stat().st_size for f in inside) / 1024)})
    return out


GLOSS = re.compile(r"^- \*\*(.+?)\*\*\s*(?:\(([^)]*)\))?\s*(\*\(match case\)\*)?\s*:\s*(.+)$")


def parse_glossary(path: Path):
    """course/glossary.md: '- **Term** (other, forms) *(match case)*: meaning' lines."""
    out = []
    for line in path.read_text(encoding="utf-8").splitlines():
        m = GLOSS.match(line.strip())
        if m:
            forms = [m.group(1)] + [f.strip() for f in (m.group(2) or "").split(",") if f.strip()]
            out.append({"t": m.group(1), "forms": forms, "cs": bool(m.group(3)), "md": m.group(4).strip()})
    return out


def stamp_sw():
    """Write a hash of every cached file into sw.js, so a deploy with any change gets a fresh cache."""
    h = hashlib.sha256()
    for rel in SHELL:
        p = ROOT / rel
        if p.exists():
            h.update(rel.encode())
            h.update(p.read_bytes())
    version = h.hexdigest()[:12]
    if SW.exists():
        sw = SW.read_text(encoding="utf-8")
        sw2 = re.sub(r'const VERSION = "[^"]*";', f'const VERSION = "{version}";', sw, count=1)
        if sw2 != sw:
            SW.write_text(sw2, encoding="utf-8")
    return version


def main():
    report = []
    files = sorted((ROOT / "course").glob("phase-*/week-*.md"))
    weeks, paths = [], {}
    for p in files:
        w = parse_lesson(p, report)
        weeks.append(w)
        paths[w["week"]] = p
    weeks.sort(key=lambda w: w["week"])
    assert [w["week"] for w in weeks] == list(range(1, len(weeks) + 1)), "week numbers must run 1..N with no gaps"
    errors = check(weeks, paths)
    if errors:
        print("Build FAILED, app/course-data.js not written:", file=sys.stderr)
        for e in errors:
            print("  " + e, file=sys.stderr)
        return 1
    all_files = course_files()
    for w in weeks:
        w["files"] = week_files(paths[w["week"]], all_files)
    zip_size = build_zip()
    setup_path = ROOT / "course" / "week-00-setup.md"
    setup = parse_lesson(setup_path, report) if setup_path.exists() else None
    if setup and not any(sec.get("steps") for sec in setup["sections"]):
        print("Build FAILED: course/week-00-setup.md has no numbered steps", file=sys.stderr)
        return 1
    data = json.dumps({"phases": PHASES, "weeks": weeks, "setup": setup,
                       "glossary": parse_glossary(ROOT / "course" / "glossary.md") if (ROOT / "course" / "glossary.md").exists() else [],
                       "images": sorted(p.relative_to(ROOT).as_posix() for p in (ROOT / "course" / "img").glob("*")
                                        if p.suffix.lower() in (".png", ".jpg", ".jpeg", ".webp")),
                       "zip": {"path": ZIP.relative_to(ROOT).as_posix(), "kb": round(zip_size / 1024)}}, ensure_ascii=False, separators=(",", ":"))
    # "</" is escaped so lesson text can never close the <script> element early.
    data = data.replace("</", "<\\/")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text("/* Generated by tools/build_tracker.py from course/. Do not edit by hand. */\n"
                   f"window.COURSE_DATA = {data};\n", encoding="utf-8")
    version = stamp_sw()

    n_ticks = sum(len(w["ticks"]) for w in weeks)
    n_cards = sum(len(w["quiz"]) for w in weeks)
    n_watch = sum(len(w["watch"]) for w in weeks)
    n_search = sum(1 for w in weeks for x in w["watch"] if x["searches"])
    n_short = sum(1 for w in weeks if w["short"])
    size = OUT.stat().st_size
    print(f"{OUT.relative_to(ROOT).as_posix()} written: {len(weeks)} weeks, {n_ticks} tick items, "
          f"{n_cards} quiz cards, {n_watch} watch items ({n_search} with a search phrase), "
          f"{n_short} 'Short on time?' sections, {size / 1024:.0f} KB")
    print(f"sw.js cache version {version}")
    print(f"{ZIP.relative_to(ROOT).as_posix()}: {len(all_files)} files, {zip_size / 1048576:.1f} MB; "
          f"{sum(1 for w in weeks if w['files'])} weeks list their files")
    raw_total = sum(raw_tick_count(p) for p in paths.values())
    print(f"tick cross-check: {n_ticks} parsed = {raw_total} '- [ ] ' lines under '## Tick off'")
    no_check = [w["week"] for w in weeks if not w["quiz"]]
    if no_check:
        print("No quiz cards in weeks: " + ", ".join(map(str, no_check)))
    n_steps = sum(len(s.get("steps", [])) for w in weeks for s in w["sections"])
    print(f"{n_steps} tickable steps" + (f", plus {sum(len(s.get('steps', [])) for s in setup['sections'])} in Week 0: Set up" if setup else ""))
    if LONG:
        per = {}
        for wk, _, _ in LONG:
            per[wk] = per.get(wk, 0) + 1
        print(f"Long steps (2+ sub-bullets or 5+ sentences), {len(LONG)} in all. Split them into one action each:")
        print("  " + ", ".join(f"W{wk} ({n})" for wk, n in sorted(per.items())))
        if "--long" in sys.argv:
            for wk, title, k in LONG:
                print(f"  week {wk}, {title}, step {k}")
    if report:
        print("Question/answer notes:")
        for r in report:
            print("  " + r)
    return 0


if __name__ == "__main__":
    sys.exit(main())
