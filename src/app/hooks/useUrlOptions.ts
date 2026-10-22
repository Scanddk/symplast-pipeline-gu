import { useCallback, useEffect, useState } from 'react';
import type { View } from '../../../engine/index.ts';

/** ?view=internal, ?practice=<id>, and ?lesson=<id> (no lesson = the main menu). */
export type UrlOptions = { view: View; practice: string; lesson: string | null };

function read(): UrlOptions {
  const params = new URLSearchParams(window.location.search);
  return {
    view: params.get('view') === 'internal' ? 'internal' : 'client',
    practice: params.get('practice') ?? 'standard',
    lesson: params.get('lesson'),
  };
}

function toQuery(options: UrlOptions) {
  const params = new URLSearchParams(window.location.search);
  const set = (key: string, value: string | null) => (value ? params.set(key, value) : params.delete(key));
  set('lesson', options.lesson);
  set('practice', options.practice === 'standard' ? null : options.practice);
  set('view', options.view === 'internal' ? 'internal' : null);
  const query = params.toString();
  return `${window.location.pathname}${query ? `?${query}` : ''}`;
}

/**
 * Keeps the options in the URL so links stay shareable.
 * Opening or leaving a lesson adds a history entry, so the browser's Back button returns to the menu.
 */
export function useUrlOptions() {
  const [options, setOptions] = useState<UrlOptions>(read);

  useEffect(() => {
    const onPop = () => setOptions(read());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const update = useCallback((next: Partial<UrlOptions>) => {
    // TanStack observes history changes; keep them outside React's state updater.
    const current = read();
    const merged = { ...current, ...next };
    const changesLesson = 'lesson' in next && next.lesson !== current.lesson;
    const url = toQuery(merged);
    if (changesLesson) window.history.pushState(null, '', url);
    else window.history.replaceState(null, '', url);
    setOptions(merged);
  }, []);

  return [options, update] as const;
}
