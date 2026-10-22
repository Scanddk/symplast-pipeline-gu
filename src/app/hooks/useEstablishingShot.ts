import { useCallback, useEffect, useState } from 'react';
import { useReducedMotion } from 'motion/react';

/** How long the full GHL screen holds before the view pushes in to the pipeline. */
const HOLD_MS = 1400;

/**
 * Opening shot for a lesson: show the full GHL app, then push in to the pipeline.
 * Starts already focused when `play` is false or the viewer prefers reduced motion.
 * `focusNow` skips the hold, e.g. when the viewer presses Next straight away.
 */
export function useEstablishingShot(play: boolean) {
  const reducedMotion = useReducedMotion() ?? false;
  const [focused, setFocused] = useState(!play || reducedMotion);

  useEffect(() => {
    if (focused) return;
    const timer = window.setTimeout(() => setFocused(true), HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [focused]);

  const focusNow = useCallback(() => setFocused(true), []);
  return { focused, focusNow };
}
