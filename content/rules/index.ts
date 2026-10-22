import { Standard } from '../../schema/rules.ts';
import { Copy } from '../../schema/copy.ts';
import { ExampleBoard } from '../../schema/board.ts';
import { stages } from './stages.ts';
import { timers } from './timers.ts';
import { series } from './series.ts';
import { events } from './events.ts';
import { checkpoint, dndRule } from './checkpoint.ts';
import { assumptions } from './assumptions.ts';
import { copy as rawCopy } from './copy.ts';
import { exampleBoard as rawExampleBoard } from './example-board.ts';

/** The Symplast standard, validated. Throws on load if any content file is malformed. */
export const standard = Standard.parse({
  stages,
  timers,
  series,
  events,
  checkpoint,
  dnd: dndRule,
  assumptions,
});

export const copy = Copy.parse(rawCopy);

/** Fictional header numbers for the board. Display only. */
export const exampleBoard = ExampleBoard.parse(rawExampleBoard);
