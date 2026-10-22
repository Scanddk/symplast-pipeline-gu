import { createContext, useContext, useEffect } from 'react';

/** Set by AppShell: folds the page header down to a slim bar while a lesson needs the whole screen. */
export const ShellFocusContext = createContext<(focused: boolean) => void>(() => {});

/** While `active`, the page header folds away (e.g. during the call, when the full CRM is on screen). */
export function useShellFocus(active: boolean) {
  const setFocused = useContext(ShellFocusContext);
  useEffect(() => {
    setFocused(active);
    return () => setFocused(false);
  }, [active, setFocused]);
}
