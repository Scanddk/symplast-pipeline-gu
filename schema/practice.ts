import { z } from 'zod';
import { Id } from './common.ts';

/**
 * A practice is written only as overrides on the Symplast standard.
 * Overrides switch things on or off or tune numbers. They never restate a rule.
 */
export const PracticeOverride = z
  .object({
    id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'practice ids are kebab-case (used in ?practice=)'),
    name: z.string().min(1),
    stages: z.record(Id, z.object({ enabled: z.boolean() }).strict()).default({}),
    events: z.record(Id, z.object({ enabled: z.boolean() }).strict()).default({}),
    timers: z.record(Id, z.object({ days: z.number().int().positive() }).strict()).default({}),
  })
  .strict();

export type PracticeOverride = z.infer<typeof PracticeOverride>;
export type PracticeOverrideInput = z.input<typeof PracticeOverride>;
