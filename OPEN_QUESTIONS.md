# Open questions

Rules marked **NC** (needs confirmation) link here as `OQ-n`. The guide only models what is confirmed or written in the brief. Anything else lands here.

**Only the content owner changes a rule from NC to V.** When a question is answered, update the rule in `content/rules/`, change its status yourself, and move the question to *Answered* with the date.

`npm run content:report` lists every NC item in use and the questions behind it.

## Open

### Seeded from the brief

- **OQ-1:** Does moving to Contacted stop the New Lead texts? (Under the checkpoint rule as written, it would. The guide currently shows this: the next New Lead check fails with "card left this stage".)
- **OQ-2:** Do inbound calls or staff texts move a lead to Contacted, or only outbound calls through GHL?
- **OQ-3:** What counts as "scheduled" at day 5? What happens if a lead books and then cancels before day 5?
- **OQ-4:** Does the 3-day window start at checkout, or when the card enters Consulted (e.g. via an estimate)? (The guide starts it at checkout only, so a card that reaches Consulted through an estimate has no window running.)
- **OQ-5:** Does booking a non-surgical treatment count as booking a procedure?
- **OQ-6:** Which stages can "consult booked" and "estimate created" move a card from?
- **OQ-7:** What else ends a text series: a patient reply, STOP, the end of the series? Is the opportunity marked Lost or Abandoned at the end? (The guide leaves the card where it is after the last text: assumption `series_end_no_change`.)
- **OQ-8:** DND Nurture: what is its exact label, where is it in the opportunity details, and can staff uncheck it? (The Demo Prod screenshot shows a field named "DND Nurture Workflows" with per-series checkboxes; see OQ-14.)
- **OQ-9:** Where does the card go when a consultation is cancelled?
- **OQ-10:** In Treatment Completed practices, does procedure checkout move the card there and mark it Won at the same time?
- **OQ-11:** Do the real stage headers show 💬 on New Lead and No Response/Didn’t Schedule? (The Demo Prod screenshots show it only on No Show and Quoted Nurture.)
- **OQ-12:** Is the exact stage name "Procedure Booked {Surgical}" with braces, as in the GHL screenshot, or with parentheses?
- **OQ-13:** For each text series: how many texts, what timing, and does the first text send immediately on entry? (The guide uses 3 placeholder texts: the first 1 day after the card enters the stage, then 7 days between texts, labeled "Example timing".)

### Found in the reference screenshots

- **OQ-14:** The "DND Nurture Workflows" field in Demo Prod lists *No Response/Didn't Schedule, Quoted Nurture, No Show Nurture, Toxin Recall, Filler Recall*. There is no New Lead option. Can staff stop the New Lead texts with DND? (The guide offers DND on every texting stage, as the brief says, and labels the New Lead box "New Lead" as NC.)
- **OQ-15:** A contact timeline in Demo Prod shows a card moving directly from No Show to Consulted. Which event does that (checkout of a rebooked appointment, an estimate, a manual move)? The brief only allows Consulted from Booked Appointment.
- **OQ-16:** The same timeline shows an opportunity *created* directly in Booked Appointment ("Opportunity … created in 1. Simple Symplast Pipeline - Booked …") after an appointment was created. Can a card start in Booked Appointment without passing through New Lead?
- **OQ-17:** In the Demo Prod board, the Treatment Completed column shows 5 opportunities in the "Open opportunities" view. If cards are marked Won when they enter Treatment Completed, why do they show there? (Different filter, older data, or not marked Won?)
- **OQ-20:** The DND checkbox label uses a straight apostrophe ("Didn't") while the stage header uses a curly one ("Didn’t"). Which exact text should the guide show for each?

### Modeling choices the brief does not settle

- **OQ-18:** If a text check and a timer fall on the same day, which happens first? (The guide resolves the text first: assumption `same_day_text_first`.)
- **OQ-19:** If a card re-enters a texting stage without DND (for example, a second No Show), what happens to that stage's texts: start over, continue, or nothing? (The guide starts them over: assumption `series_reentry_restarts`.)
- **OQ-21:** Confirm that calls from a desk phone or cell never move the card. (The guide shows "nothing changes on the board".)
- **OQ-28:** What do the texts actually say? The texts lesson shows each message on screen. Until real copy is provided, the guide uses example wording it wrote itself, labeled "Example message" (`message` in `content/rules/series.ts`). Is there a Symplast standard wording, and does it vary by practice?

### Not modeled in Milestone 1

- **OQ-22:** Cancellations: where does the card go when a consultation or procedure is cancelled? (See also OQ-3 and OQ-9.)
- **OQ-23:** Patient replies: does a reply stop a series or move the card?
- **OQ-24:** STOP opt-out: what happens to the card and to every series when the patient texts STOP?
- **OQ-25:** Lost and Abandoned: when, and by what, is an opportunity marked Lost or Abandoned?
- **OQ-26:** End of series: does anything happen when the last text in a series sends? (See OQ-7.)
- **OQ-27:** Manual card drags: what happens to timers and texts when staff drag a card to another stage by hand?

## Answered

_None yet._
