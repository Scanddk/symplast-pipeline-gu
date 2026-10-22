import type { TimerInput } from '../../schema/rules.ts';

/**
 * Every duration in the guide lives here. Changing a delay is a one-line edit to `days`.
 * Timers start through a `start_timer` effect on an event (see events.ts).
 */
export const timers: TimerInput[] = [
  {
    id: 'lead_window',
    days: 5,
    runsWhileIn: ['new_lead', 'contacted'],
    firesEvent: 'five_days_pass',
    name: {
      client: 'time to book a consultation',
      internal: 'Schedule window measured from opportunity creation. Not reset by moving to Contacted.',
    },
    ring: {
      client: 'Day {elapsed} of {total}',
      internal: 'lead_window: day {elapsed} of {total}',
    },
    verification: {
      status: 'V',
      questions: ['OQ-3'],
      ncParts: ['What counts as "scheduled"', 'What happens if a lead books and then cancels before the window ends'],
    },
  },
  {
    id: 'quote_window',
    days: 3,
    runsWhileIn: ['consulted'],
    firesEvent: 'three_days_pass',
    name: {
      client: 'time to book a procedure',
      internal: 'Quote window started by Symplast checkout.',
    },
    ring: {
      client: 'Day {elapsed} of {total}',
      internal: 'quote_window: day {elapsed} of {total}',
    },
    verification: {
      status: 'V',
      questions: ['OQ-4'],
      ncParts: ['Whether the window starts at checkout or when the card enters Consulted'],
    },
  },
];
