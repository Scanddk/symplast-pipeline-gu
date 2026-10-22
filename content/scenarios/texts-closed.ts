import type { ScenarioInput } from '../../schema/scenario.ts';

/** Texts lesson, chapter 3: a closed opportunity never gets texts. Fictional patient. */
export const textsClosed: ScenarioInput = {
  id: 'texts_closed',
  title: 'When the opportunity closes',
  practice: 'standard',
  cast: { name: 'Lena Park', source: 'Website form' },
  setup: ['lead_created', 'consult_booked', 'skip_ahead', 'checked_out', 'skip_ahead'],
  focusSeries: 'quoted_nurture_texts',
  intro: {
    client: '{name}’s card is in Quoted Nurture, and the first text is on the way.',
    internal: 'Card in Quoted Nurture; quoted_nurture_texts active, first send upcoming.',
  },
  steps: [{ eventId: 'procedure_booked' }, { eventId: 'procedure_checked_out' }, { eventId: 'skip_ahead' }],
};
