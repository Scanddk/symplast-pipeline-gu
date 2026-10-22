import { z } from 'zod';
import { Id } from './common.ts';

/**
 * Fictional numbers for the GHL-style stage headers ("44 opportunities  $60,328.44").
 * Display only: they are not rules, carry no verification status, and the engine never reads them.
 */
export const ExampleBoard = z.record(
  Id,
  z.object({ count: z.number().int().nonnegative(), value: z.number().nonnegative() }).strict(),
);

export type ExampleBoard = z.infer<typeof ExampleBoard>;
