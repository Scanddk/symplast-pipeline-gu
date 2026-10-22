import type { ExampleBoard } from '../../schema/board.ts';

/**
 * Fictional header numbers so the board reads like a real GHL pipeline.
 * Not real practice data and not rules. Keyed by stage id; every stage needs an entry.
 */
export const exampleBoard: ExampleBoard = {
  new_lead: { count: 6, value: 23034 },
  contacted: { count: 6, value: 1500 },
  no_response: { count: 5, value: 75000 },
  booked_appointment: { count: 78, value: 45976 },
  no_show: { count: 44, value: 60328.44 },
  consulted: { count: 4, value: 3334.44 },
  quoted_nurture: { count: 38, value: 95639.99 },
  procedure_booked: { count: 65, value: 239258.43 },
  treatment_completed: { count: 5, value: 59070 },
};
