export type OpportunityStatus = 'open' | 'won' | 'lost' | 'abandoned';

export type TextState = 'upcoming' | 'sent' | 'skipped' | 'stopped_by_staff';
export type SkipReason = 'left_stage' | 'opportunity_closed';

export type TextProgress = {
  id: string;
  /** Simulated day the checkpoint before this text runs. */
  dueOn: number;
  state: TextState;
  skipReason?: SkipReason;
  /** What the check before this text found. Set only on the text whose check actually ran. */
  check?: { stillInStage: boolean; open: boolean };
};

export type Enrollment = {
  enrolledOn: number;
  status: 'active' | 'finished' | 'skipped' | 'stopped_by_staff';
  texts: TextProgress[];
};

export type Card = {
  stage: string;
  /** lost and abandoned are typed for later milestones; nothing reaches them in M1. */
  status: OpportunityStatus;
  arrivedVia: string;
  /** Appointment marked Showed in GHL (set by Symplast checkout). */
  showed: boolean;
};

export type ActiveTimer = { startedOn: number; expiresOn: number };

/** Everything about the simulation at one moment. */
export type Snapshot = {
  day: number;
  card: Card | null;
  timers: Record<string, ActiveTimer>;
  series: Record<string, Enrollment>;
  /** DND Nurture checked, per series. */
  dnd: Record<string, true>;
};

export type EngineState = Snapshot & {
  /** Earlier snapshots, oldest first. Back restores the last one. */
  history: Snapshot[];
};

export type Cue =
  | { type: 'move_card'; from: string | null; to: string | 'closed_won' }
  | { type: 'highlight_column'; stage: string | 'closed_won' }
  | { type: 'highlight_trigger'; stage: string; eventId: string }
  | { type: 'text'; seriesId: string; textId: string; state: TextState; reason?: SkipReason }
  | { type: 'ring'; timerId: string }
  | { type: 'showed' }
  /** Where the caption's "Why?" link points. eventId is the trigger to highlight, if any. */
  | { type: 'why'; stage: string; eventId: string | null };

/** The unit everything else hangs on: one user action, one caption, one set of cues. */
export type Step = {
  id: string;
  eventId: string;
  ruleIds: string[];
  captionClient: string;
  captionInternal: string;
  cues: Cue[];
  /** Reserved for narration. One clip per step. */
  audio?: string;
};

export function initialState(): EngineState {
  return { day: 0, card: null, timers: {}, series: {}, dnd: {}, history: [] };
}

export function snapshotOf(state: EngineState): Snapshot {
  const { history: _history, ...snapshot } = state;
  return structuredClone(snapshot);
}
