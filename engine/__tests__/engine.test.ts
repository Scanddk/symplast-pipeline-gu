import { describe, expect, it } from 'vitest';
import { practices } from '../../content/practices/index.ts';
import { availableEvents, back, getPracticeConfig, initialState, resolvePractice, step } from '../index.ts';
import type { EngineState, ResolvedConfig, Step } from '../index.ts';

const standard = getPracticeConfig('standard')!;
const treatmentCompleted = getPracticeConfig('treatment-completed')!;
/** Durations come from content, so tests keep passing when a delay changes in timers.ts. */
const LEAD = standard.timerById.lead_window.days;
const QUOTE = standard.timerById.quote_window.days;

function play(eventIds: string[], config: ResolvedConfig = standard) {
  let state: EngineState = initialState();
  const steps: Step[] = [];
  for (const id of eventIds) {
    const result = step(state, id, config);
    state = result.nextState;
    steps.push(result.step);
  }
  return { state, steps, last: steps[steps.length - 1] };
}

/** Booked, with the New Lead checkpoint already resolved so nothing from New Lead is pending. */
const BOOKED = ['lead_created', 'consult_booked', 'skip_ahead'];

const offered = (state: EngineState, config = standard) =>
  availableEvents(state, config)
    .filter((o) => o.enabled)
    .map((o) => o.event.id);

describe('lead window', () => {
  it('does not reset when the card moves to Contacted', () => {
    const { state } = play(['lead_created', 'skip_ahead', 'ghl_call']);
    expect(state.card?.stage).toBe('contacted');
    expect(state.day).toBe(1);
    expect(state.timers.lead_window).toEqual({ startedOn: 0, expiresOn: LEAD });
  });

  it('moves the card to No Response when the window ends and starts its texts', () => {
    const { state, last } = play(['lead_created', 'ghl_call', 'skip_ahead', 'skip_ahead']);
    expect(state.day).toBe(LEAD);
    expect(state.card?.stage).toBe('no_response');
    expect(state.timers.lead_window).toBeUndefined();
    expect(state.series.no_response_texts.status).toBe('active');
    expect(last.ruleIds).toEqual(expect.arrayContaining(['skip_ahead', 'lead_window', 'five_days_pass']));
    expect(last.cues).toContainEqual({ type: 'move_card', from: 'contacted', to: 'no_response' });
    expect(last.cues).toContainEqual({ type: 'why', stage: 'no_response', eventId: 'five_days_pass' });
    expect(last.captionClient).toContain(`${LEAD} days`);
  });

  it('does not fire once a consultation is booked', () => {
    const { state } = play(['lead_created', 'consult_booked']);
    expect(state.timers).toEqual({});
  });

  it('is never offered as a button; only Skip ahead reaches it', () => {
    const { state } = play(['lead_created']);
    expect(offered(state)).not.toContain('five_days_pass');
    expect(offered(state)).toContain('skip_ahead');
  });
});

describe('text checkpoint', () => {
  it('sends a text while the card is still in the stage', () => {
    const { state, last } = play(['lead_created', 'skip_ahead']);
    expect(state.series.new_lead_texts.texts.map((t) => t.state)).toEqual(['sent', 'upcoming', 'upcoming']);
    expect(last.captionClient).toBe('Maria Lopez gets text 1 of the New Lead texts.');
  });

  it('skips that text and every later one after the card changes stage', () => {
    const { state, last } = play(['lead_created', 'ghl_call', 'skip_ahead']);
    const enrollment = state.series.new_lead_texts;
    expect(enrollment.status).toBe('skipped');
    expect(enrollment.texts.map((t) => [t.state, t.skipReason])).toEqual([
      ['skipped', 'left_stage'],
      ['skipped', 'left_stage'],
      ['skipped', 'left_stage'],
    ]);
    expect(last.captionClient).toContain('card left this stage');
  });

  it('waits for the scheduled checkpoint instead of skipping on the move itself', () => {
    const { state } = play(['lead_created', 'ghl_call', 'skip_ahead', 'skip_ahead', 'consult_booked']);
    expect(state.series.no_response_texts.texts.every((t) => t.state === 'upcoming')).toBe(true);
    const after = step(state, 'skip_ahead', standard).nextState;
    expect(after.series.no_response_texts.texts.every((t) => t.state === 'skipped')).toBe(true);
  });

  it('records what each check found, only on the text whose check ran', () => {
    const passed = play(['lead_created', 'skip_ahead']).state.series.new_lead_texts.texts;
    expect(passed[0].check).toEqual({ stillInStage: true, open: true });
    expect(passed[1].check).toBeUndefined();
    const failed = play(['lead_created', 'consult_booked', 'skip_ahead']).state.series.new_lead_texts.texts;
    expect(failed[0].check).toEqual({ stillInStage: false, open: true });
    expect(failed[1].check).toBeUndefined();
  });

  it('reports "opportunity closed" when the opportunity is no longer open', () => {
    const { state } = play([...BOOKED, 'checked_out', 'skip_ahead', 'procedure_booked', 'procedure_checked_out', 'skip_ahead']);
    expect(state.card?.status).toBe('won');
    expect(state.series.quoted_nurture_texts.texts[0]).toMatchObject({ state: 'skipped', skipReason: 'opportunity_closed' });
  });
});

describe('DND Nurture', () => {
  const toNoShow = ['lead_created', 'consult_booked', 'marked_no_show'];

  it('is offered only while the stage has an active series', () => {
    expect(offered(play(['lead_created', 'ghl_call']).state)).not.toContain('dnd_checked');
    expect(offered(play(toNoShow).state)).toContain('dnd_checked');
  });

  it('stops the series right away with its own state', () => {
    const { state, last } = play([...toNoShow, 'dnd_checked']);
    expect(state.series.no_show_texts.status).toBe('stopped_by_staff');
    expect(state.series.no_show_texts.texts.map((t) => t.state)).toEqual(['stopped_by_staff', 'stopped_by_staff', 'stopped_by_staff']);
    expect(state.dnd.no_show_texts).toBe(true);
    expect(last.captionClient).toContain('No Show Nurture');
    expect(offered(state)).not.toContain('dnd_checked');
  });

  it('affects only that series', () => {
    const { state } = play([...toNoShow, 'dnd_checked']);
    expect(state.dnd).toEqual({ no_show_texts: true });
    expect(state.series.new_lead_texts.status).toBe('active');
  });

  it('blocks re-entry into the series', () => {
    const { state, last } = play([...toNoShow, 'dnd_checked', 'consult_booked', 'marked_no_show']);
    expect(state.card?.stage).toBe('no_show');
    expect(state.series.no_show_texts.status).toBe('stopped_by_staff');
    expect(last.captionClient).toContain('don’t start');
    expect(last.ruleIds).toContain('dnd_nurture');
  });

  it('without DND, re-entry restarts the series (assumption, OQ-19)', () => {
    const { state, last } = play([...toNoShow, 'consult_booked', 'marked_no_show']);
    expect(state.series.no_show_texts.status).toBe('active');
    expect(last.ruleIds).toContain('series_reentry_restarts');
  });
});

describe('Won', () => {
  const toProcedure = ['lead_created', 'consult_booked', 'checked_out', 'procedure_booked'];

  it('procedure checkout marks the opportunity Won and leaves the Open view', () => {
    const { state, last } = play([...toProcedure, 'procedure_checked_out']);
    expect(state.card).toMatchObject({ stage: 'procedure_booked', status: 'won' });
    expect(last.cues).toContainEqual({ type: 'move_card', from: 'procedure_booked', to: 'closed_won' });
    expect(state.timers).toEqual({});
  });

  it('offers no actions once closed', () => {
    const { state } = play([...toProcedure, 'procedure_checked_out']);
    expect(offered(state).filter((id) => id !== 'skip_ahead')).toEqual([]);
  });

  it('checkout marks the appointment Showed and starts the quote window', () => {
    const { state } = play(['lead_created', 'consult_booked', 'checked_out']);
    expect(state.card).toMatchObject({ stage: 'consulted', showed: true });
    expect(state.timers.quote_window).toEqual({ startedOn: 0, expiresOn: QUOTE });
  });

  it('moves to Quoted Nurture when the quote window expires', () => {
    const { state } = play([...BOOKED, 'checked_out', 'skip_ahead']);
    expect(state).toMatchObject({ day: 1 + QUOTE, card: { stage: 'quoted_nurture' } });
  });
});

describe('practice configuration', () => {
  it('estimate trigger is on in the standard', () => {
    const { state } = play(['lead_created', 'consult_booked']);
    expect(offered(state)).toContain('estimate_created');
    const moved = step(state, 'estimate_created', standard).nextState;
    expect(moved.card?.stage).toBe('consulted');
  });

  it('estimate trigger is off when a practice turns it off', () => {
    const { state } = play(['lead_created', 'consult_booked'], treatmentCompleted);
    expect(offered(state, treatmentCompleted)).not.toContain('estimate_created');
    expect(() => step(state, 'estimate_created', treatmentCompleted)).toThrow(/disabled/);
  });

  it('estimate trigger can be switched on and off independently', () => {
    const off = resolvePractice({ id: 'x', name: 'x', stages: {}, events: { estimate_created: { enabled: false } }, timers: {} });
    expect(off.eventById.estimate_created).toBeUndefined();
    expect(off.isStageEnabled('treatment_completed')).toBe(false);
  });

  it('rejects overrides of rules that are not configurable', () => {
    expect(() =>
      resolvePractice({ id: 'x', name: 'x', stages: {}, events: { ghl_call: { enabled: false } }, timers: {} }),
    ).toThrow(/not configurable/);
  });

  it('treatment_completed variant: checkout enters Treatment Completed and is Won at once', () => {
    expect(treatmentCompleted.stages.map((s) => s.id)).toContain('treatment_completed');
    expect(standard.stages.map((s) => s.id)).not.toContain('treatment_completed');
    const { state, last } = play(
      ['lead_created', 'consult_booked', 'checked_out', 'procedure_booked', 'procedure_checked_out'],
      treatmentCompleted,
    );
    expect(state.card).toMatchObject({ stage: 'treatment_completed', status: 'won' });
    expect(last.cues.filter((c) => c.type === 'move_card')).toEqual([
      { type: 'move_card', from: 'procedure_booked', to: 'closed_won' },
    ]);
    expect(last.captionClient).toContain('Treatment Completed');
  });

  it('timer overrides change the duration everywhere', () => {
    const slow = resolvePractice({ id: 'x', name: 'x', stages: {}, events: {}, timers: { quote_window: { days: QUOTE + 2 } } });
    let state = initialState();
    for (const id of [...BOOKED, 'checked_out']) state = step(state, id, slow).nextState;
    const result = step(state, 'skip_ahead', slow);
    expect(result.nextState.day).toBe(1 + QUOTE + 2);
    expect(result.step.captionClient).toContain(`${QUOTE + 2} days`);
  });
});

describe('Skip ahead, Back, and availability', () => {
  it('is disabled with an explanation when nothing is scheduled', () => {
    const pending = play(['lead_created', 'consult_booked']).state;
    expect(availableEvents(pending, standard).find((o) => o.event.id === 'skip_ahead')!.enabled).toBe(true);
    const { state } = play(BOOKED);
    const skip = availableEvents(state, standard).find((o) => o.event.id === 'skip_ahead')!;
    expect(skip.enabled).toBe(false);
    expect(skip.reason).toBe('Nothing happens on its own from here. The next move needs an action.');
    expect(() => step(state, 'skip_ahead', standard)).toThrow();
  });

  it('a call outside the CRM changes nothing but the step log', () => {
    const before = play(['lead_created']).state;
    const { nextState, step: s } = step(before, 'call_outside_ghl', standard);
    expect(nextState.card).toEqual(before.card);
    expect(s.captionClient).toContain('Only calls made through Symplast CRM');
  });

  it('Back restores the previous state exactly', () => {
    const { state } = play(['lead_created', 'ghl_call', 'skip_ahead']);
    const previous = play(['lead_created', 'ghl_call']).state;
    expect(back(state)).toEqual(previous);
    expect(back(initialState())).toEqual(initialState());
  });

  it('throws on events that are not available from the current state', () => {
    expect(() => step(initialState(), 'ghl_call', standard)).toThrow(/not available/);
    expect(() => play(['lead_created', 'checked_out'])).toThrow(/not available/);
  });

  it('is pure: the input state is never mutated', () => {
    const { state } = play(['lead_created']);
    const frozen = structuredClone(state);
    step(state, 'ghl_call', standard);
    step(state, 'skip_ahead', standard);
    expect(state).toEqual(frozen);
  });

  it('every shipped practice resolves', () => {
    for (const p of practices) expect(resolvePractice(p).stages.length).toBeGreaterThan(0);
  });
});

describe('derived views of the rules', () => {
  it('lists the events that bring a card into each stage', async () => {
    const { entryEventsFor } = await import('../index.ts');
    const ids = (stage: string, config = standard) => entryEventsFor(stage, config).map((e) => e.id);
    expect(ids('new_lead')).toEqual(['lead_created']);
    expect(ids('no_response')).toEqual(['five_days_pass']);
    expect(ids('consulted')).toEqual(['checked_out', 'estimate_created']);
    expect(ids('consulted', treatmentCompleted)).toEqual(['checked_out']);
    expect(ids('treatment_completed', treatmentCompleted)).toEqual(['procedure_checked_out']);
  });
});
