import { z } from 'zod';
import { Actor, Id, Verification, Wording } from './common.ts';

/** Stage-dot colors observed in the GHL header strip. Values live in src/styles/tokens.css. */
export const StageDot = z.enum(['blue', 'gray', 'orange', 'red', 'orange_red', 'teal']);

export const DraftWording = Wording.extend({ draft: z.boolean() });

export const Stage = z.object({
  id: Id,
  /** Must match the GHL display name exactly, punctuation included. */
  name: z.string().min(1),
  dot: StageDot,
  /** Stages with a series show 💬 before the name. The emoji is derived, never typed into `name`. */
  seriesId: Id.optional(),
  enabledByDefault: z.boolean(),
  /** One-line meaning. `draft: true` until the content owner approves the wording. */
  meaning: DraftWording,
  /** "Your part" copy. `draft: true` until the content owner approves the wording. */
  yourPart: DraftWording,
  verification: Verification,
});

export const Timer = z.object({
  id: Id,
  /** The one place each duration lives. Copy refers to it as {timer:<id>}. */
  days: z.number().int().positive(),
  /** The timer can only fire while the card sits in one of these stages. */
  runsWhileIn: z.array(Id).min(1),
  /** The time event that resolves when the timer expires. */
  firesEvent: Id,
  name: Wording,
  /** Countdown ring label. Tokens: {elapsed}, {total}. */
  ring: Wording,
  verification: Verification,
});

export const TextStep = z.object({
  id: Id,
  /** What the patient reads. Tokens: {firstName}. Example wording until the practice's real copy is in. */
  message: z.string().min(1),
  /** Days to wait after entering the stage (first text) or after the previous text. */
  waitDays: z.number().int().nonnegative(),
});

export const Series = z.object({
  id: Id,
  stageId: Id,
  name: Wording,
  purpose: Wording,
  /** Placeholder texts until the real series is confirmed. */
  texts: z.array(TextStep).min(1),
  /** True while the timing is illustrative. The lane is then labeled "Example timing". */
  exampleTiming: z.boolean(),
  /** True while `message` wording is illustrative. The overlay is labeled "Example message". */
  exampleMessages: z.boolean(),
  /** Caption sentence appended when the card enters the stage and the texts start. */
  startCaption: Wording,
  dnd: z.object({
    /** The per-series checkbox label in the opportunity details. */
    label: Wording,
    verification: Verification,
  }),
  verification: Verification,
});

export const Effect = z.discriminatedUnion('type', [
  z.object({ type: z.literal('create_card'), stage: Id }),
  z.object({ type: z.literal('move'), to: Id, onlyIfStageEnabled: Id.optional() }),
  z.object({ type: z.literal('set_status'), status: z.literal('won') }),
  z.object({ type: z.literal('start_timer'), timer: Id }),
  z.object({ type: z.literal('mark_showed') }),
  z.object({ type: z.literal('dnd_current_series') }),
  z.object({ type: z.literal('none') }),
]);

export const Event = z.object({
  id: Id,
  actor: Actor,
  /**
   * action: offered as a button when available.
   * time: never a button; resolved by Skip ahead when its timer expires.
   * skip_ahead: the Skip ahead control itself.
   */
  kind: z.enum(['action', 'time', 'skip_ahead']),
  label: Wording,
  availableFrom: z
    .object({
      noCard: z.boolean().default(false),
      stages: z.array(Id).default([]),
      whileSeriesActive: z.boolean().default(false),
    })
    .default({}),
  effects: z.array(Effect).default([]),
  /** Step caption. Tokens: {name}, {source}, {stage:<id>}, {timer:<id>}, {dnd:<seriesId>}. */
  caption: Wording,
  /** Replaces `caption` when the named stage is enabled for the practice. */
  captionIf: z.array(z.object({ stageEnabled: Id, caption: Wording })).default([]),
  /** Present when practices can turn the event off. Shows the "may differ at your practice" marker. */
  configurable: z.object({ enabledByDefault: z.boolean() }).optional(),
  verification: Verification,
});

/** Modeling choices the brief does not settle. Always NC until the content owner decides. */
export const Assumption = z.object({
  id: Id,
  wording: Wording,
  verification: Verification,
});

export const Checkpoint = z.object({
  id: Id,
  wording: Wording,
  skipReasons: z.object({ left_stage: Wording, opportunity_closed: Wording }),
  /** The two questions the check asks, shown with ✓/✗ once it has run. Token: {stage}. */
  questions: z.object({ inStage: Wording, open: Wording }),
  /** Tokens: {stage}, {dnd}. Rendered per series for the "Texts stop when…" line. */
  stopsWhen: Wording,
  /** Captions for Skip ahead resolving a text. Tokens: {name}, {series}, {n}, {reason}. */
  sentCaption: Wording,
  skippedCaption: Wording,
  verification: Verification,
});

export const DndRule = z.object({
  id: Id,
  wording: Wording,
  /** Appended to a caption when the card re-enters a stage whose series was stopped by staff. */
  blockedCaption: Wording,
  verification: Verification,
});

export type StageDot = z.infer<typeof StageDot>;
export type Stage = z.infer<typeof Stage>;
export type Timer = z.infer<typeof Timer>;
export type Series = z.infer<typeof Series>;
export type Effect = z.infer<typeof Effect>;
export type Event = z.infer<typeof Event>;
export type Assumption = z.infer<typeof Assumption>;
export type Checkpoint = z.infer<typeof Checkpoint>;
export type DndRule = z.infer<typeof DndRule>;

export type StageInput = z.input<typeof Stage>;
export type TimerInput = z.input<typeof Timer>;
export type SeriesInput = z.input<typeof Series>;
export type EventInput = z.input<typeof Event>;
export type AssumptionInput = z.input<typeof Assumption>;

/** The full Symplast standard, as assembled in content/rules/index.ts. */
export const Standard = z.object({
  stages: z.array(Stage).min(1),
  timers: z.array(Timer),
  series: z.array(Series),
  events: z.array(Event).min(1),
  checkpoint: Checkpoint,
  dnd: DndRule,
  assumptions: z.array(Assumption),
});

export type Standard = z.infer<typeof Standard>;
