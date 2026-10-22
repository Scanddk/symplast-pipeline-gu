import type { AssumptionInput } from '../../schema/rules.ts';

/**
 * Behavior the guide has to pick because the brief does not settle it.
 * Each one is NC and linked to an open question. Only the content owner changes that.
 * The engine reads these ids; changing an answer means changing engine behavior and its tests.
 */
export const assumptions: AssumptionInput[] = [
  {
    id: 'same_day_text_first',
    wording: {
      client: 'If a text and a stage move are due on the same day, the guide shows the text first.',
      internal: 'Skip ahead tie-break: a text checkpoint resolves before a timer expiry that falls on the same simulated day.',
    },
    verification: { status: 'NC', questions: ['OQ-18'] },
  },
  {
    id: 'series_reentry_restarts',
    wording: {
      client: 'If the card comes back to a stage, that stage’s texts start again from the first text.',
      internal: 'Re-entering a series stage without DND re-enrolls from text 1 with fresh waits.',
    },
    verification: { status: 'NC', questions: ['OQ-19'] },
  },
  {
    id: 'series_end_no_change',
    wording: {
      client: 'After the last text sends, the card stays where it is.',
      internal: 'End of series: no stage or status change is modeled.',
    },
    verification: { status: 'NC', questions: ['OQ-7'] },
  },
];
