import type { Cast } from '../schema/scenario.ts';
import type { ResolvedConfig } from './resolve.ts';

export type View = 'client' | 'internal';

export type TemplateContext = {
  config: ResolvedConfig;
  view: View;
  cast?: Cast;
  /** The series {series:current} and {dnd:current} refer to. */
  currentSeriesId?: string;
  /** Plain values for tokens without a colon, e.g. {n}, {reason}, {elapsed}. */
  vars?: Record<string, string | number>;
};

/**
 * Tokens start with a lowercase letter so literal braces in names
 * (e.g. "Procedure Booked {Surgical}") are left alone.
 */
const TOKEN = /\{([a-z][a-zA-Z]*)(?::([a-z_]+))?\}/g;

export function formatDays(days: number, config: ResolvedConfig): string {
  return `${days} ${days === 1 ? config.copy.days.one : config.copy.days.other}`;
}

export function render(text: string, ctx: TemplateContext): string {
  const { config, view } = ctx;
  return text.replace(TOKEN, (match, key: string, arg: string | undefined) => {
    if (arg === undefined) {
      if (key === 'name' && ctx.cast) return ctx.cast.name;
      if (key === 'source' && ctx.cast) return ctx.cast.source;
      if (key === 'firstName' && ctx.cast) return ctx.cast.name.split(' ')[0];
      const value = ctx.vars?.[key];
      if (value === undefined) throw new Error(`Unresolved token ${match} in "${text}"`);
      return String(value);
    }
    const seriesId = arg === 'current' ? ctx.currentSeriesId : arg;
    switch (key) {
      case 'stage': {
        const stage = config.stageById[arg];
        if (!stage) throw new Error(`Unknown stage in ${match}`);
        return stage.name;
      }
      case 'timer':
      case 'timerAdj': {
        const timer = config.timerById[arg];
        if (!timer) throw new Error(`Unknown timer in ${match}`);
        return key === 'timer' ? formatDays(timer.days, config) : `${timer.days}-${config.copy.days.one}`;
      }
      case 'series': {
        const series = seriesId ? config.seriesById[seriesId] : undefined;
        if (!series) throw new Error(`Unknown series in ${match}`);
        return series.name[view];
      }
      case 'dnd': {
        const series = seriesId ? config.seriesById[seriesId] : undefined;
        if (!series) throw new Error(`Unknown series in ${match}`);
        return series.dnd.label[view];
      }
      default:
        throw new Error(`Unknown token ${match} in "${text}"`);
    }
  });
}
