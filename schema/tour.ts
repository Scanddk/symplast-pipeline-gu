import { z } from 'zod';
import { Id, Wording } from './common.ts';

/** The guided pieces a tour beat can play. Each is a component in src/components. */
export const TourDemo = z.enum([
  /** The practice website's contact form, prefilled: submit it. */
  'web_form',
  /** Click the card, open Notes, read the form submission. */
  'opportunity_notes',
  /** Tap the card's phone button and end the call. */
  'crm_call',
  /** Click the name: contact panel with messaging, notes, and a prefilled task. */
  'contact_panel',
  /** Days roll by on screen before the clock jumps. */
  'time_lapse',
  /** Texts beside the card: the patient asks to book, your team offers a time, the patient agrees. */
  'patient_reply',
  /** Texts beside the card: the first text of the stage's set goes out and the patient writes back. */
  'nurture_reply',
  /** A day goes by to the booked consultation: story only, nothing in the pipeline changes. */
  'consult_day',
  /** Symplast's New Appointment sheet: tap Save. */
  'ehr_new_appointment',
  /** Symplast's appointment window: change the status to Checked Out, then close. */
  'ehr_checkout',
  /** Symplast's New Appointment sheet for the procedure: tap Save. */
  'ehr_book_procedure',
]);

export const TourBeat = z
  .object({
    id: Id,
    /** Short name for "Step n of N". */
    title: z.string().min(1),
    demo: TourDemo,
    /**
     * What the engine does: fire an event, or Skip ahead until a step names this id (an event or a text set).
     * By default when the demo finishes; `firesAt: 'start'` fires as the beat begins (e.g. a text goes out, then
     * the conversation plays).
     */
    fires: z.union([z.object({ event: Id }).strict(), z.object({ skipUntil: Id }).strict()]).optional(),
    firesAt: z.enum(['start', 'end']).default('end'),
    /**
     * For time lapses: what the card says once the days have gone by (tokens: {timer:id}, {firstName}, {start}),
     * and optionally an emoji that crosses the sky instead of the sun on a given day, counted from the first day
     * of the lapse (0 = the first day).
     */
    lapse: z
      .object({ title: Wording, body: Wording, sunFaces: z.record(z.string().regex(/^\d+$/), z.string().min(1)).optional() })
      .strict()
      .optional(),
    /** Shown in the caption bar while the beat runs. Tokens: {name}, {firstName}, {timer:id}. */
    caption: Wording,
    /** Start the next beat straight away when this one finishes (e.g. a reply that leads into booking). */
    autoAdvance: z.boolean().default(false),
    /**
     * reveal_card: the beat plays over the whole CRM (shown wide); once it finishes, the view pushes in
     * to the pipeline and on to the card.
     */
    camera: z.enum(['reveal_card']).optional(),
  })
  .strict()
  .refine((beat) => !['time_lapse', 'consult_day'].includes(beat.demo) || beat.lapse, {
    message: 'A time lapse beat needs `lapse` (what the card says once the days have gone by).',
  });

export const Tour = z
  .object({
    intro: Wording,
    outro: Wording,
    beats: z.array(TourBeat).min(1),
  })
  .strict();

export type TourDemo = z.infer<typeof TourDemo>;
export type TourBeat = z.infer<typeof TourBeat>;
export type Tour = z.infer<typeof Tour>;
export type TourInput = z.input<typeof Tour>;
