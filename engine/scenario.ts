import type { Scenario } from '../schema/scenario.ts';
import type { ResolvedConfig } from './resolve.ts';
import { initialState, type EngineState, type Step } from './state.ts';
import { step } from './step.ts';

/** One point in a story: the state after a step, and the step that got there (null for the opening frame). */
export type Frame = { state: EngineState; step: Step | null };

/**
 * Play a scenario through the engine: setup events silently, then one frame per story step.
 * Pure. Throws if any event isn't available when the scenario uses it.
 */
export function playScenario(scenario: Scenario, config: ResolvedConfig): Frame[] {
  const options = { cast: scenario.cast };
  let state = initialState();
  for (const eventId of scenario.setup) state = step(state, eventId, config, options).nextState;
  const frames: Frame[] = [{ state, step: null }];
  for (const storyStep of scenario.steps) {
    const result = step(state, storyStep.eventId, config, options);
    state = result.nextState;
    const override = storyStep.caption;
    frames.push({
      state,
      step: {
        ...result.step,
        captionClient: override?.client ?? result.step.captionClient,
        captionInternal: override?.internal ?? result.step.captionInternal,
      },
    });
  }
  return frames;
}
