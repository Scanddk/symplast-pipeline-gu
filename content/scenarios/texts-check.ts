import type { ScenarioInput } from '../../schema/scenario.ts';

/** Texts lesson, chapter 2: the check before each text, and a skip after the card moves. Fictional patient. */
export const textsCheck: ScenarioInput = {
  id: 'texts_check',
  title: 'Before each text, it checks',
  practice: 'standard',
  cast: { name: 'Priya Shah', source: 'Chat widget' },
  setup: ['lead_created', 'consult_booked', 'skip_ahead', 'marked_no_show'],
  focusSeries: 'no_show_texts',
  intro: {
    client: '{name} missed a consultation, so the card is in No Show and the No Show texts have started.',
    internal: 'Card in No Show; no_show_texts active with all sends upcoming.',
  },
  steps: [{ eventId: 'skip_ahead' }, { eventId: 'consult_booked' }, { eventId: 'skip_ahead' }],
};
