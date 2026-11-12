# Lesson pictures

The lessons already point at these files. Each picture shows up in the tracker as soon as its file is here and `python tools/build_tracker.py` has been run. Until then, the lesson reads as normal with no gap.

**How to take one:** set Excel to its normal light theme and maximise the window. Press `Win+Shift+S`, drag a box round just the part described, then paste into Paint and save it as a PNG with the exact file name below. Crop tight: a picture should show one thing. Use the course data, never anything from work.

| File | Lesson and step | What to capture |
|---|---|---|
| `w1-freeze-panes.png` | Week 1, Session 1, step 6 | The **View** tab with the **Freeze Panes** drop-down open, showing its three options |
| `w1-status-bar.png` | Week 1, Session 1, step 11 | Column I selected, and the bottom-right of the window showing Average, Count, Sum (and Min, Max) |
| `w1-filter-list.png` | Week 1, Session 1, step 15 | The **Category** filter list open, with only *Breakdown* ticked |
| `w1-fill-handle.png` | Week 1, Session 2, step 9 | A close-up of `J2` selected, so the small square at its bottom-right corner is easy to see. Zoom in (`Ctrl` + mouse wheel) first |
| `w2-data-validation.png` | Week 2, Session 2, step 7 | The **Data Validation** window: Allow = *List*, Source = `Days,Nights` |
| `w2-chart-elements.png` | Week 2, weekend, step 6 | A chart with the **+** button clicked and *Data Labels* ticked in the list |
| `w3-create-table.png` | Week 3, Session 1, step 7 | The **Create Table** window after `Ctrl+T`, with *My table has headers* ticked |
| `w3-table-name.png` | Week 3, Session 1, step 8 | The left end of the **Table Design** tab, with the Table Name box showing `tblWO` |
| `w4-cf-formula-rule.png` | Week 4, weekend, steps 2–3 | The **New Formatting Rule** window with *Use a formula to determine which cells to format* selected and the formula typed in |
| `w7-applied-steps.png` | Week 7, Session 1, step 7 | The whole Power Query editor, so the **Applied Steps** list on the right is visible |

To add a picture to another step, put a line like this under the step, indented to line up with its text, then rebuild:

```
   ![What the picture shows](../img/your-file.png)
```

Picture lines don't change a step's tick, so ticks stay where they are.
