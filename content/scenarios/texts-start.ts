import type { ScenarioInput } from '../../schema/scenario.ts';

/** Texts lesson, chapter 1: entering a texting stage starts its texts. Fictional patient. */
export const textsStart: ScenarioInput = {
  id: 'texts_start',
  title: 'Texts start when a card arrives',
  practice: 'standard',
  cast: { name: 'Ana Ruiz', source: 'Website form' },
  // Consultation done and checked out; the New Lead check is resolved so only Quoted Nurture texts are in play.
  setup: ['lead_created', 'consult_booked', 'skip_ahead', 'checked_out'],
  focusSeries: 'quoted_nurture_texts',
  intro: {
    client: '{name} had a consultation but hasn’t booked a procedure yet. Watch what happens when the card reaches a stage that sends texts.',
    internal: 'Card in Consulted with quote_window running. Next: window expires → Quoted Nurture series starts.',
  },
  steps: [{ eventId: 'skip_ahead' }, { eventId: 'skip_ahead' }, { eventId: 'skip_ahead' }],
};
