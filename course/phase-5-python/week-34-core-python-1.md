# Week 34: Core Python 1, values, lists, dictionaries, loops and decisions

**Phase 5 · Python for data** · Mon 21 Jun – Sun 27 Jun 2027 · about 5 hours

Before pandas, you need enough plain Python to read and write simple code with confidence. Good news: if you can follow ladder logic, you can follow Python. It's just written as text, top to bottom.

**By Sunday you'll be able to:**

- use numbers, strings, booleans and f-strings
- store collections in **lists** and **dictionaries**
- loop with `for`, decide with `if / elif / else`
- write a list comprehension

**Work in:** a notebook `my_work\week26.ipynb`. Type everything; don't copy-paste.

---

## Session 1 (1.5 h): Values and lists

### Do it

```python
# Numbers and strings
asset = "LD-PPK-005"
failures = 37
operating_hours = 17520
mtbf = operating_hours / failures
print(asset, mtbf)
print(f"{asset} MTBF is {mtbf:.0f} hours")      # f-string, formatted to 0 decimals

# Strings have methods
print(asset.split("-"))        # ['LD', 'PPK', '005']
zone_code = asset.split("-")[1]
print(zone_code.lower(), len(asset), asset.startswith("LD"))

# Booleans
is_critical = True
print(failures > 20 and is_critical)
```

```python
# Lists: an ordered collection
downtime_mins = [12, 45, 3, 180, 7, 22, 60]
print(len(downtime_mins), sum(downtime_mins), max(downtime_mins))   # 7 329 180
print(downtime_mins[0], downtime_mins[-1])    # first and last
print(downtime_mins[1:3])                     # slice: items 1 and 2
downtime_mins.append(15)
downtime_mins.sort(reverse=True)
print(downtime_mins)
```

### Why it works

- `=` **assigns** (puts a value in a named box). `==` **compares**.
- Python counts from **0**: `downtime_mins[0]` is the first item, and `[-1]` is the last.
- Slices `[a:b]` include `a` but stop *before* `b`, the same "half-open" idea as the date ranges in SQL.
- f-strings (`f"...{value:.1f}..."`) are the neatest way to build text. `:.0f` means 0 decimals, `:.1%` means a percentage with 1 decimal, and `:,` adds thousands commas.

---

## Session 2 (1.5 h): Dictionaries, loops and if

### Do it

```python
# Dictionary: look up a value by a key (like XLOOKUP on a two-column table)
pm_frequency = {
    "Grease motor bearings": 91,
    "Conveyor belt tension & tracking check": 14,
    "Replace sealing jaws": 182,
}
print(pm_frequency["Replace sealing jaws"])
pm_frequency["Pneumatic leak check"] = 28        # add a new key

# Loop over a dictionary
for task, days in pm_frequency.items():
    if days <= 14:
        label = "weekly-ish"
    elif days <= 91:
        label = "monthly+"
    else:
        label = "6-monthly+"
    print(f"{task:45} every {days:>3} days  ({label})")
```

```python
# Loop with a running total (like an accumulator rung)
total = 0
long_stops = []
for m in [12, 45, 3, 180, 7, 22, 60]:
    total += m
    if m >= 30:
        long_stops.append(m)
print(total, long_stops)     # 329 [45, 180, 60]

# The same filter as a one-line list comprehension
long_stops = [m for m in [12, 45, 3, 180, 7, 22, 60] if m >= 30]
```

### Why it works

**Indentation is the syntax.** Everything indented under `for` or `if` belongs to it, so there are no `END IF`s. VS Code indents automatically after a `:`. Use 4 spaces.

Dictionaries are everywhere in Python data work: a row of data, a config file, a JSON response from an API. They're all key → value.

---

## Weekend practice (2 h)

In `week26.ipynb`, write code for each of these:

1. Given `codes = ["LD-PPK-005", "LD-EOL-001", "LD-FLK-010", "LD-PPK-003"]`, print only the packing (`PPK`) assets.
2. Count how many assets per zone code are in that list, using a dictionary. (Hint: `counts[z] = counts.get(z, 0) + 1`.)
3. Given `due = 14` and `done = [10, 14, 15, 30, 13]` (days after the last PM), produce a list of `"On time"` / `"Late"` labels.
4. Work out PM compliance % from question 3's labels.
5. **FizzBuzz, maintenance edition:** loop over days 1 to 28. Print "Weekly PM" on multiples of 7, "Fortnightly PM" on multiples of 14 (instead of Weekly), and nothing otherwise.
6. Write a dictionary describing one asset (`id`, `name`, `zone`, `criticality`, `failures`), then print a one-line summary of it with an f-string.

Also do the **Kaggle Learn: Python** course, lessons 1–3: [kaggle.com/learn/python](https://www.kaggle.com/learn/python). It's free and runs in the browser.

---

## Watch

- **Corey Schafer**: *"Corey Schafer Python tutorial for beginners"*. Watch episodes 2–7 (strings, numbers, lists, dicts, conditionals, loops).
- **Automate the Boring Stuff with Python** (free online): [automatetheboringstuff.com](https://automatetheboringstuff.com). Read chapters 1, 2 and 4.

---

## Check yourself

1. What does `asset.split("-")[2]` return for `"LD-PPK-005"`?
2. What's the difference between a list and a dictionary?
3. What's wrong here?
   ```python
   for m in downtime_mins:
   if m > 30:
       print(m)
   ```
4. Rewrite as a list comprehension: a list of every stop over 10 minutes, converted to hours.

<details>
<summary><strong>Answers</strong></summary>

1. `'005'`, as a string, not a number. `int("005")` gives 5.
2. A list is ordered and accessed by **position** (`x[0]`). A dictionary is accessed by **key** (`x["Replace sealing jaws"]`). Use a dictionary when you look things up by name.
3. The `if` must be indented under the `for`, and the `print` indented under the `if`. Python raises `IndentationError`.
4. `hours = [m / 60 for m in downtime_mins if m > 10]`

**Weekend answers:**

1. `[c for c in codes if c.split("-")[1] == "PPK"]`
2. ```python
   counts = {}
   for c in codes:
       z = c.split("-")[1]
       counts[z] = counts.get(z, 0) + 1
   ```
3. `["On time" if d <= due else "Late" for d in done]`, which gives On time, On time, Late, Late, On time
4. `labels.count("On time") / len(labels)`, which gives 60 %
5. ```python
   for day in range(1, 29):
       if day % 14 == 0:
           print(day, "Fortnightly PM")
       elif day % 7 == 0:
           print(day, "Weekly PM")
   ```
   The fortnightly check must come first, because 14 is also a multiple of 7.

More worked examples are in [`solutions/phase-5-python/w34_w35_core_python.py`](../../solutions/phase-5-python/w34_w35_core_python.py).

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Type the Session 1 and Session 2 code blocks into your notebook and run them, then do all six weekend exercises. Typing it yourself is the point, so don't paste.
- **On your phone (10 min a day):** Watch Corey Schafer's beginner episodes 2 to 7, read *Automate the Boring Stuff* chapters 1, 2 and 4 and both "Why it works" parts (indentation, counting from 0, half-open slices), and answer Check yourself in your head.
- **Safe to skip this week:** Kaggle Learn Python lessons 1 to 3 can be pushed back a week if you're short on time, because the weekend exercises cover the same ground.

---

## Tick off

- [ ] Comfortable with strings, f-strings, lists and dicts
- [ ] `for` + `if/elif/else`, with correct indentation
- [ ] List comprehension written
- [ ] All six weekend exercises done
- [ ] Kaggle Python lessons 1–3
