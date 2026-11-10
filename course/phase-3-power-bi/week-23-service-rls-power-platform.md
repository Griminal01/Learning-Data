# Week 23: Power BI Service, sharing, refresh and row-level security

**Phase 3 · Power BI** · Mon 5 Apr – Sun 11 Apr 2027 · about 5 hours

A `.pbix` on your PC helps nobody else. The **Power BI Service** (app.powerbi.com) is where reports get published, refreshed and shared. This week you learn how that works, how **row-level security** keeps people to their own data, and where Power Automate and Power Apps fit.

> **Important: account limits.** The Power BI Service needs a **work or school Microsoft account**. A personal Gmail or Outlook.com address can't sign up. So:
> - Everything in Session 1 that needs the Service is **read and watch**, or do it later with your work account *if IT allows*.
> - Row-level security can be built and **tested fully in Desktop** (Session 2), with no account needed.
> - Never publish practice reports into your employer's tenant without asking.

**By Sunday you'll be able to:**

- explain workspaces, semantic models, reports, dashboards and apps
- describe scheduled refresh and when a **gateway** is needed
- build and test **row-level security** (RLS) roles in Desktop
- explain the licensing basics (Free, Pro, Premium Per User, Fabric capacity)
- know what Power Automate and Power Apps could do for a maintenance team

---

## Session 1 (1.5 h): How the Service works

### Learn

Work through the Microsoft Learn PL-300 modules *"Create and manage workspaces in Power BI"* and *"Manage semantic models in Power BI"* (search those titles). Then write your own one-line definitions:

| Item | What it is |
|---|---|
| **Workspace** | a shared folder for content, with roles (Admin, Member, Contributor, Viewer) |
| **Semantic model** (was *dataset*) | the published model: tables, relationships, measures |
| **Report** | the pages and visuals built on a semantic model |
| **Dashboard** | a single canvas of pinned tiles from reports (less used now) |
| **App** | a packaged, read-only bundle of reports for an audience, which is how you share with a team properly |

### Refresh

- Cloud sources (SharePoint, SQL in Azure) refresh directly.
- **On-premises** sources (a file on a PC, a local SQL Server, a CMMS database on a plant server) need an **on-premises data gateway**: a small service on a machine that's always on, which the Service talks through. Your IT department owns this.
- Pro licences allow 8 scheduled refreshes a day.

**Practical tip:** if the source files live in a **SharePoint/OneDrive** folder (Get Data → SharePoint folder), no gateway is needed. That's often the easiest route at a manufacturing site.

### Licensing (check current details on Microsoft's site; they change)

- **Free**: you can build and publish to *My Workspace* only, with no sharing.
- **Pro**: per user, needed to share and to consume shared content.
- **Premium Per User / Fabric capacity**: larger models, more refreshes, and capacity-based sharing.

---

## Session 2 (1.5 h): Row-level security in Desktop

The scenario: zone team leaders should only see their own zone.

### Do it

1. Modeling → **Manage roles** → New role `Zone Lead`.
2. Select the `Zones` table and add a DAX filter:

   ```dax
   [zone] = "Primary Packing"
   ```

3. Make roles for two more zones the same way.
4. Modeling → **View as** → tick `Zone Lead`. The whole report now shows only Primary Packing: Pareto, compliance, everything. The filter flows down the relationships, just as in Week 16.
5. **Dynamic RLS** (the scalable version):
   - Create a table `ZoneAccess` with columns `email` and `zone_code` (Enter Data), with rows like `lead.packing@example.com, PPK`.
   - Relate `ZoneAccess[zone_code]` → `Zones[zone_code]`. (You may need the filter to flow *from* ZoneAccess to Zones; set that relationship's direction accordingly, and tick *Apply security filter in both directions* if required.)
   - Role `By User`, with a filter on `ZoneAccess`: `[email] = USERPRINCIPALNAME()`.
   - **View as** → `By User` + *Other user* `lead.packing@example.com`.

### Why it works

RLS adds a filter to the model **before any measure runs**, for that user. Measures don't need changing. Combined with relationships, one filter on a small dimension secures every fact. One report and one model then serve every team.

**Caution:** RLS restricts *viewers*. Workspace Admins, Members and Contributors bypass it. Share with zone leads as *Viewers* or through an *App*.

---

## Weekend (2 h): Power Automate and Power Apps

These are in the same Microsoft Power Platform family, and they're high value for a maintenance team. Like the Service, they need a work account, so this weekend is about **designing**, not building.

1. Watch: **Reza Dorrani** (YouTube), *"Reza Dorrani Power Apps beginner"* and *"Reza Dorrani Power Automate beginner"*. He's the best teacher for these tools.
2. **Design a Power Automate flow** on paper: *"When the weekly PM export lands in SharePoint, refresh the Power BI semantic model, then email the zone leads a link plus their overdue PM count."* List the trigger, the actions, and which connectors would be needed.
3. **Design a Power App** on paper: a phone form for an operator's daily check (metric for asset, OK/Not OK, comment, photo) that writes to a SharePoint list, which Power BI then reads. Sketch 3 screens.
4. Write a half-page proposal: *"What I'd automate first on Line D, and what it would save."* Keep it. It's a good conversation starter with your manager once you've finished Phase 3.

---

## Watch

- **Guy in a Cube**: *"Guy in a Cube row level security"* and *"Guy in a Cube on-premises data gateway"*.
- **Microsoft Learn**: PL-300 module *"Implement row-level security"* (search the title).

---

## Check yourself

1. Why does a report sourced from CSVs on your PC need a gateway to refresh in the Service?
2. Where do you put the RLS filter: on the fact table or on the dimension?
3. A zone lead added as a workspace *Member* can see all zones. Why?
4. What's the difference between sharing a report and publishing an app?

<details>
<summary><strong>Answers</strong></summary>

1. The Service runs in Microsoft's cloud and can't reach files on your PC. The gateway is the bridge. Moving the files to SharePoint/OneDrive avoids needing one.
2. On the **dimension** (Zones), which is small and filters every related fact through the relationships. Filtering each fact separately is slower and easy to get wrong.
3. RLS only applies to Viewers. Members, Contributors and Admins can edit the model, so security isn't enforced for them.
4. Sharing gives access to one item. An **app** bundles several reports with navigation, has its own audience list, and lets you update content without disturbing users until you republish. It's the cleaner choice for a team.

</details>

---

## Short on time?

- **Must do (about 90 min at a PC):** Session 2 steps 1 to 5 in Desktop: static `Zone Lead` roles tested with *View as*, then dynamic RLS with `ZoneAccess` and `USERPRINCIPALNAME()` tested as `lead.packing@example.com`. Everything else this week works away from the PC.
- **On your phone (10 min a day):** Session 1 is reading: work through the two PL-300 workspace and semantic model modules and write your one-line definitions. Watch the Reza Dorrani Power Apps and Power Automate videos and the Guy in a Cube RLS video, then do the weekend flow design, the 3-screen app sketch and the half-page proposal on paper.
- **Safe to skip this week:** The PL-300 *Implement row-level security* module and the Guy in a Cube gateway video can wait, and the licensing notes only need a quick skim.

---

## Tick off

- [ ] Can explain workspace, semantic model, report and app
- [ ] Know when a gateway is needed, and the SharePoint workaround
- [ ] Static RLS roles tested with *View as*
- [ ] Dynamic RLS with `USERPRINCIPALNAME()` tested
- [ ] Power Automate flow and Power App designed on paper, plus a half-page proposal
