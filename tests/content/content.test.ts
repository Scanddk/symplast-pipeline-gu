import { describe, expect, it } from 'vitest';
import { Standard } from '../../schema/rules.ts';
import { Copy } from '../../schema/copy.ts';
import { PracticeOverride } from '../../schema/practice.ts';
import { Scenario } from '../../schema/scenario.ts';
import { stages } from '../../content/rules/stages.ts';
import { timers } from '../../content/rules/timers.ts';
import { series } from '../../content/rules/series.ts';
import { events } from '../../content/rules/events.ts';
import { checkpoint, dndRule } from '../../content/rules/checkpoint.ts';
import { assumptions } from '../../content/rules/assumptions.ts';
import { copy as rawCopy } from '../../content/rules/copy.ts';
import { standard, copy, exampleBoard } from '../../content/rules/index.ts';
import { practices } from '../../content/practices/index.ts';
import { standardPractice } from '../../content/practices/standard.ts';
import { treatmentCompletedPractice } from '../../content/practices/treatment-completed.ts';
import { scenarios } from '../../content/scenarios/index.ts';
import { lessons } from '../../content/lessons/index.ts';
import { mariaPath } from '../../content/scenarios/maria-path.ts';
import { initialState, isAvailable, playScenario, render, resolvePractice, step } from '../../engine/index.ts';
import type { EngineState, ResolvedConfig, View } from '../../engine/index.ts';
import { ncItems, strictViolations } from '../../engine/nc.ts';

const configs = practices.map((p) => resolvePractice(p));

describe('schemas', () => {
  it('every content file validates', () => {
    expect(Standard.safeParse({ stages, timers, series, events, checkpoint, dnd: dndRule, assumptions }).success).toBe(true);
    expect(Copy.safeParse(rawCopy).success).toBe(true);
    for (const p of [standardPractice, treatmentCompletedPractice]) expect(PracticeOverride.safeParse(p).success).toBe(true);
    expect(Scenario.safeParse(mariaPath).success).toBe(true);
  });

  it('ids are unique within each kind', () => {
    for (const list of [standard.stages, standard.events, standard.timers, standard.series, standard.assumptions, practices, scenarios]) {
      const ids = list.map((x) => x.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });
});

describe('standard pipeline', () => {
  it('stage display names match GHL exactly, in order', () => {
    expect(standard.stages.filter((s) => s.enabledByDefault).map((s) => s.name)).toEqual([
      'New Lead',
      'Contacted',
      'No Response/Didn’t Schedule',
      'Booked Appointment',
      'No Show',
      'Consulted',
      'Quoted Nurture',
      'Procedure Booked {Surgical}',
    ]);
    expect(standard.stages.find((s) => s.id === 'treatment_completed')).toMatchObject({
      name: 'Treatment Completed',
      enabledByDefault: false,
    });
  });

  it('exactly the four texting stages have a series', () => {
    expect(standard.stages.filter((s) => s.seriesId).map((s) => s.id)).toEqual([
      'new_lead', 'no_response', 'no_show', 'quoted_nurture',
    ]);
  });
});

describe('referential integrity', () => {
  const stageIds = new Set(standard.stages.map((s) => s.id));
  const timerIds = new Set(standard.timers.map((t) => t.id));
  const seriesIds = new Set(standard.series.map((s) => s.id));
  const eventById = Object.fromEntries(standard.events.map((e) => [e.id, e]));

  it('events reference existing stages and timers', () => {
    for (const e of standard.events) {
      for (const s of e.availableFrom.stages) expect(stageIds, `${e.id} availableFrom ${s}`).toContain(s);
      for (const c of e.captionIf) expect(stageIds, `${e.id} captionIf`).toContain(c.stageEnabled);
      for (const effect of e.effects) {
        if (effect.type === 'create_card') expect(stageIds).toContain(effect.stage);
        if (effect.type === 'move') {
          expect(stageIds, `${e.id} → ${effect.to}`).toContain(effect.to);
          if (effect.onlyIfStageEnabled) expect(stageIds).toContain(effect.onlyIfStageEnabled);
        }
        if (effect.type === 'start_timer') expect(timerIds, `${e.id} starts ${effect.timer}`).toContain(effect.timer);
      }
    }
  });

  it('timers reference existing stages and fire a time event', () => {
    for (const t of standard.timers) {
      for (const s of t.runsWhileIn) expect(stageIds).toContain(s);
      expect(eventById[t.firesEvent]?.kind, `${t.id} fires ${t.firesEvent}`).toBe('time');
    }
    for (const e of standard.events.filter((x) => x.kind === 'time')) {
      expect(standard.timers.filter((t) => t.firesEvent === e.id), `${e.id} has one timer`).toHaveLength(1);
    }
  });

  it('series and stages point at each other', () => {
    for (const s of standard.series) {
      const stage = standard.stages.find((x) => x.id === s.stageId);
      expect(stage?.seriesId, `${s.id} ↔ ${s.stageId}`).toBe(s.id);
    }
    for (const stage of standard.stages) if (stage.seriesId) expect(seriesIds).toContain(stage.seriesId);
  });

  it('copy and caption tokens all resolve', () => {
    for (const config of configs) {
      for (const view of ['client', 'internal'] as View[]) {
        const strings = allWordings(config).map((w) => w[view]);
        for (const s of config.series) {
          for (const text of strings) {
            expect(() =>
              render(text, { config, view, cast: mariaPath.cast, currentSeriesId: s.id, vars: { n: 1, reason: 'x', stage: 'x', elapsed: 1, total: 5, day: 1, days: '1 day' } }),
            ).not.toThrow();
          }
        }
      }
    }
  });
});

describe('lessons', () => {
  it('have unique ids and at least one can be opened', () => {
    const ids = lessons.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(lessons.some((l) => l.status === 'available')).toBe(true);
  });

  it('guided demos replace only real action events', () => {
    const standardConfig = configs.find((c) => c.practice.id === 'standard')!;
    for (const l of lessons) {
      for (const eventId of Object.keys(l.demos ?? {})) {
        expect(standardConfig.eventById[eventId]?.kind, `${l.id} demo for ${eventId}`).toBe('action');
      }
    }
  });

  it('the Symplast checkout demo starts and ends on statuses in its list', () => {
    const ids = copy.ehr.statuses.map((s) => s.id);
    expect(ids).toContain(copy.ehr.startStatus);
    expect(ids).toContain(copy.ehr.targetStatus);
    expect(copy.ehr.startStatus).not.toBe(copy.ehr.targetStatus);
  });

  it('available lessons name a mode the app has; coming-soon lessons need none', () => {
    for (const l of lessons) {
      if (l.status === 'available') expect(['board', 'reference', 'story'], l.id).toContain(l.mode);
    }
  });
});

describe('guided tours', () => {
  it('every tour event is available when its beat fires, and the story ends where it should', () => {
    const config = configs.find((c) => c.practice.id === 'standard')!;
    for (const lesson of lessons.filter((l) => l.tour)) {
      let state: EngineState = initialState();
      const stages: string[] = [];
      for (const beat of lesson.tour!.beats) {
        if (!beat.fires) continue;
        if ('event' in beat.fires) {
          expect(isAvailable(state, config.eventById[beat.fires.event], config), `${lesson.id}/${beat.id}`).toEqual({ ok: true });
          state = step(state, beat.fires.event, config).nextState;
        } else {
          let reached = false;
          for (let i = 0; i < 20 && !reached; i++) {
            const result = step(state, 'skip_ahead', config);
            state = result.nextState;
            reached = result.step.ruleIds.includes(beat.fires.skipUntil);
          }
          expect(reached, `${lesson.id}/${beat.id} reaches ${beat.fires.skipUntil}`).toBe(true);
        }
        stages.push(state.card!.stage);
      }
      if (lesson.id === 'how-cards-move') {
        expect(stages).toEqual([
          'new_lead',
          'contacted',
          'no_response',
          'no_response',
          'booked_appointment',
          'consulted',
          'quoted_nurture',
          'quoted_nurture',
          'procedure_booked',
        ]);
      }
    }
  });

  it('tour captions are at most two sentences and avoid system words', () => {
    const config = configs.find((c) => c.practice.id === 'standard')!;
    for (const lesson of lessons.filter((l) => l.tour)) {
      const texts = [lesson.tour!.intro, lesson.tour!.outro, ...lesson.tour!.beats.map((b) => b.caption)];
      for (const w of texts) {
        const text = render(w.client, { config, view: 'client', cast: mariaPath.cast, vars: { firstName: 'Maria' } });
        expect(sentences(text), text).toBeLessThanOrEqual(2);
        expect(text, text).not.toMatch(/\b(workflows?|triggers?|enrollments?|eligib\w*|sequences?|automations?)\b/i);
      }
    }
  });
});

describe('story lessons', () => {
  const standardConfig = configs.find((c) => c.practice.id === 'standard')!;
  const chapterIds = lessons.flatMap((l) => l.chapters ?? []);

  it('reference existing scenarios, each focused on an existing series', () => {
    for (const id of chapterIds) {
      const scenario = scenarios.find((s) => s.id === id);
      expect(scenario, id).toBeDefined();
      expect(standardConfig.seriesById[scenario!.focusSeries ?? ''], `${id} focusSeries`).toBeDefined();
    }
  });

  it('chapter intros and step captions are at most two sentences', () => {
    for (const id of chapterIds) {
      const scenario = scenarios.find((s) => s.id === id)!;
      for (const view of ['client', 'internal'] as const) {
        if (scenario.intro) {
          const intro = render(scenario.intro[view], { config: standardConfig, view, cast: scenario.cast });
          expect(sentences(intro), intro).toBeLessThanOrEqual(2);
        }
      }
      for (const frame of playScenario(scenario, standardConfig).slice(1)) {
        expect(sentences(frame.step!.captionClient), frame.step!.captionClient).toBeLessThanOrEqual(2);
      }
    }
  });

  it('the texts lesson stays clear of the unconfirmed New Lead → Contacted case (OQ-1)', () => {
    const textsLesson = lessons.find((l) => l.id === 'when-texts-send')!;
    for (const id of textsLesson.chapters!) {
      const scenario = scenarios.find((s) => s.id === id)!;
      expect(scenario.focusSeries, id).not.toBe('new_lead_texts');
      expect([...scenario.setup, ...scenario.steps.map((s) => s.eventId)], id).not.toContain('ghl_call');
    }
  });
});

describe('text messages', () => {
  it('every text has a message, and example wording is labeled as such', () => {
    for (const s of standard.series) {
      for (const t of s.texts) expect(t.message.length, `${s.id}.${t.id}`).toBeGreaterThan(0);
      // Messages are written for the guide until real copy arrives (OQ-28); the overlay must say so.
      expect(s.exampleMessages, s.id).toBe(true);
      expect(s.verification.questions, s.id).toContain('OQ-28');
    }
  });
});

describe('example board numbers', () => {
  it('cover every stage and reference only existing stages', () => {
    const stageIds = standard.stages.map((s) => s.id).sort();
    expect(Object.keys(exampleBoard).sort()).toEqual(stageIds);
  });
});

describe('practice overrides', () => {
  it('reference only existing ids and configurable events', () => {
    for (const p of practices) expect(() => resolvePractice(p)).not.toThrow();
    expect(() => resolvePractice({ id: 'x', name: 'x', stages: { nope: { enabled: true } }, events: {}, timers: {} })).toThrow(/unknown stage/);
    expect(() => resolvePractice({ id: 'x', name: 'x', stages: {}, events: { nope: { enabled: true } }, timers: {} })).toThrow(/unknown event/);
    expect(() => resolvePractice({ id: 'x', name: 'x', stages: {}, events: {}, timers: { nope: { days: 2 } } })).toThrow(/unknown timer/);
  });

  it('restate no rules: overrides only hold switches and numbers', () => {
    expect(() => PracticeOverride.parse({ id: 'x', name: 'x', stages: { new_lead: { name: 'Other' } } })).toThrow();
  });
});

describe('scenarios', () => {
  for (const scenario of scenarios) {
    it(`${scenario.id} plays through with every event available when used`, () => {
      const config = configs.find((c) => c.practice.id === scenario.practice)!;
      expect(config, `practice ${scenario.practice}`).toBeDefined();
      let state: EngineState = initialState();
      const all = [...scenario.setup.map((eventId) => ({ eventId })), ...scenario.steps];
      for (const [i, s] of all.entries()) {
        const event = config.eventById[s.eventId];
        expect(event, `step ${i + 1}: ${s.eventId} exists`).toBeDefined();
        expect(isAvailable(state, event, config), `step ${i + 1}: ${s.eventId}`).toEqual({ ok: true });
        state = step(state, s.eventId, config, { cast: scenario.cast }).nextState;
      }
    });
  }

  it("Maria's path visits the brief's stages in order and ends Won", () => {
    const config = configs.find((c) => c.practice.id === 'standard')!;
    let state: EngineState = initialState();
    const visited: string[] = [];
    for (const s of mariaPath.steps) {
      state = step(state, s.eventId, config).nextState;
      if (visited[visited.length - 1] !== state.card!.stage) visited.push(state.card!.stage);
    }
    expect(visited).toEqual(['new_lead', 'contacted', 'no_response', 'booked_appointment', 'consulted', 'quoted_nurture', 'procedure_booked']);
    expect(state.card!.status).toBe('won');
    expect(state.series.no_response_texts.status).toBe('skipped');
  });
});

describe('copy rules', () => {
  const BANNED = /\b(workflows?|triggers?|triggered|enrollments?|enroll(ed|s)?|eligib\w*|sequences?|automations?|automated)\b/i;
  const HARD_CODED_DAYS = /\b(\d+|one|two|three|four|five|six|seven|eight|nine|ten)[- ]days?\b/i;

  it('client wording avoids system words', () => {
    for (const config of configs) {
      const scenarioClient = scenarios.flatMap((s) => [s.title, s.intro?.client ?? '']);
      // Lesson titles are the content owner's own choice (e.g. "Nurture Sequences"), so they're exempt.
      const lessonText = lessons.map(({ title: _title, ...rest }) => rest);
      // So is the texts lesson's hero headline, which the content owner wrote ("… stage automations assist you …").
      const copyText = { ...copy, story: { ...copy.story, heroTitle: null } };
      for (const text of [...allWordings(config).map((w) => w.client), ...allStrings(copyText), ...allStrings(lessonText), ...scenarioClient]) {
        expect(text, text).not.toMatch(BANNED);
      }
    }
  });

  it('client wording never says GHL: staff know it as Symplast CRM', () => {
    for (const config of configs) {
      for (const text of [...allWordings(config).map((w) => w.client), ...allStrings(copy), ...allStrings(lessons)]) {
        expect(text, text).not.toMatch(/\bGHL\b/);
      }
    }
  });

  it('no copy hard-codes a duration; durations come from timers.ts', () => {
    for (const config of configs) {
      for (const w of allWordings(config)) {
        expect(w.client, w.client).not.toMatch(HARD_CODED_DAYS);
        expect(w.internal, w.internal).not.toMatch(HARD_CODED_DAYS);
      }
    }
  });

  it('every step caption is at most two sentences', () => {
    const config = configs.find((c) => c.practice.id === 'standard')!;
    const paths = [
      mariaPath.steps.map((s) => s.eventId),
      ['lead_created', 'call_outside_ghl', 'consult_booked', 'marked_no_show', 'dnd_checked', 'consult_booked', 'marked_no_show'],
      ['lead_created', 'skip_ahead', 'skip_ahead', 'skip_ahead'],
    ];
    for (const path of paths) {
      let state: EngineState = initialState();
      for (const id of path) {
        const result = step(state, id, config);
        state = result.nextState;
        for (const caption of [result.step.captionClient, result.step.captionInternal]) {
          expect(sentences(caption), caption).toBeLessThanOrEqual(2);
        }
      }
    }
  });
});

describe('verification', () => {
  it('NC items are reported, and strict mode would refuse them', () => {
    const standardConfig = configs.find((c) => c.practice.id === 'standard')!;
    expect(ncItems(standardConfig).map((i) => i.id)).toEqual(expect.arrayContaining(['estimate_created', 'call_outside_ghl', 'new_lead_texts']));
    expect(strictViolations().length).toBeGreaterThan(0);
  });

  it('every open-question reference points at OPEN_QUESTIONS.md', async () => {
    const { readFileSync } = await import('node:fs');
    const doc = readFileSync(new URL('../../OPEN_QUESTIONS.md', import.meta.url), 'utf8');
    const refs = new Set(JSON.stringify(standard).match(/OQ-\d+/g));
    for (const ref of refs) expect(doc, ref).toContain(`${ref}:`);
  });
});

/** All rule wordings a config exposes. */
function allWordings(config: ResolvedConfig) {
  return [
    ...config.stages.flatMap((s) => [s.meaning, s.yourPart]),
    ...config.events.flatMap((e) => [e.label, e.caption, ...e.captionIf.map((c) => c.caption)]),
    ...config.timers.flatMap((t) => [t.name, t.ring]),
    ...config.series.flatMap((s) => [
      s.name,
      s.purpose,
      s.startCaption,
      s.dnd.label,
      ...s.texts.map((t) => ({ client: t.message, internal: t.message })),
    ]),
    config.checkpoint.wording,
    config.checkpoint.stopsWhen,
    config.checkpoint.sentCaption,
    config.checkpoint.skippedCaption,
    ...Object.values(config.checkpoint.skipReasons),
    config.dnd.wording,
    config.dnd.blockedCaption,
    ...config.assumptions.map((a) => a.wording),
  ];
}

function allStrings(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (value && typeof value === 'object') return Object.values(value).flatMap(allStrings);
  return [];
}

/** Rough sentence count: ends at . ! or ? followed by a space or the end. */
function sentences(text: string) {
  return text.split(/[.!?](?:\s|$)/).filter((s) => s.trim().length > 0).length;
}
