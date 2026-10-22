import type { Event } from '../schema/rules.ts';
import type { ResolvedConfig } from './resolve.ts';

/** Events that can bring the card into a stage, in content order. Drives the "Gets here when…" chips. */
export function entryEventsFor(stageId: string, config: ResolvedConfig): Event[] {
  return config.events.filter((event) =>
    event.effects.some(
      (effect) =>
        (effect.type === 'create_card' && effect.stage === stageId) ||
        (effect.type === 'move' &&
          effect.to === stageId &&
          (!effect.onlyIfStageEnabled || config.isStageEnabled(effect.onlyIfStageEnabled))),
    ),
  );
}

/** The timer whose expiry fires this event, if it is a time event. */
export function timerForEvent(eventId: string, config: ResolvedConfig) {
  return config.timers.find((t) => t.firesEvent === eventId) ?? null;
}
