# Week 27: Core Python 2, functions, files, errors and modules

**Phase 4 · Python for data** · Mon 3 May – Sun 9 May 2027 · about 5 hours

Functions are the building blocks of every useful script. This week you write your own, read data files, handle bad data without crashing, and organise code into modules. It's the same idea as subroutines and AOIs on a PLC.

**By Sunday you'll be able to:**

- write functions with arguments, defaults, return values and docstrings
- read and write CSV files with `csv` and `pathlib`
- handle errors with `try / except`
- import from the standard library and from your own module

---

## Session 1 (1.5 h): Functions

### Do it

```python
def mtbf_hours(operating_hours, failures):
    """Mean time between failures. Returns None when there were no failures."""
    if failures == 0:
        return None
    return operating_hours / failures


def availability(mtbf, mttr):
    """Inherent availability as a fraction (0-1)."""
    return mtbf / (mtbf + mttr)


print(round(mtbf_hours(17520, 37)))           # 474
print(f"{availability(474, 0.76):.2%}")       # 99.84%
print(mtbf_hours(17520, 0))                   # None
```

**Defaults and keyword arguments:**

```python
def compliance(on_time, due, as_percent=True):
    if due == 0:
        return None
    value = on_time / due
    return round(value * 100, 1) if as_percent else value

compliance(353, 434)                     # 81.3
compliance(353, 434, as_percent=False)   # 0.813...
```

### Why it works

A function takes inputs, does one job, and **returns** an output. Name it after what it returns (`mtbf_hours`, not `do_calc`). The triple-quoted *docstring* appears when you hover over the function in VS Code, so write one for every function.

**`print` vs `return`:** `print` shows something on screen. `return` hands a value back so other code can use it. A function that only prints is a dead end.

---

## Session 2 (1.5 h): Files and errors

### Do it

```python
import csv
from pathlib import Path

DATA = Path("..") / "data"          # adjust if your notebook lives elsewhere

def read_breakdowns(path):
    """Count reactive work orders per asset."""
    counts = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):           # each row is a dictionary
            if row["wo_type"] == "Reactive":
                counts[row["asset_id"]] = counts.get(row["asset_id"], 0) + 1
    return counts

counts = read_breakdowns(DATA / "csv" / "work_orders.csv")
worst = sorted(counts.items(), key=lambda kv: kv[1], reverse=True)[:5]
print(worst)
```

You should get `LD-PPK-005` 37, `LD-PPK-003` 33, `LD-PPK-006` 30, `LD-PPK-004` 23, `LD-EOL-001` 20. That's the same as your SQL in Week 11.

**Errors without crashing:**

```python
for raw in ["1.5", "2h", "", "0.75"]:
    try:
        print(raw, "->", float(raw))
    except ValueError:
        print(raw, "-> not a number, skipped")
```

**Writing a file:**

```python
out = Path("worst_assets.csv")
with open(out, "w", newline="", encoding="utf-8") as f:
    w = csv.writer(f)
    w.writerow(["asset_id", "breakdowns"])
    w.writerows(worst)
```

### Why it works

- `with open(...) as f:` closes the file automatically, even if an error happens.
- `pathlib.Path` builds file paths that work on any OS. `/` joins parts, so there's no fighting with backslashes.
- `try / except` is a fault handler: catch the **specific** error you expect (`ValueError`), never a bare `except:` that hides real bugs.
- `sorted(..., key=lambda kv: kv[1])` sorts by the second item. A `lambda` is a tiny one-line function.

---

## Weekend (2 h): Your first module

1. Create `my_work\reliability.py` containing `mtbf_hours`, `availability`, `compliance`, and a new function `failure_rate(mtbf)` that returns failures per hour.
2. Add this at the bottom:

   ```python
   if __name__ == "__main__":
       print(mtbf_hours(17520, 37))
   ```

   Now the file is both a module you can import *and* a script you can run.
3. In a notebook in the same folder:

   ```python
   from reliability import mtbf_hours, availability
   ```

4. **Exercise:** write `read_pm_compliance(path, zone_code)`, which reads `work_orders.csv` and `assets.csv` with `csv.DictReader` and returns PM compliance % for one zone. Check: `PPK` gives about **66.4 %** for all time. (It's fiddly in plain Python. Next week pandas does it in three lines, and that's the point.)
5. Kaggle Learn Python lessons 4–7 (functions, booleans, lists, loops, strings and dictionaries).

---

## Watch

- **Corey Schafer**: *"Corey Schafer Python functions"*, *"Corey Schafer Python file objects"* and *"Corey Schafer Python try except"*.
- **Automate the Boring Stuff**: chapters 3 (functions), 9 (files) and 16 (CSV).

---

## Check yourself

1. What does a function return if it has no `return` statement?
2. Why catch `ValueError` instead of using a bare `except:`?
3. What does `if __name__ == "__main__":` do?
4. Write a function `days_late(due, done)` that takes two `date` objects and returns the days late (0 if on time).

<details>
<summary><strong>Answers</strong></summary>

1. `None`.
2. A bare except also catches typos (`NameError`), Ctrl+C, and every other bug, so real problems disappear silently. Catch only what you expect, and let the rest crash loudly so you can fix them.
3. The code under it runs only when the file is executed directly, not when it's imported as a module.
4. ```python
   from datetime import date
   def days_late(due, done):
       return max(0, (done - due).days)
   days_late(date(2026, 6, 1), date(2026, 6, 4))   # 3
   ```

</details>

---

## Tick off

- [ ] Functions with docstrings, defaults and returns
- [ ] Read and wrote CSVs with `pathlib` + `csv`
- [ ] `try / except ValueError` used on messy values
- [ ] `reliability.py` module imported into a notebook
- [ ] Kaggle Python course finished
