import type { Event, Series, Stage, Standard, Timer, Assumption, Checkpoint, DndRule } from '../schema/rules.ts';
import type { PracticeOverride } from '../schema/practice.ts';
import type { Copy } from '../schema/copy.ts';
import type { ExampleBoard } from '../schema/board.ts';
import { standard as standardContent, copy as standardCopy, exampleBoard } from '../content/rules/index.ts';
import { practices, DEFAULT_PRACTICE_ID } from '../content/practices/index.ts';

/** The standard with one practice's overrides applied. Everything the engine and UI read. */
export type ResolvedConfig = {
  practice: { id: string; name: string };
  /** Enabled stages, in board order. */
  stages: Stage[];
  /** Every stage in the standard, enabled or not. */
  allStages: Stage[];
  stageById: Record<string, Stage>;
  isStageEnabled: (stageId: string) => boolean;
  /** Enabled events, in content order. */
  events: Event[];
  eventById: Record<string, Event>;
  timers: Timer[];
  timerById: Record<string, Timer>;
  /** Series that belong to enabled stages. */
  series: Series[];
  seriesById: Record<string, Series>;
  checkpoint: Checkpoint;
  dnd: DndRule;
  assumptions: Assumption[];
  copy: Copy;
  /** Fictional header numbers. Display only; the engine never reads them. */
  exampleBoard: ExampleBoard;
};

const byId = <T extends { id: string }>(items: T[]) =>
  Object.fromEntries(items.map((item) => [item.id, item])) as Record<string, T>;

export function resolvePractice(
  override: PracticeOverride,
  std: Standard = standardContent,
  copy: Copy = standardCopy,
): ResolvedConfig {
  const allIds = {
    stages: new Set(std.stages.map((s) => s.id)),
    events: new Set(std.events.map((e) => e.id)),
    timers: new Set(std.timers.map((t) => t.id)),
  };
  for (const kind of ['stages', 'events', 'timers'] as const) {
    for (const id of Object.keys(override[kind])) {
      if (!allIds[kind].has(id)) {
        throw new Error(`Practice "${override.id}" overrides unknown ${kind.slice(0, -1)} "${id}"`);
      }
    }
  }
  for (const id of Object.keys(override.events)) {
    const event = std.events.find((e) => e.id === id)!;
    if (!event.configurable) {
      throw new Error(`Practice "${override.id}" switches event "${id}", which is not configurable`);
    }
  }

  const enabledStageIds = new Set(
    std.stages.filter((s) => override.stages[s.id]?.enabled ?? s.enabledByDefault).map((s) => s.id),
  );
  const stages = std.stages.filter((s) => enabledStageIds.has(s.id));
  const events = std.events.filter(
    (e) => override.events[e.id]?.enabled ?? e.configurable?.enabledByDefault ?? true,
  );
  const timers = std.timers.map((t) => ({ ...t, days: override.timers[t.id]?.days ?? t.days }));
  const series = std.series.filter((s) => enabledStageIds.has(s.stageId));

  return {
    practice: { id: override.id, name: override.name },
    stages,
    allStages: std.stages,
    stageById: byId(std.stages),
    isStageEnabled: (stageId) => enabledStageIds.has(stageId),
    events,
    eventById: byId(events),
    timers,
    timerById: byId(timers),
    series,
    seriesById: byId(series),
    checkpoint: std.checkpoint,
    dnd: std.dnd,
    assumptions: std.assumptions,
    copy,
    exampleBoard,
  };
}

/** Resolve a shipped practice by id. Unknown ids return null so the UI can fall back to the standard. */
export function getPracticeConfig(id: string = DEFAULT_PRACTICE_ID): ResolvedConfig | null {
  const practice = practices.find((p) => p.id === id);
  return practice ? resolvePractice(practice) : null;
}
