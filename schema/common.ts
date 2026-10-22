import { z } from 'zod';

/** snake_case identifier used for stages, events, timers, series, and rules. */
export const Id = z.string().regex(/^[a-z][a-z0-9_]*$/, 'ids are snake_case');

/** Reference to an entry in OPEN_QUESTIONS.md, e.g. "OQ-4". */
export const QuestionRef = z.string().regex(/^OQ-\d+$/, 'question refs look like OQ-4');

/**
 * Every rule carries a verification status.
 * V  = verified. NC = needs confirmation.
 * A V rule can still have unverified parts (`ncParts`); those count as NC for
 * the content report and the strict build.
 * Only the content owner changes NC to V. Never change it in code review or by tooling.
 */
export const Verification = z.object({
  status: z.enum(['V', 'NC']),
  questions: z.array(QuestionRef).default([]),
  ncParts: z.array(z.string()).default([]),
});

/** Every rule has client wording (plain, for practice staff) and internal wording (mechanics). */
export const Wording = z.object({
  client: z.string().min(1),
  internal: z.string().min(1),
});

export const Actor = z.enum(['staff_symplast', 'staff_ghl', 'staff_other', 'patient', 'time']);

export type Verification = z.infer<typeof Verification>;
export type Wording = z.infer<typeof Wording>;
export type Actor = z.infer<typeof Actor>;
