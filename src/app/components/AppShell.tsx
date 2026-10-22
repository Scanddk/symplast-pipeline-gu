import { useState, type ReactNode } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { View } from '../../../engine/index.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { ShellFocusContext } from '../hooks/useShellFocus.ts';
import styles from './AppShell.module.css';

type AppShellProps = {
  title: string;
  intro: string;
  /** The page below shows its own heading (the menu's hero), so the shell shows only the brand line. */
  compact?: boolean;
  /** Shown inside a lesson: returns to the main menu. */
  onBackToMenu?: () => void;
  practices: { id: string; name: string }[];
  unknownPractice: boolean;
  onViewChange: (view: View) => void;
  onPracticeChange: (id: string) => void;
  children: ReactNode;
};

/** The Symplast-branded frame around the neutral GHL board. */
export function AppShell(props: AppShellProps) {
  const { title, intro, compact, onBackToMenu, practices, unknownPractice, onViewChange, onPracticeChange, children } = props;
  const { config, view } = useGuideContext();
  const { copy } = config;
  const otherView: View = view === 'client' ? 'internal' : 'client';
  // A lesson can fold the header down to a slim bar while it needs the whole screen (useShellFocus).
  const [focused, setFocused] = useState(false);

  return (
    <div className={styles.shell} data-view={view}>
      <header className={`${styles.header} ${focused ? styles.headerFocused : ''}`}>
        <div className={styles.brand}>
          {onBackToMenu && (
            <button type="button" className={styles.back} onClick={onBackToMenu}>
              <ArrowLeft size={14} aria-hidden="true" />
              {copy.menu.backToMenu}
            </button>
          )}
          <p className={styles.eyebrow}>{copy.brand.eyebrow}</p>
          {!compact && (
            <>
              <h1 className={styles.title}>{title}</h1>
              <p className={styles.intro}>{intro}</p>
            </>
          )}
        </div>
        <div className={styles.settings}>
          <label className={styles.field}>
            <span>{copy.practiceLabel}</span>
            <select value={config.practice.id} onChange={(e) => onPracticeChange(e.target.value)}>
              {practices.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className={styles.viewToggle} onClick={() => onViewChange(otherView)} aria-pressed={view === 'internal'}>
            <span className={styles.viewCurrent}>{copy.views[view]}</span>
            <span className={styles.viewSwitch}>
              {copy.views.switchTo} {copy.views[otherView]}
            </span>
          </button>
        </div>
      </header>
      {unknownPractice && <p className={styles.warning}>{copy.practiceUnknown}</p>}
      <main className={styles.main}>
        <ShellFocusContext.Provider value={setFocused}>{children}</ShellFocusContext.Provider>
      </main>
    </div>
  );
}
