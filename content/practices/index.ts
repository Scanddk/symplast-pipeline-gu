import { PracticeOverride } from '../../schema/practice.ts';
import { standardPractice } from './standard.ts';
import { treatmentCompletedPractice } from './treatment-completed.ts';

/** Every shipped practice configuration, validated. Add new ones here. */
export const practices = [standardPractice, treatmentCompletedPractice].map((p) => PracticeOverride.parse(p));

export const DEFAULT_PRACTICE_ID = 'standard';
