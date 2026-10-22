import { createContext, useContext, type ReactNode } from 'react';
import { render, type ResolvedConfig, type View } from '../../engine/index.ts';
import type { Wording } from '../../schema/common.ts';
import type { Cast } from '../../schema/scenario.ts';

type GuideContextValue = {
  config: ResolvedConfig;
  view: View;
  cast: Cast;
  /** Pick the wording for the current view and fill in tokens. */
  t: (wording: Wording, opts?: { seriesId?: string; vars?: Record<string, string | number> }) => string;
  /** Fill tokens in an interface string from copy.ts. */
  fill: (text: string, vars?: Record<string, string | number>) => string;
};

const GuideContext = createContext<GuideContextValue | null>(null);

export function GuideProvider(props: { config: ResolvedConfig; view: View; cast: Cast; children: ReactNode }) {
  const { config, view, cast } = props;
  const value: GuideContextValue = {
    config,
    view,
    cast,
    t: (wording, opts) =>
      render(wording[view], { config, view, cast, currentSeriesId: opts?.seriesId, vars: opts?.vars }),
    fill: (text, vars) => render(text, { config, view, cast, vars }),
  };
  return <GuideContext.Provider value={value}>{props.children}</GuideContext.Provider>;
}

export function useGuideContext() {
  const value = useContext(GuideContext);
  if (!value) throw new Error('useGuideContext must be used inside GuideProvider');
  return value;
}
