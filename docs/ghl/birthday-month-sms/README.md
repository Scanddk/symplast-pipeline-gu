# Birthday Month SMS: GHL implementation plan

Sends each eligible patient one SMS at **9:00 AM (sub-account timezone) on the 1st of their birth month**, every year. Patients with DOB `1980-01-01` (the EHR placeholder) or with no valid DOB are excluded.

Files in this folder:

| File | Purpose |
| --- | --- |
| `README.md` | This plan |
| `custom-code.js` | The JavaScript to paste into the one Custom Code step |
| `check.cjs` | Edge-case checks for that code. Run `node docs/ghl/birthday-month-sms/check.cjs`. 28 cases, all passing |

---

## 1. Recommendation

Build **Option A**: two workflows with **one Custom Code step**. Everything else is native: triggers, If/Else, a recurring-schedule Wait, Go To, Send SMS, and Update Contact Field.

Each patient sits in a long-running per-contact loop:

1. The code step reads the DOB and returns the birth month, whether the patient is eligible, and whether they already got this year's SMS.
2. The patient waits on a native **Wait → A recurring schedule → Yearly** step pinned to `<birth month> 1 at 9:00 AM`. This Wait runs in the workflow's timezone.
3. On waking, the code runs again, the SMS goes out, the year is recorded, and the loop goes back to waiting for next year.

**Option B** is fully native and uses the Birthday Reminder trigger's `Day Is` / `Month Is` filters. It's simpler, but GHL's own docs disagree about what those filters do. Don't build it unless the sandbox test in §8 passes. The next 1st of the month is **Nov 1, 2026**, so you can run that test in two days.

## 2. Validation against current GHL capabilities

Checked against the HighLevel help center on 2026-10-30 (sources in §10).

### Native Birthday Reminder trigger: why it isn't the primary build

| Requirement | Birthday Reminder trigger | Verdict |
| --- | --- | --- |
| Send on the 1st of the birth month | By default it fires on the **actual birthday**. `Before/After Number of Days` is one fixed offset for every contact, so it can't map a birthday on day N to the 1st. `Day Is` / `Month Is` might work, but one GHL article says `Day Is` is a *day of the month* and another says it's a *weekday*. | Not reliable without a test |
| 9:00 / 10:00 AM | The trigger runs daily at **8:00 AM** in the account timezone. You'd need a Wait with an Advanced Window afterwards. | Possible with an extra Wait |
| Exclude `1980-01-01` only | No trigger filter for this. You'd need an If/Else on DOB. The help center doesn't list the date operators. | Needs an extra step |
| Missing DOB excluded | Empty or invalid DOBs are skipped automatically | ✅ |
| Once a year / existing contacts | It scans all contacts daily, so yes | ✅ |

The **Custom Date Reminder** trigger was also ruled out. Its help article contradicts itself on whether "Match on Year" makes it recur yearly or fire only once, and it doesn't state a firing time.

### Is Custom Code actually needed?

The one thing GHL doesn't document natively is **getting the month out of a DOB**, along with "today in the sub-account timezone" to enforce once-per-year:

* The If/Else article lists no date operators such as "month is".
* The Date/Time Formatter action isn't in GHL's own action list. It's documented only on white-label help sites, without a list of output formats. It's also a premium action, so it wouldn't save cost over Custom Code.
* `Day Is` / `Month Is` are described inconsistently (above).

So one Custom Code step is the only month-extraction method with documented, testable behaviour. Its other jobs are safer in code anyway: strict matching on `1980-01-01` and DOB values that arrive as `MM/DD/YYYY`, ISO, `Jan 1st 1980` or a UTC-midnight timestamp. A naive conversion can shift a UTC-midnight timestamp to Dec 31, 1979 in US timezones, which would break both the placeholder check and the January sends.

**Everything else is native**, including the send time, which comes from the Wait step and not from the code.

### Native features this plan relies on (all documented)

* **Wait → "A recurring schedule"**: Weekly / Monthly / Yearly, with "On this date every year" plus a time, in the workflow's timezone.
* **Workflow Settings → Timezone = Account Timezone**: time-based actions use the location timezone.
* **Allow Re-entry**: a contact can re-enter after finishing or being removed, but not while still active.
* **Go To**: sends the contact back to an earlier action (used for the loop).
* **Remove from Workflow** and **Add to Workflow**.
* **Custom Code**: `inputData.<key>` in, `output = {...}` out.

## 3. Custom fields (Settings → Custom Fields → Contact)

Create a folder named **Birthday SMS** with these fields:

| Field name | Type | Written by | Purpose |
| --- | --- | --- | --- |
| Birthday SMS Status | Single line text | Workflow 1 | Routing and audit. Values: `send_now`, `scheduled`, `sent`, `excluded_missing_dob`, `excluded_invalid_dob`, `excluded_placeholder_dob`, `config_error` |
| Birthday SMS Month | Number | Workflow 1 | Birth month, 1–12. Used by the 12-way branch |
| Birthday SMS Last Sent Year | Number | Workflow 1 | Enforces once per year, including when the DOB is edited after a send |
| Birthday SMS Next Send | Single line text | Workflow 1 | Reporting only, e.g. `2027-03-01 09:00` |

The DOB comes from the standard **Date of Birth** field (`{{contact.date_of_birth}}`), which the Symplast integration populates. No date-type custom field is written, which avoids any question of whether Update Contact Field accepts a variable into a date picker.

## 4. Workflow 1: "Birthday Month SMS – Scheduler"

### Settings

| Setting | Value | Why |
| --- | --- | --- |
| Allow Re-entry | **On** | Workflow 2 removes and re-adds contacts when the DOB changes |
| Timezone | **Account Timezone** | Requirement 2. The Yearly Wait fires at 9:00 sub-account time |
| Time Window | Off | Send time is controlled by the Wait. A window ending at 12:00 could push a late send to the next day |
| Stop on Response | Off | A reply shouldn't remove the patient from next year's send |

### Trigger

* **Contact Created** (no filters). Contacts created without a DOB are parked and re-checked monthly (step 3C), and are also picked up by Workflow 2 when the DOB arrives.
* Existing contacts enter through the bulk add in §6.

### Actions

```
[1] Custom Code: Compute ◄────────────────────────────────────────────┐
[2] Update Contact Field (Status, Month, Next Send)                   │
[3] If/Else: Route on Birthday SMS Status                             │
     ├─ "Send now"  (Status is send_now)                              │
     │     [3A.1] Send SMS                                            │
     │     [3A.2] Update Contact Field (Last Sent Year, Status=sent)  │
     │     [3A.3] Wait 1 day                                          │
     │     [3A.4] Go To [1] ──────────────────────────────────────────┤
     ├─ "Scheduled" (Status is scheduled)                             │
     │     [3B] If/Else: Birthday SMS Month = 1 … 12 (12 branches)    │
     │           └─ each: Wait, Yearly, <Month> 1 at 9:00 AM          │
     │                    Go To [1] ──────────────────────────────────┤
     └─ None (any excluded_* or config_error)                         │
           [3C.1] Wait, Monthly, day 1 at 8:00 AM, every month        │
           [3C.2] Go To [1] ──────────────────────────────────────────┘
```

**[1] Custom Code: "Birthday SMS: Compute"** (JavaScript)

Paste the contents of `custom-code.js`. Under **Property to Include in Code**, add:

| Key | Value |
| --- | --- |
| `dob` | `{{contact.date_of_birth}}` (from the variable picker) |
| `lastSentYear` | `{{contact.birthday_sms_last_sent_year}}` (from the picker; the key comes from the field name) |
| `timezone` | The sub-account's IANA timezone, e.g. `America/New_York`. It must match Settings → Business Profile timezone |
| `placeholderDob` | `1980-01-01` |
| `sendHour` | `9` (or `10`; it must match the hour used in step 3B) |
| `cutoffHour` | `12` |
| `dateOrder` | `MDY` (`DMY` only if the sub-account shows dates day-first) |

Click **Test** with a real contact before saving, so the outputs (`status`, `birthMonth`, `currentYear`, `nextSend`, `detail`) show up in the variable picker for later steps.

What the code decides:

* Empty or unresolved DOB → `excluded_missing_dob`.
* Unparseable, impossible (e.g. 02/30) or future DOB → `excluded_invalid_dob`.
* DOB exactly 1980‑01‑01 → `excluded_placeholder_dob`. This is an exact date match, so 1985‑01‑01, 1980‑01‑02 and every other January birthday still qualify (requirement 4).
* Today, in the sub-account timezone, is the 1st of the birth month, the time is between `sendHour` and `cutoffHour`, and Last Sent Year < this year → `send_now`.
* Anything else → `scheduled`.

**[2] Update Contact Field**

* Birthday SMS Status = Custom Code → `status`
* Birthday SMS Month = Custom Code → `birthMonth`
* Birthday SMS Next Send = Custom Code → `nextSend`

**[3] If/Else "Route"** (multi-branch)

* Branch **Send now**: Birthday SMS Status *is* `send_now`
* Branch **Scheduled**: Birthday SMS Status *is* `scheduled`
* **None** branch: everything else (excluded or config error)

**[3A] Send now branch**

1. **Send SMS**, e.g. *"Happy birthday month, {{contact.first_name}}! 🎉 Everyone at {{location.name}} is celebrating you all month long. Reply STOP to opt out."* The client should supply the final copy and any offer. GHL already suppresses SMS to DND contacts.
2. **Update Contact Field**: Birthday SMS Last Sent Year = Custom Code → `currentYear`, and Birthday SMS Status = `sent`.
3. **Wait** → A set period of time → **1 day**. This keeps the loop from re-checking within the same 9:00 minute.
4. **Go To** → step [1]. The recompute sees Last Sent Year = this year and schedules next year.

**[3B] Scheduled branch**

1. **If/Else "Month"** with 12 branches: Birthday SMS Month *is* `1`, `2`, … `12`.
2. In each branch, add **Wait** → **A recurring schedule** → **Yearly** → *On this date every year* = `<Month> 1`, time **9:00 AM** → proceed **On this date and time**.
3. Then **Go To** → step [1].

On waking, the code runs again. Normally it returns `send_now`. If the DOB changed or the year was already used, it re-routes, so a wrong wake-up can't send a second SMS.

**[3C] None branch (excluded)**

1. **Wait** → **A recurring schedule** → **Monthly** → day **1** of every month at **8:00 AM**.
2. **Go To** → step [1].

This is a safety net. If an EHR sync fills or corrects the DOB without firing Workflow 2, the patient is picked up on the next 1st. Because it runs at 8:00, before the 9:00 send, a patient whose birth month is the current month still gets that day's SMS.

## 5. Workflow 2: "Birthday Month SMS – DOB Changed"

Re-routes a contact immediately when their DOB is added, corrected, or changed to or from the placeholder.

* **Settings**: Allow Re-entry **On**.
* **Trigger**: **Contact Changed** → filter the changed field to **Date of Birth**. The help article shows the field picker with a standard field (Website); confirm Date of Birth is listed.
* **Actions**:
  1. **Remove from Workflow** → *Birthday Month SMS – Scheduler*
  2. **Add to Workflow** → *Birthday Month SMS – Scheduler*

A double send isn't possible: Last Sent Year is checked on every pass. For example, a patient sent in January whose DOB is corrected to March is scheduled for next March, not this one.

If Contact Changed turns out not to fire for integration updates, nothing breaks; changes just take effect later. Excluded contacts are re-checked on the next 1st (3C). Scheduled contacts re-route at their next wake-up.

## 6. Existing patients (backfill, one time)

1. Publish both workflows.
2. Go to **Contacts**, select all contacts (or a Smart List of all patients), then **Bulk Actions → Add to Workflow → Birthday Month SMS – Scheduler**.
3. Don't run the backfill on the 1st of a month between 9:00 AM and noon. If you do, that month's patients get their SMS immediately, which is correct but probably unexpected. Any other day, every contact simply moves into its wait.
4. Afterwards, filter on **Birthday SMS Status** to check the split between `scheduled` and each `excluded_*` value.

**Cost note:** Custom Code is a premium action, billed per execution at the agency's rates. Scheduled patients run it about twice a year. Excluded patients run it monthly because of the 3C safety net. If placeholder or missing-DOB volume is large, you can backfill only contacts where *Date of Birth is not empty* and change 3C to a quarterly wait. The trade-off is relying more on Workflow 2 to catch new DOBs.

## 7. Requirements checklist

| # | Requirement | How it's met |
| --- | --- | --- |
| 1 | 1st of birth month, every year | Yearly recurring Wait on `<Month> 1` plus a loop back via Go To |
| 2 | 9 or 10 AM, sub-account timezone | Wait time 9:00 AM; workflow timezone = Account. The code's `timezone` input matches, and `sendHour` can be set to 10 |
| 3 | Exclude DOB 1980‑01‑01 | Exact date match in code → `excluded_placeholder_dob` |
| 4 | Other January birthdays qualify | Only the exact placeholder date is excluded (tested: 1985‑01‑01, 1980‑01‑02) |
| 5 | Missing or invalid DOB excluded | `excluded_missing_dob` / `excluded_invalid_dob`, re-checked monthly |
| 6 | Once per year | Birthday SMS Last Sent Year guard, checked before every send |
| 7 | Existing contacts | One-time bulk add (§6). New contacts enter via Contact Created; DOB edits via Workflow 2 |

## 8. Sandbox test plan

Use a test sub-account, or real test contacts with your own phone numbers.

**Immediate tests.** For each contact, use **Test** on step [1], or add it to Workflow 1 and read Birthday SMS Status / Next Send:

| Contact DOB | Last Sent Year | Expected Status | Expected Next Send |
| --- | --- | --- | --- |
| 01/01/1980 | – | excluded_placeholder_dob | – |
| 01/01/1985 | – | scheduled | 2027-01-01 09:00 |
| 01/02/1980 | – | scheduled | 2027-01-01 09:00 |
| (empty) | – | excluded_missing_dob | – |
| 11/20/1990 | – | scheduled | 2026-11-01 09:00 |
| 11/20/1990 | 2026 | scheduled | 2027-11-01 09:00 |
| 02/14/1990 | – | scheduled | 2027-02-01 09:00 |

**Live send test (Nov 1, 2026):** keep two test contacts born in November (one born on the 1st, one on the 30th) in the Scheduler. Both should receive the SMS at 9:00 AM sub-account time, and Last Sent Year should become 2026. Then change one contact's DOB to 12/05/1990. Workflow 2 should re-add it, and it should show `scheduled`, `2027-12-01 09:00` (not this December, because it was already sent this year).

**Option B check (same morning, separate draft workflow):** add a Birthday Reminder trigger with only **Day Is = 1**, plus contacts born Nov 7, Nov 30, Nov 1 and Dec 5. Look at the 8:00 AM enrollments on Nov 1:

* **Only November-born contacts enrolled** → `Day Is` works as "the 1st of the birth month". You can switch to Option B: Birthday Reminder (Day Is = 1) → If/Else DOB is 01/01/1980 → end → Wait 1 minute with **Advanced Window: Resume Between Hours 9:00–10:00 AM** → Send SMS. Allow Re-entry on.
* **Only the Nov 1 contact enrolled**, or the Dec contact enrolled → the filter doesn't mean that. Stay on Option A.

## 9. Things to confirm while building

The help center doesn't settle these points. Each has a fallback that's already in the plan.

1. **Date of Birth in the Contact Changed field picker.** Fallback: 3C monthly re-check plus re-routing at wake-up.
2. **Exact variable names for Custom Code outputs.** Always insert them with the variable picker after a successful **Test**.
3. **Number of If/Else branches.** If the builder caps branches below 12, chain two If/Else steps (Jan–Jun, Jul–Dec).
4. **Format of `{{contact.date_of_birth}}` in this sub-account.** The code accepts ISO, `MM/DD/YYYY`, `DD/MM/YYYY` (with `dateOrder=DMY`), `Jan 1st 1980`, `January 1, 1980` and epoch timestamps. A one-contact **Test** on step [1] shows which one you get.

## 10. Sources

* [Workflow Trigger – Birthday Reminder](https://help.gohighlevel.com/support/solutions/articles/155000002670-workflow-trigger-birthday-reminder)
* [Contact Date of Birth field](https://help.gohighlevel.com/support/solutions/articles/48001077108-contacts-date-of-birth-birthday-) (lists Day is / Month is; the other article's conflicting definition is cited in §2)
* [Workflow Trigger – Custom Date Reminder](https://help.gohighlevel.com/support/solutions/articles/155000002674-trigger-custom-date-remimder)
* [Workflow Trigger – Scheduler](https://help.gohighlevel.com/support/solutions/articles/155000006653-workflow-trigger-scheduler) (doesn't enroll contacts, so it can't drive this)
* [Workflow Action – Wait](https://help.gohighlevel.com/support/solutions/articles/155000002470-workflow-action-wait)
* [Workflow Settings overview](https://help.gohighlevel.com/support/solutions/articles/48001239875-workflow-settings-overview)
* [Workflow Action – Custom Code](https://help.gohighlevel.com/support/solutions/articles/155000003362-workflow-action-custom-code)
* [Workflow Action – If/Else](https://help.gohighlevel.com/support/solutions/articles/155000002471-workflow-action-if-else)
* [Workflow Action – Go To](https://help.gohighlevel.com/support/solutions/articles/155000003377-workflow-action-go-to)
* [Workflow Action – Remove from Workflow](https://help.gohighlevel.com/support/solutions/articles/155000002553-workflow-action-remove-from-workflow)
* [Workflow Trigger – Contact Changed](https://help.gohighlevel.com/support/solutions/articles/155000002477-workflow-trigger-contact-changed)
