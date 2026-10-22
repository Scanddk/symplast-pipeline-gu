import type { StageInput } from '../../schema/rules.ts';

/**
 * The Symplast standard pipeline, in board order.
 * `name` must match the GHL display name exactly (note the curly ’ in Didn’t).
 * Copy refers to durations with {timer:<id>} tokens. Never type a number of days here.
 */
export const stages: StageInput[] = [
  {
    id: 'new_lead',
    name: 'New Lead',
    dot: 'blue',
    seriesId: 'new_lead_texts',
    enabledByDefault: true,
    meaning: {
      client: 'A new inquiry just came in from a form or chat.',
      internal: 'Opportunity created by an inbound lead (website form, SMS chat, live chat). Status open.',
      draft: true,
    },
    yourPart: {
      client:
        'Call the lead through Symplast CRM. That moves the card to {stage:contacted}. When a consultation is booked in Symplast, the card moves to {stage:booked_appointment} on its own.',
      internal:
        'Outbound GHL call → Contacted. Consult booked in Symplast → Booked Appointment. Calls from a desk phone or cell do not move the card.',
      draft: true,
    },
    verification: {
      status: 'V',
      questions: ['OQ-11'],
      ncParts: ['Whether the real GHL header shows 💬 on this stage'],
    },
  },
  {
    id: 'contacted',
    name: 'Contacted',
    dot: 'gray',
    enabledByDefault: true,
    meaning: {
      client: 'Your team has called the lead through Symplast CRM.',
      internal: 'Entered via an outbound call placed through GHL. lead_window keeps running from creation.',
      draft: true,
    },
    yourPart: {
      client:
        'Keep working toward a booked consultation. If none is booked within {timer:lead_window} of the inquiry, the card moves to {stage:no_response}.',
      internal:
        'lead_window was not reset by the call. Booking a consult in Symplast moves the card to Booked Appointment before the window ends.',
      draft: true,
    },
    verification: { status: 'V' },
  },
  {
    id: 'no_response',
    name: 'No Response/Didn’t Schedule',
    dot: 'orange',
    seriesId: 'no_response_texts',
    enabledByDefault: true,
    meaning: {
      client: '{timer:lead_window} have passed since the inquiry and no appointment is booked.',
      internal: 'Entered when lead_window expires while the card is still in New Lead or Contacted.',
      draft: true,
    },
    yourPart: {
      client:
        'Keep reaching out. Booking a consultation in Symplast moves the card to {stage:booked_appointment}, and the texts left in this stage are skipped.',
      internal:
        'Consult booked → Booked Appointment. Remaining No Response sends fail their checkpoint (card left stage).',
      draft: true,
    },
    verification: {
      status: 'V',
      questions: ['OQ-11'],
      ncParts: ['Whether the real GHL header shows 💬 on this stage'],
    },
  },
  {
    id: 'booked_appointment',
    name: 'Booked Appointment',
    dot: 'gray',
    enabledByDefault: true,
    meaning: {
      client: 'A consultation is on the calendar in Symplast.',
      internal: 'Entered when a consultation appointment is booked in Symplast.',
      draft: true,
    },
    yourPart: {
      client:
        'After the consultation, check the patient out in Symplast. That moves the card to {stage:consulted}. If the patient misses it, mark them as a no-show in Symplast.',
      internal:
        'Symplast checkout → appointment marked Showed in GHL, card → Consulted, quote_window starts. Symplast no-show → No Show.',
      draft: true,
    },
    verification: { status: 'V' },
  },
  {
    id: 'no_show',
    name: 'No Show',
    dot: 'red',
    seriesId: 'no_show_texts',
    enabledByDefault: true,
    meaning: {
      client: 'The patient missed their consultation.',
      internal: 'Entered when the appointment is marked no-show in Symplast.',
      draft: true,
    },
    yourPart: {
      client:
        'Reach out to rebook. Booking a new consultation in Symplast moves the card back to {stage:booked_appointment}.',
      internal: 'Consult booked from No Show → Booked Appointment. Remaining No Show sends fail their checkpoint.',
      draft: true,
    },
    verification: { status: 'V' },
  },
  {
    id: 'consulted',
    name: 'Consulted',
    dot: 'orange_red',
    enabledByDefault: true,
    meaning: {
      client: 'The patient has had their consultation.',
      internal: 'Entered on Symplast checkout (appointment Showed), or on estimate created where that is enabled.',
      draft: true,
    },
    yourPart: {
      client:
        'Book the procedure in Symplast when the patient is ready. If no procedure is booked within {timer:quote_window} of checkout, the card moves to {stage:quoted_nurture}.',
      internal: 'Procedure booked → Procedure Booked {Surgical}. quote_window expiry while still in Consulted → Quoted Nurture.',
      draft: true,
    },
    verification: { status: 'V' },
  },
  {
    id: 'quoted_nurture',
    name: 'Quoted Nurture',
    dot: 'orange',
    seriesId: 'quoted_nurture_texts',
    enabledByDefault: true,
    meaning: {
      client: '{timer:quote_window} have passed since the consultation and no procedure is booked.',
      internal: 'Entered when quote_window expires while the card is still in Consulted.',
      draft: true,
    },
    yourPart: {
      client:
        'Follow up on the quote. Booking the procedure in Symplast moves the card to {stage:procedure_booked}, and the texts left in this stage are skipped.',
      internal: 'Procedure booked → Procedure Booked {Surgical}. Remaining Quoted Nurture sends fail their checkpoint.',
      draft: true,
    },
    verification: { status: 'V' },
  },
  {
    id: 'procedure_booked',
    name: 'Procedure Booked {Surgical}',
    dot: 'teal',
    enabledByDefault: true,
    meaning: {
      client: "The patient's procedure is scheduled in Symplast.",
      internal: 'Entered when a procedure is booked in Symplast from Consulted or Quoted Nurture.',
      draft: true,
    },
    yourPart: {
      client:
        'After the procedure, check the patient out in Symplast. The opportunity is marked Won and leaves the Open opportunities view.',
      internal: 'Procedure checkout → status Won. Card leaves the Open opportunities view.',
      draft: true,
    },
    verification: {
      status: 'V',
      questions: ['OQ-12', 'OQ-5'],
      ncParts: [
        'Braces or parentheses in the stage name',
        'Whether booking a non-surgical treatment counts',
      ],
    },
  },
  {
    id: 'treatment_completed',
    name: 'Treatment Completed',
    dot: 'gray',
    enabledByDefault: false,
    meaning: {
      client: 'The procedure has been checked out in Symplast.',
      internal:
        'Variant stage. Card enters on procedure checkout and is marked Won at the same moment, so it leaves the Open view.',
      draft: true,
    },
    yourPart: {
      client: 'Nothing to do here. The card arrives and is marked Won at the same moment.',
      internal: 'No staff action. Entry and Won happen on the same procedure-checkout event.',
      draft: true,
    },
    verification: { status: 'NC', questions: ['OQ-10', 'OQ-17'] },
  },
];
