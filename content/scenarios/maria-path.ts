import type { ScenarioInput } from '../../schema/scenario.ts';

/**
 * Maria's path from inquiry to Won. Fictional patient.
 * Steps are event ids only; captions come from the rules unless overridden here.
 */
export const mariaPath: ScenarioInput = {
  id: 'maria_path',
  title: 'From inquiry to Won',
  practice: 'standard',
  cast: { name: 'Maria Lopez', source: 'Website form' },
  steps: [
    { eventId: 'lead_created' },
    { eventId: 'ghl_call' },
    // New Lead texts: the first checkpoint finds the card in Contacted (OQ-1).
    { eventId: 'skip_ahead' },
    // Day 5: moves to No Response, texts start.
    { eventId: 'skip_ahead' },
    { eventId: 'consult_booked' },
    // The next No Response checkpoint finds the card gone, so the texts skip.
    { eventId: 'skip_ahead' },
    { eventId: 'checked_out' },
    // 3 days later: moves to Quoted Nurture, texts start.
    { eventId: 'skip_ahead' },
    { eventId: 'procedure_booked' },
    { eventId: 'procedure_checked_out' },
  ],
};
