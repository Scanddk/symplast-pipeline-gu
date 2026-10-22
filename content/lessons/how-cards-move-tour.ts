import type { TourInput } from '../../schema/tour.ts';

/**
 * Guided tour for "The Patient Journey": one fictional patient from website inquiry to booked procedure.
 * Beats only fire events the rules already define; everything else is showing staff where things are.
 * The patient's reply changes nothing on its own (replies aren't modeled, OQ-23); booking in Symplast moves the card.
 * Symplast screens (booking, checkout) open from the Symplast Practice App in the app dock, not from Symplast CRM.
 */
export const howCardsMoveTour: TourInput = {
  intro: {
    client: 'Follow one new patient from a website inquiry to a booked procedure, one step at a time.',
    internal: 'Tour: web form → opportunity notes → CRM call → contact panel → time lapse → reply → booking → checkout.',
  },
  outro: {
    client: 'That’s the patient journey, from a website inquiry to a booked procedure.',
    internal: 'Tour finished.',
  },
  beats: [
    {
      id: 'form',
      title: 'A new inquiry',
      demo: 'web_form',
      fires: { event: 'lead_created' },
      // Opens on the practice's website; after Submit, the full CRM, then in to the new card.
      camera: 'reveal_card',
      caption: {
        client: '{name} fills out the contact form on your website.',
        internal: 'web_form demo, then lead_created.',
      },
    },
    {
      id: 'notes',
      title: 'Open the opportunity',
      demo: 'opportunity_notes',
      caption: {
        client: 'Open the card to see what {firstName} sent on the form.',
        internal: 'Opportunity modal → Notes shows the form submission note.',
      },
    },
    {
      id: 'call',
      title: 'Call the lead',
      demo: 'crm_call',
      fires: { event: 'ghl_call' },
      caption: {
        client: 'Call {firstName} right from the card in Symplast CRM.',
        internal: 'Card phone button (outbound CRM call), then ghl_call.',
      },
    },
    {
      id: 'contact',
      title: 'The contact panel',
      demo: 'contact_panel',
      caption: {
        client: 'Click {firstName}’s name to open the contact panel, where you can message, add notes, and create tasks.',
        internal: 'Contact slide-out: composer, notes, prefilled call-back task. No pipeline change.',
      },
    },
    {
      id: 'wait',
      title: 'Time passes',
      demo: 'time_lapse',
      fires: { skipUntil: 'five_days_pass' },
      lapse: {
        title: { client: '{timer:lead_window} later', internal: 'lead_window ({timer:lead_window}) later' },
        body: { client: 'No consultation has been booked.', internal: 'No consult booked, so lead_window expires.' },
        // A little cheek: the lead goes quiet, then ghosts.
        sunFaces: { 3: '🥱', 4: '👻' },
      },
      caption: {
        client: 'Let’s skip ahead. {timer:lead_window} go by and no consultation is booked.',
        internal: 'Skip ahead until five_days_pass resolves (earlier checkpoints resolve silently).',
      },
    },
    {
      id: 'reply',
      title: 'The patient replies',
      demo: 'patient_reply',
      // The first No Response text goes out as the beat begins; then the patient writes back and your team offers a time.
      fires: { skipUntil: 'no_response_texts' },
      firesAt: 'start',
      autoAdvance: true,
      caption: {
        client: '{firstName} gets the first No Response text, writes back, and your team offers a time.',
        internal: 'Skip ahead to the first no_response_texts checkpoint (passes, text 1 sent). The replies are narrative only (OQ-23).',
      },
    },
    {
      id: 'book',
      title: 'Book the consultation',
      demo: 'ehr_new_appointment',
      fires: { event: 'consult_booked' },
      caption: {
        client: 'Open the Symplast Practice App and book the consultation, the way you always do.',
        internal: 'App dock → Symplast Practice App, New Appointment sheet, then consult_booked.',
      },
    },
    {
      id: 'consult_day',
      title: 'The day of the consultation',
      demo: 'consult_day',
      // Story only: waiting for the appointment moves nothing in the pipeline.
      autoAdvance: true,
      lapse: {
        title: { client: 'Consultation Day, {start}', internal: 'Consultation Day, {start} (copy.slot)' },
        body: {
          client: '{firstName} has had the consultation and is ready to check out.',
          internal: 'Consultation done; next is checkout.',
        },
      },
      caption: {
        client: 'The next day, {firstName} comes in for the consultation.',
        internal: 'Narrative only: time passes to the booked slot (copy.slot). No pipeline event.',
      },
    },
    {
      id: 'checkout',
      title: 'Check out after the consultation',
      demo: 'ehr_checkout',
      fires: { event: 'checked_out' },
      caption: {
        client: 'After the consultation, check {firstName} out in the Symplast Practice App.',
        internal: 'App dock → Symplast Practice App, appointment window → Checked Out, then checked_out.',
      },
    },
    {
      id: 'quote_wait',
      title: 'No procedure booked yet',
      demo: 'time_lapse',
      fires: { skipUntil: 'three_days_pass' },
      lapse: {
        title: { client: '{timer:quote_window} later', internal: 'quote_window ({timer:quote_window}) later' },
        body: { client: 'No procedure has been booked.', internal: 'No procedure booked, so quote_window expires.' },
      },
      caption: {
        client: 'Let’s skip ahead again. {timer:quote_window} go by and no procedure is booked.',
        internal: 'Skip ahead until three_days_pass resolves (earlier checkpoints resolve silently).',
      },
    },
    {
      id: 'nurture_text',
      title: 'A Quoted Nurture text',
      demo: 'nurture_reply',
      // The text goes out as the beat begins; then the conversation plays.
      fires: { skipUntil: 'quoted_nurture_texts' },
      firesAt: 'start',
      autoAdvance: true,
      caption: {
        client: '{firstName} gets the first Quoted Nurture text and writes back.',
        internal: 'Skip ahead to the first quoted_nurture_texts checkpoint (passes, text 1 sent). The reply is narrative only (OQ-23).',
      },
    },
    {
      id: 'book_procedure',
      title: 'Book the procedure',
      demo: 'ehr_book_procedure',
      fires: { event: 'procedure_booked' },
      caption: {
        client: 'Open the Symplast Practice App and book the procedure.',
        internal: 'App dock → Symplast Practice App, New Appointment (procedure), then procedure_booked.',
      },
    },
  ],
};
