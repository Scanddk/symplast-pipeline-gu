import type { ScenarioInput } from '../../schema/scenario.ts';

/** Texts lesson, chapter 4: DND Nurture stops one set of texts for good. Fictional patient. */
export const textsDnd: ScenarioInput = {
  id: 'texts_dnd',
  title: 'Your team can stop them',
  practice: 'standard',
  cast: { name: 'Grace Kim', source: 'Contact form' },
  setup: ['lead_created', 'consult_booked', 'skip_ahead', 'marked_no_show'],
  focusSeries: 'no_show_texts',
  intro: {
    client: '{name} missed a consultation, and the No Show texts have started. Your team decides these texts aren’t right for this patient.',
    internal: 'Card in No Show; no_show_texts active. Next: DND Nurture checked for this series.',
  },
  steps: [{ eventId: 'dnd_checked' }, { eventId: 'consult_booked' }, { eventId: 'marked_no_show' }],
};
