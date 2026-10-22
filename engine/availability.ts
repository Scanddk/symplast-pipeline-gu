import type { Event } from '../schema/rules.ts';
import type { ResolvedConfig } from './resolve.ts';
import type { Snapshot } from './state.ts';

export type Scheduled =
  | { kind: 'text'; seriesId: string; textIndex: number; day: number }
  | { kind: 'timer'; timerId: string; day: number };

/**
 * The earliest thing that will happen on its own: a timer expiry or a text checkpoint.
 * Ties on the same day resolve texts first (assumption same_day_text_first, OQ-18),
 * then in board order.
 */
export function nextScheduled(state: Snapshot, config: ResolvedConfig): Scheduled | null {
  const candidates: Scheduled[] = [];
  const card = state.card;

  for (const [timerId, timer] of Object.entries(state.timers)) {
    const rule = config.timerById[timerId];
    if (card?.status === 'open' && rule.runsWhileIn.includes(card.stage)) {
      candidates.push({ kind: 'timer', timerId, day: timer.expiresOn });
    }
  }
  for (const [seriesId, enrollment] of Object.entries(state.series)) {
    if (enrollment.status !== 'active') continue;
    const textIndex = enrollment.texts.findIndex((t) => t.state === 'upcoming');
    if (textIndex >= 0) {
      candidates.push({ kind: 'text', seriesId, textIndex, day: enrollment.texts[textIndex].dueOn });
    }
  }

  const stageOrder = (s: Scheduled) => {
    const stageId =
      s.kind === 'text' ? config.seriesById[s.seriesId].stageId : config.timerById[s.timerId].runsWhileIn[0];
    return config.allStages.findIndex((stage) => stage.id === stageId);
  };
  candidates.sort(
    (a, b) =>
      a.day - b.day ||
      (a.kind === b.kind ? 0 : a.kind === 'text' ? -1 : 1) ||
      stageOrder(a) - stageOrder(b),
  );
  return candidates[0] ?? null;
}

/** The series attached to the card's current stage, if that series is still running and not stopped by staff. */
export function activeSeriesForCard(state: Snapshot, config: ResolvedConfig): string | null {
  const card = state.card;
  if (!card || card.status !== 'open') return null;
  const seriesId = config.stageById[card.stage]?.seriesId;
  if (!seriesId || !config.seriesById[seriesId] || state.dnd[seriesId]) return null;
  return state.series[seriesId]?.status === 'active' ? seriesId : null;
}

export type Availability = { ok: true } | { ok: false; reason: string };

export function isAvailable(state: Snapshot, event: Event, config: ResolvedConfig): Availability {
  if (!config.eventById[event.id]) return { ok: false, reason: 'turned off for this practice' };
  if (event.kind === 'time') return { ok: false, reason: 'happens on its own; use Skip ahead' };
  if (event.kind === 'skip_ahead') {
    return nextScheduled(state, config)
      ? { ok: true }
      : { ok: false, reason: config.copy.events.nothingScheduled };
  }

  const { noCard, stages, whileSeriesActive } = event.availableFrom;
  const card = state.card;
  if (noCard) return card === null ? { ok: true } : { ok: false, reason: 'a card already exists' };
  if (!card) return { ok: false, reason: 'no card yet' };
  if (card.status !== 'open') return { ok: false, reason: 'the opportunity is closed' };
  if (stages.includes(card.stage)) return { ok: true };
  if (whileSeriesActive && activeSeriesForCard(state, config)) return { ok: true };
  return { ok: false, reason: `not available from ${card.stage}` };
}

export type OfferedEvent = { event: Event; enabled: boolean; reason?: string };

/**
 * What the events panel offers right now: every available action, then Skip ahead
 * (always listed, disabled with its reason when nothing is scheduled).
 */
export function availableEvents(state: Snapshot, config: ResolvedConfig): OfferedEvent[] {
  const offered: OfferedEvent[] = [];
  for (const event of config.events) {
    if (event.kind !== 'action') continue;
    if (isAvailable(state, event, config).ok) offered.push({ event, enabled: true });
  }
  const skip = config.events.find((e) => e.kind === 'skip_ahead');
  if (skip && state.card) {
    const availability = isAvailable(state, skip, config);
    offered.push(
      availability.ok ? { event: skip, enabled: true } : { event: skip, enabled: false, reason: availability.reason },
    );
  }
  return offered;
}
