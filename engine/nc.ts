import type { Verification } from '../schema/common.ts';
import { practices } from '../content/practices/index.ts';
import { resolvePractice, type ResolvedConfig } from './resolve.ts';

export type ContentItem = {
  practice: string;
  kind: 'stage' | 'event' | 'timer' | 'series' | 'dnd_label' | 'checkpoint' | 'dnd_rule' | 'assumption';
  id: string;
  title: string;
  verification: Verification;
};

export type DraftItem = { practice: string; id: string; title: string };

/** Every rule a practice's client view can show, with its verification. */
export function contentItems(config: ResolvedConfig): ContentItem[] {
  const practice = config.practice.id;
  const enabledStageIds = new Set(config.stages.map((s) => s.id));
  return [
    ...config.stages.map((s) => ({ practice, kind: 'stage' as const, id: s.id, title: s.name, verification: s.verification })),
    ...config.events.map((e) => ({ practice, kind: 'event' as const, id: e.id, title: e.label.internal, verification: e.verification })),
    ...config.timers
      .filter((t) => t.runsWhileIn.some((id) => enabledStageIds.has(id)))
      .map((t) => ({ practice, kind: 'timer' as const, id: t.id, title: t.name.internal, verification: t.verification })),
    ...config.series.flatMap((s) => [
      { practice, kind: 'series' as const, id: s.id, title: s.name.internal, verification: s.verification },
      { practice, kind: 'dnd_label' as const, id: s.id, title: s.dnd.label.internal, verification: s.dnd.verification },
    ]),
    { practice, kind: 'checkpoint', id: config.checkpoint.id, title: 'Text checkpoint', verification: config.checkpoint.verification },
    { practice, kind: 'dnd_rule', id: config.dnd.id, title: 'DND Nurture', verification: config.dnd.verification },
    ...config.assumptions.map((a) => ({ practice, kind: 'assumption' as const, id: a.id, title: a.wording.internal, verification: a.verification })),
  ];
}

/** A rule counts as NC if its status is NC or any part of it is unverified. */
export const isNc = (v: Verification) => v.status === 'NC' || v.ncParts.length > 0;

export function ncItems(config: ResolvedConfig): ContentItem[] {
  return contentItems(config).filter((item) => isNc(item.verification));
}

/** Stage copy still marked draft. */
export function draftItems(config: ResolvedConfig): DraftItem[] {
  return config.stages.flatMap((s) => [
    ...(s.meaning.draft ? [{ practice: config.practice.id, id: `${s.id}.meaning`, title: `${s.name}: What it means` }] : []),
    ...(s.yourPart.draft ? [{ practice: config.practice.id, id: `${s.id}.yourPart`, title: `${s.name}: Your part` }] : []),
  ]);
}

/**
 * What STRICT_CONTENT=true refuses to ship: any NC rule, or any draft copy,
 * that would appear in the client view of any shipped practice.
 */
export function strictViolations(): { practice: string; kind: string; id: string; title: string }[] {
  return practices.flatMap((p) => {
    const config = resolvePractice(p);
    return [
      ...ncItems(config),
      ...draftItems(config).map((d) => ({ ...d, kind: 'draft_copy' as const })),
    ];
  });
}
