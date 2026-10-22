import type { PracticeOverrideInput } from '../../schema/practice.ts';

/**
 * Example variant: the Treatment Completed stage is on and the estimate move is off.
 * Overrides only switch things. The rules themselves live in content/rules/.
 */
export const treatmentCompletedPractice: PracticeOverrideInput = {
  id: 'treatment-completed',
  name: 'Example: Treatment Completed practice',
  stages: { treatment_completed: { enabled: true } },
  events: { estimate_created: { enabled: false } },
};
