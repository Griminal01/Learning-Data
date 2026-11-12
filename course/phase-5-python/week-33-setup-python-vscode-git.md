# Week 33: Setup, Python, VS Code, virtual environments, Jupyter and Git

**Phase 5 · Python for data** · Mon 14 Jun – Sun 20 Jun 2027 · about 5 hours

**Phase 5 goal:** a task that takes you an hour a week in Excel runs from a **single command**.

Python is where you go when Excel and Power BI run out: big sensor files, automation, statistics, machine learning. It's free, and it's the most used language in data work. This week is all setup. It's a bit fiddly, but you only do it once.

**By Sunday you'll have:**

- Python 3.12+ and VS Code installed and working together
- a **virtual environment** for this course with pandas and friends
- run your first notebook and your first script
- Git set up and this repo **cloned**, committing your own work

---

## Session 1 (1.5 h): Install

### Do it

1. **Python**: download the latest 3.x Windows installer from [python.org/downloads](https://www.python.org/downloads/). On the first installer screen, **tick "Add python.exe to PATH"**, then Install Now.
2. Open **PowerShell** (Start → type PowerShell) and check:

   ```powershell
   python --version
   ```

   You should see `Python 3.1x.x`. If Windows opens the Microsoft Store instead, go to Settings → Apps → Advanced app settings → App execution aliases, and turn off the two *python* aliases.
3. **VS Code**: install from [code.visualstudio.com](https://code.visualstudio.com). In VS Code → Extensions (`Ctrl+Shift+X`), install **Python** and **Jupyter** (both by Microsoft).
4. **Git**: install from [git-scm.com](https://git-scm.com/download/win), keeping the defaults. Then in PowerShell:

   ```powershell
   git config --global user.name "Your Name"            # your own name
   git config --global user.email "you@example.com"     # the email on your GitHub account
   ```

5. **Clone this repo** (instead of the ZIP you used in Phase 1):

   ```powershell
   cd $HOME\Documents
   git clone https://github.com/griminal01/learning-data.git
   cd learning-data
   code .
   ```

   VS Code opens with the whole course in the sidebar.

---

## Session 2 (1.5 h): Virtual environment and first code

### Do it

1. In VS Code: Terminal → New Terminal (it opens in the repo folder). Create and activate a virtual environment:

   ```powershell
   python -m venv .venv
   .\.venv\Scripts\Activate.ps1
   ```

   If PowerShell blocks the script, run `Set-ExecutionPolicy -Scope CurrentUser RemoteSigned` once, then try again. Your prompt now starts with `(.venv)`.
2. Install the course libraries:

   ```powershell
   pip install -r requirements.txt
   ```

3. **Regenerate the practice data** (checking that everything works):

   ```powershell
   python data\generate_data.py
   ```

   It should print `assets=292 pm_tasks=475 work_orders=11902 downtime_events=6177 …`.
4. **First script**: create `my_work\hello.py`:

   ```python
   name = "Line D"
   assets = 292
   print(f"{name} has {assets} assets")
   ```

   Run it with the ▶ button at the top right, or `python my_work\hello.py`.
5. **First notebook.** In VS Code, create `my_work\week33.ipynb`. VS Code opens the notebook editor.
6. At the top right, click **Select Kernel** → *Python Environments* → `.venv`.
7. In the first cell, type:

   ```python
   import pandas as pd
   wo = pd.read_csv("../data/csv/work_orders.csv")
   wo.head()
   ```

8. Press `Shift+Enter`.

   **You should see:** a table of the first five work orders. **That's pandas.** You'll spend Weeks 36–38 on it.

### Why it works

- A **virtual environment** is a private copy of Python for one project. Libraries installed in it don't clash with other projects, and `requirements.txt` lets anyone (or future you) rebuild it exactly.
- **Scripts** (`.py`) are for things you'll run repeatedly: reports and automation. **Notebooks** (`.ipynb`) are for exploring: run a cell, look, adjust. You'll use both.
- `.venv` is listed in `.gitignore`, so it never gets committed. Only `requirements.txt` does.

---

## Weekend (2 h): Git workflow

### Do it

1. Make a branch for your own work so you never clash with course updates:

   ```powershell
   git checkout -b my-work
   ```

2. Commit your hello script and notebook:

   ```powershell
   git add my_work
   git commit -m "Week 33: setup, first script and notebook"
   ```

3. **Your own portfolio repo**: on GitHub, create a new **public** repository called something like `maintenance-analytics-portfolio`. You'll copy your best work from each phase into it (Phase 1 workbook, Phase 2 SQL, Phase 3 PBIX) with a good README for each. See `portfolio/README.md` in this repo for the template.
4. In VS Code, try the **Source Control** panel (`Ctrl+Shift+G`). It does the same as the commands above with buttons. Use whichever you prefer.
5. Learn these 6 Git commands; they're 95 % of daily use:

   | Command | Does |
   |---|---|
   | `git status` | what's changed |
   | `git add <files>` | stage changes |
   | `git commit -m "msg"` | save a snapshot |
   | `git push` | upload to GitHub |
   | `git pull` | download changes |
   | `git log --oneline` | history |

---

## Watch

- **Corey Schafer** (YouTube): *"Corey Schafer VS Code Python setup Windows"*.
- **Corey Schafer**: *"Corey Schafer Python venv Windows"*.
- **freeCodeCamp**: *"freeCodeCamp Git and GitHub for beginners crash course"*.
- **VS Code docs**: search *"Python in Visual Studio Code tutorial"*.

---

## Check yourself

1. Why use a virtual environment instead of installing pandas for the whole PC?
2. What's the difference between a `.py` script and a `.ipynb` notebook, and when would you use each?
3. You open a new terminal and `import pandas` fails. What did you forget?
4. Why shouldn't `.venv` be committed to Git?

<details>
<summary><strong>Answers</strong></summary>

1. Different projects need different library versions. A venv keeps each project's set separate and reproducible via `requirements.txt`, and it can't break anything else on the PC.
2. A script runs top to bottom, for repeatable jobs and automation. A notebook runs cell by cell with results inline, for exploring and explaining. Explore in a notebook, then move the working code into a script.
3. Activating the venv (`.\.venv\Scripts\Activate.ps1`), or selecting the `.venv` interpreter in VS Code (`Ctrl+Shift+P` → *Python: Select Interpreter*).
4. It's large, Windows-specific, and rebuilt in one command from `requirements.txt`. Commit the recipe, not the kitchen.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 1 steps 1 to 5 (Python with PATH ticked, VS Code with both extensions, Git configured, repo cloned) and Session 2 steps 1 to 8 (`.venv`, `pip install -r requirements.txt`, `generate_data.py` printing the expected counts, first script, first notebook), then weekend steps 1 and 2 to branch and make your first commit.
- **On your phone (10 min a day):** Watch the Corey Schafer VS Code setup and venv videos and the freeCodeCamp Git crash course, read the "Why it works" notes on venvs, scripts and notebooks, and learn the six Git commands in the weekend table. Creating your public portfolio repository on GitHub (weekend step 3) also works in a phone browser.
- **Safe to skip this week:** Weekend step 4 (trying the Source Control panel) and the VS Code Python tutorial can be skipped; the command line does the same job.

---

## Tick off

- [ ] Python, VS Code (with Python and Jupyter extensions) and Git installed
- [ ] Repo cloned, `.venv` created, requirements installed
- [ ] `generate_data.py` runs and prints the expected counts
- [ ] First script and first notebook run
- [ ] Personal portfolio repo created on GitHub
