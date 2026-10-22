import type { EventInput } from '../../schema/rules.ts';

/**
 * Everything that can happen to the demo card.
 * Entering a stage that has a text series starts those texts automatically (see series.ts),
 * so events never list series effects themselves.
 * Caption tokens: {name}, {stage:<id>}, {timer:<id>} ("5 days"), {timerAdj:<id>} ("5-day"),
 * {dnd:current}, {series:current}.
 */
export const events: EventInput[] = [
  {
    id: 'lead_created',
    actor: 'patient',
    kind: 'action',
    label: {
      client: 'A lead submits a website form, SMS chat, or live chat.',
      internal: 'Inbound lead creates an opportunity in New Lead (status open) and starts lead_window.',
    },
    availableFrom: { noCard: true },
    effects: [
      { type: 'create_card', stage: 'new_lead' },
      { type: 'start_timer', timer: 'lead_window' },
    ],
    caption: {
      client: 'A new card for {name} appears in {stage:new_lead}, and the {timerAdj:lead_window} window to book starts.',
      internal: 'Opportunity created in New Lead (status open); lead_window starts at creation.',
    },
    verification: { status: 'V' },
  },
  {
    id: 'ghl_call',
    actor: 'staff_ghl',
    kind: 'action',
    label: {
      client: 'Staff calls the lead through Symplast CRM.',
      internal: 'Outbound call placed through GHL moves New Lead → Contacted.',
    },
    availableFrom: { stages: ['new_lead'] },
    effects: [{ type: 'move', to: 'contacted' }],
    caption: {
      client:
        'Your team calls {name} through Symplast CRM, so the card moves to {stage:contacted}. The {timerAdj:lead_window} window keeps running and does not start over.',
      internal: 'Outbound GHL call → Contacted. lead_window is not reset; it is still measured from creation.',
    },
    verification: {
      status: 'V',
      questions: ['OQ-2'],
      ncParts: ['Whether inbound calls or staff texts also count'],
    },
  },
  {
    id: 'call_outside_ghl',
    actor: 'staff_other',
    kind: 'action',
    label: {
      client: 'Staff calls from a desk phone or cell.',
      internal: 'Call placed outside GHL. No pipeline change.',
    },
    availableFrom: { stages: ['new_lead'] },
    effects: [{ type: 'none' }],
    caption: {
      client:
        'Your team calls {name} from a desk phone or cell, so nothing changes on the board. Only calls made through Symplast CRM move the card to {stage:contacted}.',
      internal: 'GHL never sees the call, so nothing moves the opportunity.',
    },
    verification: { status: 'NC', questions: ['OQ-21', 'OQ-2'] },
  },
  {
    id: 'five_days_pass',
    actor: 'time',
    kind: 'time',
    label: {
      client: '{timer:lead_window} pass with no consultation booked.',
      internal: 'lead_window expires while the card is still in New Lead or Contacted.',
    },
    effects: [{ type: 'move', to: 'no_response' }],
    caption: {
      client: '{timer:lead_window} have passed with no consultation booked, so the card moves to {stage:no_response}.',
      internal: 'lead_window expired with the card in New Lead or Contacted → No Response/Didn’t Schedule.',
    },
    verification: {
      status: 'V',
      questions: ['OQ-3'],
      ncParts: ['What counts as "scheduled"', 'What happens if a lead books and then cancels before the window ends'],
    },
  },
  {
    id: 'consult_booked',
    actor: 'staff_symplast',
    kind: 'action',
    label: {
      client: 'Staff books a consultation in Symplast.',
      internal: 'Consultation appointment booked in Symplast → Booked Appointment.',
    },
    availableFrom: { stages: ['new_lead', 'contacted', 'no_response', 'no_show'] },
    effects: [{ type: 'move', to: 'booked_appointment' }],
    caption: {
      client: 'A consultation for {name} is booked in Symplast, so the card moves to {stage:booked_appointment}.',
      internal: 'Symplast appointment created → Booked Appointment.',
    },
    verification: {
      status: 'V',
      questions: ['OQ-6'],
      ncParts: ['The exact list of stages it applies from'],
    },
  },
  {
    id: 'marked_no_show',
    actor: 'staff_symplast',
    kind: 'action',
    label: {
      client: 'Staff marks the patient a no-show in Symplast.',
      internal: 'Appointment marked no-show in Symplast → No Show.',
    },
    availableFrom: { stages: ['booked_appointment'] },
    effects: [{ type: 'move', to: 'no_show' }],
    caption: {
      client: '{name} missed the consultation and is marked a no-show in Symplast, so the card moves to {stage:no_show}.',
      internal: 'Symplast no-show → No Show.',
    },
    verification: { status: 'V' },
  },
  {
    id: 'checked_out',
    actor: 'staff_symplast',
    kind: 'action',
    label: {
      client: 'Patient checked out in Symplast.',
      internal: 'Symplast checkout → appointment Showed in GHL, card → Consulted, quote_window starts.',
    },
    availableFrom: { stages: ['booked_appointment'] },
    effects: [
      { type: 'mark_showed' },
      { type: 'move', to: 'consulted' },
      { type: 'start_timer', timer: 'quote_window' },
    ],
    caption: {
      client:
        '{name} is checked out in Symplast, so the appointment shows as Showed in Symplast CRM and the card moves to {stage:consulted}. The {timerAdj:quote_window} window to book a procedure starts.',
      internal: 'Checkout sets the appointment to Showed in GHL, moves the opportunity to Consulted, and starts quote_window.',
    },
    verification: {
      status: 'V',
      questions: ['OQ-4'],
      ncParts: ['Whether the window starts at checkout or when the card enters Consulted'],
    },
  },
  {
    id: 'estimate_created',
    actor: 'staff_symplast',
    kind: 'action',
    label: {
      client: 'Staff creates an estimate in Symplast.',
      internal: 'Estimate created in Symplast → Consulted. Configurable per practice.',
    },
    availableFrom: { stages: ['booked_appointment'] },
    effects: [{ type: 'move', to: 'consulted' }],
    caption: {
      client: 'An estimate for {name} is created in Symplast, so the card moves to {stage:consulted}.',
      internal: 'Estimate created → Consulted. quote_window is not started by this event (OQ-4).',
    },
    configurable: { enabledByDefault: true },
    verification: { status: 'NC', questions: ['OQ-6', 'OQ-4'] },
  },
  {
    id: 'three_days_pass',
    actor: 'time',
    kind: 'time',
    label: {
      client: '{timer:quote_window} pass with no procedure booked.',
      internal: 'quote_window expires while the card is still in Consulted.',
    },
    effects: [{ type: 'move', to: 'quoted_nurture' }],
    caption: {
      client: '{timer:quote_window} have passed with no procedure booked, so the card moves to {stage:quoted_nurture}.',
      internal: 'quote_window expired with the card in Consulted → Quoted Nurture.',
    },
    verification: { status: 'V' },
  },
  {
    id: 'procedure_booked',
    actor: 'staff_symplast',
    kind: 'action',
    label: {
      client: 'Staff books the procedure in Symplast.',
      internal: 'Procedure booked in Symplast → Procedure Booked {Surgical}.',
    },
    availableFrom: { stages: ['consulted', 'quoted_nurture'] },
    effects: [{ type: 'move', to: 'procedure_booked' }],
    caption: {
      client: "{name}'s procedure is booked in Symplast, so the card moves to {stage:procedure_booked}.",
      internal: 'Symplast procedure appointment → Procedure Booked {Surgical}.',
    },
    verification: {
      status: 'V',
      questions: ['OQ-5'],
      ncParts: ['Whether booking a non-surgical treatment counts'],
    },
  },
  {
    id: 'procedure_checked_out',
    actor: 'staff_symplast',
    kind: 'action',
    label: {
      client: 'Patient checked out from the procedure in Symplast.',
      internal: 'Procedure checkout → status Won; card leaves the Open opportunities view.',
    },
    availableFrom: { stages: ['procedure_booked'] },
    effects: [
      { type: 'move', to: 'treatment_completed', onlyIfStageEnabled: 'treatment_completed' },
      { type: 'set_status', status: 'won' },
    ],
    caption: {
      client:
        '{name} is checked out from the procedure, so the opportunity is marked Won. Won opportunities leave the Open opportunities view.',
      internal: 'Status → Won, so the Open opportunities view filters it out (closed-out area).',
    },
    captionIf: [
      {
        stageEnabled: 'treatment_completed',
        caption: {
          client:
            '{name} is checked out from the procedure, so the card enters {stage:treatment_completed} and is marked Won at the same moment. Won opportunities leave the Open opportunities view.',
          internal: 'Variant: stage → Treatment Completed and status → Won in the same event, so it never shows in the Open view.',
        },
      },
    ],
    verification: { status: 'V' },
  },
  {
    id: 'dnd_checked',
    actor: 'staff_ghl',
    kind: 'action',
    label: {
      client: 'Staff checks “{dnd:current}” under DND Nurture.',
      internal: 'Per-series DND Nurture checkbox checked in the opportunity details.',
    },
    availableFrom: { whileSeriesActive: true },
    effects: [{ type: 'dnd_current_series' }],
    caption: {
      client:
        'Your team checks “{dnd:current}” under DND Nurture, so the rest of the {series:current} stop right away. {name} won’t get these texts again, even if the card comes back to this stage.',
      internal:
        'DND checkbox: series stopped immediately, remaining sends marked stopped by staff, re-entry to this series blocked. Other series unaffected.',
    },
    verification: {
      status: 'V',
      questions: ['OQ-8', 'OQ-14'],
      ncParts: ['The checkbox label', 'Whether staff can uncheck it'],
    },
  },
  {
    id: 'skip_ahead',
    actor: 'time',
    kind: 'skip_ahead',
    label: {
      client: 'Skip ahead to the next thing that happens on its own.',
      internal: 'Advance the simulated clock to the earliest timer expiry or text checkpoint and resolve it.',
    },
    caption: {
      client: 'The clock moves ahead to the next thing that happens on its own.',
      internal: 'Skip ahead.',
    },
    verification: { status: 'V' },
  },
];
