import type { Wording } from '../schema/common.ts';
import type { Event } from '../schema/rules.ts';
import type { Cast } from '../schema/scenario.ts';
import { defaultCast } from '../content/scenarios/index.ts';
import type { ResolvedConfig } from './resolve.ts';
import { isAvailable, nextScheduled } from './availability.ts';
import { render, type TemplateContext, type View } from './template.ts';
import { snapshotOf, type Cue, type EngineState, type Snapshot, type Step } from './state.ts';

export type StepOptions = { cast?: Cast };

/** What one event did to the draft snapshot, before captions are rendered. */
type Outcome = {
  caption: Wording;
  /** Extra sentences, e.g. "The No Show texts start." */
  extra: Wording[];
  ruleIds: string[];
  cues: Cue[];
  vars?: (view: View) => Record<string, string | number>;
  currentSeriesId?: string;
};

/**
 * The engine: (state, eventId, practiceConfig) → { nextState, step }.
 * Pure. Throws if the event is not available from this state.
 */
export function step(
  state: EngineState,
  eventId: string,
  config: ResolvedConfig,
  options: StepOptions = {},
): { nextState: EngineState; step: Step } {
  const event = config.eventById[eventId];
  if (!event) throw new Error(`Unknown or disabled event "${eventId}" for practice "${config.practice.id}"`);
  const availability = isAvailable(state, event, config);
  if (!availability.ok) throw new Error(`Event "${eventId}" is not available: ${availability.reason}`);

  const before = snapshotOf(state);
  const draft = structuredClone(before);
  const outcome = event.kind === 'skip_ahead' ? skipAhead(draft, event, config) : applyEvent(draft, event, config);

  const cast = options.cast ?? defaultCast;
  const captionFor = (view: View) => {
    const ctx: TemplateContext = { config, view, cast, vars: outcome.vars?.(view), currentSeriesId: outcome.currentSeriesId };
    return [outcome.caption, ...outcome.extra].map((w) => render(w[view], ctx)).join(' ');
  };

  return {
    nextState: { ...draft, history: [...state.history, before] },
    step: {
      id: `${state.history.length + 1}-${eventId}`,
      eventId,
      ruleIds: unique([eventId, ...outcome.ruleIds]),
      captionClient: captionFor('client'),
      captionInternal: captionFor('internal'),
      cues: outcome.cues,
    },
  };
}

/** Undo the last step. Returns the same state when there is nothing to undo. */
export function back(state: EngineState): EngineState {
  if (state.history.length === 0) return state;
  const previous = state.history[state.history.length - 1];
  return { ...structuredClone(previous), history: state.history.slice(0, -1) };
}

function applyEvent(draft: Snapshot, event: Event, config: ResolvedConfig): Outcome {
  const variant = event.captionIf.find((c) => config.isStageEnabled(c.stageEnabled));
  const outcome: Outcome = {
    caption: variant?.caption ?? event.caption,
    extra: [],
    ruleIds: [],
    cues: [],
    currentSeriesId: draft.card ? config.stageById[draft.card.stage]?.seriesId : undefined,
  };
  let why: { stage: string; eventId: string | null } | null = null;

  for (const effect of event.effects) {
    switch (effect.type) {
      case 'create_card': {
        draft.card = { stage: effect.stage, status: 'open', arrivedVia: event.id, showed: false };
        outcome.cues.push(
          { type: 'move_card', from: null, to: effect.stage },
          { type: 'highlight_column', stage: effect.stage },
          { type: 'highlight_trigger', stage: effect.stage, eventId: event.id },
        );
        enterStage(draft, effect.stage, config, outcome);
        why = { stage: effect.stage, eventId: event.id };
        break;
      }
      case 'move': {
        if (effect.onlyIfStageEnabled && !config.isStageEnabled(effect.onlyIfStageEnabled)) break;
        const card = draft.card!;
        const from = card.stage;
        card.stage = effect.to;
        card.arrivedVia = event.id;
        outcome.cues.push(
          { type: 'move_card', from, to: effect.to },
          { type: 'highlight_column', stage: effect.to },
          { type: 'highlight_trigger', stage: effect.to, eventId: event.id },
        );
        enterStage(draft, effect.to, config, outcome);
        why = { stage: effect.to, eventId: event.id };
        break;
      }
      case 'set_status': {
        const card = draft.card!;
        card.status = effect.status;
        draft.timers = {};
        // One visible move per step: if this event also moved the card, it now ends in the closed-out area.
        const move = outcome.cues.find((c) => c.type === 'move_card');
        if (move && move.type === 'move_card') move.to = 'closed_won';
        else outcome.cues.push({ type: 'move_card', from: card.stage, to: 'closed_won' });
        outcome.cues = outcome.cues.filter((c) => c.type !== 'highlight_column');
        outcome.cues.push({ type: 'highlight_column', stage: 'closed_won' });
        why ??= { stage: card.stage, eventId: null };
        break;
      }
      case 'start_timer': {
        const timer = config.timerById[effect.timer];
        draft.timers[timer.id] = { startedOn: draft.day, expiresOn: draft.day + timer.days };
        outcome.cues.push({ type: 'ring', timerId: timer.id });
        outcome.ruleIds.push(timer.id);
        break;
      }
      case 'mark_showed': {
        draft.card!.showed = true;
        outcome.cues.push({ type: 'showed' });
        break;
      }
      case 'dnd_current_series': {
        const seriesId = config.stageById[draft.card!.stage].seriesId!;
        const enrollment = draft.series[seriesId];
        draft.dnd[seriesId] = true;
        enrollment.status = 'stopped_by_staff';
        for (const text of enrollment.texts) {
          if (text.state !== 'upcoming') continue;
          text.state = 'stopped_by_staff';
          outcome.cues.push({ type: 'text', seriesId, textId: text.id, state: 'stopped_by_staff' });
        }
        outcome.ruleIds.push(seriesId, config.dnd.id);
        outcome.currentSeriesId = seriesId;
        why = { stage: draft.card!.stage, eventId: null };
        break;
      }
      case 'none': {
        why = { stage: draft.card!.stage, eventId: null };
        break;
      }
    }
  }

  if (why) outcome.cues.push({ type: 'why', ...why });
  return outcome;
}

/**
 * The card has just arrived in a stage.
 * Timers that can no longer fire are dropped, and the stage's texts start unless staff stopped them.
 */
function enterStage(draft: Snapshot, stageId: string, config: ResolvedConfig, outcome: Outcome) {
  for (const timerId of Object.keys(draft.timers)) {
    if (!config.timerById[timerId].runsWhileIn.includes(stageId)) delete draft.timers[timerId];
  }

  const seriesId = config.stageById[stageId].seriesId;
  const series = seriesId ? config.seriesById[seriesId] : undefined;
  if (!series) return;
  outcome.currentSeriesId = series.id;

  if (draft.dnd[series.id]) {
    outcome.extra.push(config.dnd.blockedCaption);
    outcome.ruleIds.push(config.dnd.id);
    return;
  }

  if (draft.series[series.id]) outcome.ruleIds.push('series_reentry_restarts');
  let dueOn = draft.day;
  draft.series[series.id] = {
    enrolledOn: draft.day,
    status: 'active',
    texts: series.texts.map((text) => {
      dueOn += text.waitDays;
      return { id: text.id, dueOn, state: 'upcoming' as const };
    }),
  };
  outcome.extra.push(series.startCaption);
  outcome.ruleIds.push(series.id);
}

/** Advance the clock to the earliest scheduled thing and resolve exactly that one thing. */
function skipAhead(draft: Snapshot, event: Event, config: ResolvedConfig): Outcome {
  const next = nextScheduled(draft, config)!;
  draft.day = next.day;

  if (next.kind === 'timer') {
    const timer = config.timerById[next.timerId];
    delete draft.timers[timer.id];
    const outcome = applyEvent(draft, config.eventById[timer.firesEvent], config);
    // The arrival was caused by the time event, so "Why?" highlights that trigger.
    return { ...outcome, ruleIds: [event.id, timer.id, timer.firesEvent, ...outcome.ruleIds] };
  }

  const series = config.seriesById[next.seriesId];
  const enrollment = draft.series[series.id];
  const card = draft.card!;
  const check = { open: card.status === 'open', stillInStage: card.stage === series.stageId };
  enrollment.texts[next.textIndex].check = check;
  const reason = !check.open ? 'opportunity_closed' : !check.stillInStage ? 'left_stage' : null;
  const cues: Cue[] = [];
  const ruleIds = [event.id, config.checkpoint.id, series.id];

  if (reason) {
    for (const text of enrollment.texts.slice(next.textIndex)) {
      if (text.state !== 'upcoming') continue;
      text.state = 'skipped';
      text.skipReason = reason;
      cues.push({ type: 'text', seriesId: series.id, textId: text.id, state: 'skipped', reason });
    }
    enrollment.status = 'skipped';
  } else {
    const text = enrollment.texts[next.textIndex];
    text.state = 'sent';
    cues.push({ type: 'text', seriesId: series.id, textId: text.id, state: 'sent' });
    if (enrollment.texts.every((t) => t.state !== 'upcoming')) {
      enrollment.status = 'finished';
      ruleIds.push('series_end_no_change');
    }
  }
  if (Object.values(draft.timers).some((t) => t.expiresOn === next.day)) ruleIds.push('same_day_text_first');
  cues.push({ type: 'why', stage: series.stageId, eventId: null });

  return {
    caption: reason ? config.checkpoint.skippedCaption : config.checkpoint.sentCaption,
    extra: [],
    ruleIds,
    cues,
    currentSeriesId: series.id,
    vars: (view) => ({
      n: next.textIndex + 1,
      ...(reason ? { reason: config.checkpoint.skipReasons[reason][view] } : {}),
    }),
  };
}

const unique = (ids: string[]) => [...new Set(ids)];
