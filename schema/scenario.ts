import { z } from 'zod';
import { Id, Wording } from './common.ts';

/**
 * A guided story: an ordered list of event ids. Scenarios reference rules and never restate them.
 * Caption overrides change the story wording for one step only.
 */
export const Scenario = z.object({
  id: Id,
  title: z.string().min(1),
  practice: z.string().min(1),
  /** Fictional patient. All patient data in this project is fictional. */
  cast: z.object({ name: z.string().min(1), source: z.string().min(1) }),
  /** Events played silently before the story starts, to put the card in place. */
  setup: z.array(Id).default([]),
  /** Caption shown before the first step. One idea, at most two sentences. */
  intro: Wording.optional(),
  /** The text series a lesson chapter is about; the story view draws its timeline. */
  focusSeries: Id.optional(),
  steps: z
    .array(
      z.object({
        eventId: Id,
        caption: z.object({ client: z.string(), internal: z.string() }).partial().optional(),
      }),
    )
    .min(1),
});

export type Scenario = z.infer<typeof Scenario>;
export type ScenarioInput = z.input<typeof Scenario>;
export type Cast = Scenario['cast'];
