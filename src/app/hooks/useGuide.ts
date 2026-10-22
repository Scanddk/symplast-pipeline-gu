import { useMemo, useReducer } from 'react';
import { availableEvents, back, initialState, step } from '../../../engine/index.ts';
import type { EngineState, ResolvedConfig, Step } from '../../../engine/index.ts';
import type { Cast } from '../../../schema/scenario.ts';

type GuideState = {
  engine: EngineState;
  steps: Step[];
  /** Only a forward step animates. Back and Reset settle instantly. */
  lastAction: 'step' | 'back' | 'reset' | null;
};

type Action =
  | { type: 'event'; eventId: string }
  /** Skip ahead until the given event resolves (e.g. "time passes until the window ends"). Only the last step animates. */
  | { type: 'skipUntil'; eventId: string }
  /** Undo steps until only `count` remain. */
  | { type: 'rewind'; count: number }
  | { type: 'back' }
  | { type: 'reset' };

/** Safety stop for skipUntil. */
const MAX_SKIPS = 20;

const fresh = (): GuideState => ({ engine: initialState(), steps: [], lastAction: null });

/** Wraps the pure engine for React. Advances one step per user action, never on timers. */
export function useGuide(config: ResolvedConfig, cast: Cast) {
  const [state, dispatch] = useReducer((current: GuideState, action: Action): GuideState => {
    switch (action.type) {
      case 'event': {
        const result = step(current.engine, action.eventId, config, { cast });
        return { engine: result.nextState, steps: [...current.steps, result.step], lastAction: 'step' };
      }
      case 'skipUntil': {
        let engine = current.engine;
        const steps = [...current.steps];
        for (let i = 0; i < MAX_SKIPS; i++) {
          const result = step(engine, 'skip_ahead', config, { cast });
          engine = result.nextState;
          steps.push(result.step);
          if (result.step.ruleIds.includes(action.eventId)) break;
        }
        return { engine, steps, lastAction: 'step' };
      }
      case 'rewind': {
        let engine = current.engine;
        for (let i = current.steps.length; i > action.count; i--) engine = back(engine);
        return { engine, steps: current.steps.slice(0, action.count), lastAction: 'back' };
      }
      case 'back':
        if (current.steps.length === 0) return current;
        return { engine: back(current.engine), steps: current.steps.slice(0, -1), lastAction: 'back' };
      case 'reset':
        return { ...fresh(), lastAction: 'reset' };
    }
  }, undefined, fresh);

  const offered = useMemo(() => availableEvents(state.engine, config), [state.engine, config]);
  const currentStep = state.steps[state.steps.length - 1] ?? null;

  return {
    engine: state.engine,
    currentStep,
    /** The step that should animate now, if any. */
    animatedStep: state.lastAction === 'step' ? currentStep : null,
    offered,
    canGoBack: state.steps.length > 0,
    stepCount: state.steps.length,
    fire: (eventId: string) => dispatch({ type: 'event', eventId }),
    skipUntil: (eventId: string) => dispatch({ type: 'skipUntil', eventId }),
    rewindTo: (count: number) => dispatch({ type: 'rewind', count }),
    goBack: () => dispatch({ type: 'back' }),
    reset: () => dispatch({ type: 'reset' }),
  };
}
