import type { z } from 'zod';
import type { Checkpoint, DndRule } from '../../schema/rules.ts';

/** The check that runs after each wait and before each text sends. */
export const checkpoint: z.input<typeof Checkpoint> = {
  id: 'text_checkpoint',
  wording: {
    client:
      'Before each text sends, it checks two things: is this patient still in this stage, and is the opportunity still open? If not, the text is skipped.',
    internal:
      'After each wait and before each send: (a) opportunity status is open and (b) opportunity is still in the series stage. If either fails, that send and every remaining send are skipped. The patient stays in the workflow, but the checkpoint prevents the send.',
  },
  skipReasons: {
    left_stage: { client: 'card left this stage', internal: 'stage check failed' },
    opportunity_closed: { client: 'opportunity closed', internal: 'status check failed (not open)' },
  },
  questions: {
    inStage: { client: 'Still in {stage}?', internal: 'stage = {stage}' },
    open: { client: 'Opportunity still open?', internal: 'status = open' },
  },
  stopsWhen: {
    client:
      'Texts stop when the card leaves {stage}, when the opportunity closes, or when your team checks “{dnd:current}” under DND Nurture.',
    internal:
      'Checkpoint fails on stage ≠ {stage} or status ≠ open; DND Nurture “{dnd:current}” stops the series and blocks re-entry.',
  },
  sentCaption: {
    client: '{name} gets text {n} of the {series:current}.',
    internal: 'Checkpoint passed (open, still in stage). Send {n} of {series:current} goes out.',
  },
  skippedCaption: {
    client: 'The check before text {n} of the {series:current} fails because the {reason}, so that text and every text after it are skipped.',
    internal: 'Checkpoint before send {n} of {series:current} failed ({reason}). Remaining sends skipped; contact stays in the workflow.',
  },
  verification: { status: 'V' },
};

/** DND Nurture: the per-series checkbox in the opportunity details. */
export const dndRule: z.input<typeof DndRule> = {
  id: 'dnd_nurture',
  wording: {
    client:
      'Your team can check a box for each set of texts in the opportunity details. Checking it stops those texts right away and keeps the patient from getting them again. It affects only that set of texts.',
    internal:
      'Per-series DND checkbox: stops the series immediately, marks remaining sends "stopped by staff", and blocks re-enrollment into that series. Other series are unaffected.',
  },
  blockedCaption: {
    client: 'The {series:current} don’t start, because your team checked “{dnd:current}” earlier.',
    internal: 'Re-entry blocked: DND Nurture “{dnd:current}” is checked for {series:current}.',
  },
  verification: {
    status: 'V',
    questions: ['OQ-8'],
    ncParts: ['The exact label', 'Where it sits in the opportunity details', 'Whether staff can uncheck it'],
  },
};
