import { Scenario } from '../../schema/scenario.ts';
import { mariaPath } from './maria-path.ts';
import { textsStart } from './texts-start.ts';
import { textsCheck } from './texts-check.ts';
import { textsClosed } from './texts-closed.ts';
import { textsDnd } from './texts-dnd.ts';

export const scenarios = [mariaPath, textsStart, textsCheck, textsClosed, textsDnd].map((s) => Scenario.parse(s));

/** The fictional patient on the free-play board. */
export const defaultCast = scenarios[0].cast;
