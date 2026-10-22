import { z } from 'zod';
import { Tour } from './tour.ts';

/**
 * A lesson on the main menu. Lessons pick a presentation mode the app already has;
 * new modes are added in src/ and listed here.
 */
export const LessonMode = z.enum([
  /** The interactive board: events, captions, card movement, text lanes. */
  'board',
  /** Every stage's four slots as a list. */
  'reference',
  /** Guided chapters: an overview, then one scenario per chapter stepped with Next/Back. */
  'story',
]);

export const LessonIcon = z.enum(['board', 'texts', 'reference']);

/** Guided demos a board lesson can play in place of firing an event straight away. */
export const LessonDemo = z.enum([
  /** The Symplast appointment window: change the status to Checked Out, then close. */
  'ehr_checkout',
  /** The practice's website contact form, already filled in: submit it. */
  'web_form',
]);

export const Lesson = z
  .object({
    /** Used in the URL: ?lesson=<id>. */
    id: z.string().regex(/^[a-z][a-z0-9-]*$/, 'lesson ids are kebab-case'),
    title: z.string().min(1),
    summary: z.string().min(1),
    /** "You'll learn" bullets on the menu card. */
    learn: z.array(z.string().min(1)).min(1).max(4),
    icon: LessonIcon,
    /** Coming-soon lessons show on the menu but can't be opened. */
    status: z.enum(['available', 'coming_soon']),
    mode: LessonMode.optional(),
    /** Scenario ids, in order. Story lessons only. */
    chapters: z.array(z.string()).min(1).optional(),
    /** Board lessons: event id → demo played when that event's button is pressed. */
    demos: z.record(z.string(), LessonDemo).optional(),
    /** Board lessons: a guided tour that plays first; free play unlocks when it ends or is skipped. */
    tour: Tour.optional(),
  })
  .strict()
  .refine((l) => l.status === 'coming_soon' || l.mode !== undefined, 'available lessons need a mode')
  .refine((l) => l.mode !== 'story' || l.chapters !== undefined, 'story lessons need chapters');

export type Lesson = z.infer<typeof Lesson>;
export type LessonInput = z.input<typeof Lesson>;
export type LessonMode = z.infer<typeof LessonMode>;
export type LessonDemo = z.infer<typeof LessonDemo>;
