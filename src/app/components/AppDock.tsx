import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import logoUrl from '../assets/symplast-logomark.svg';
import { useGuideContext } from '../GuideContext.tsx';
import { AssistPointer } from './AssistPointer.tsx';
import styles from './AppDock.module.css';

/** The icon's open animation before the app's window appears. */
const LAUNCH_MS = 650;

/**
 * A computer's app dock: Symplast CRM is open, and the Symplast Practice App bounces for attention, like a Mac.
 * Shows that booking and checkout happen in the Practice App, not somewhere in Symplast CRM.
 */
export function AppDock({ hint, onOpen }: { hint: string; onOpen: () => void }) {
  const { config } = useGuideContext();
  const { appDock } = config.copy;
  const reducedMotion = useReducedMotion() ?? false;
  const [launching, setLaunching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const open = () => {
    if (launching) return;
    setLaunching(true);
    timer.current = window.setTimeout(onOpen, reducedMotion ? 0 : LAUNCH_MS);
  };

  return (
    <div ref={wrapRef} className={`${styles.wrap} ${reducedMotion ? styles.still : ''}`}>
      <nav className={styles.dock} aria-label={appDock.label}>
        <span className={styles.app} role="img" aria-label={appDock.crm}>
          <span className={`${styles.icon} ${styles.crmIcon}`}>
            <img src={logoUrl} alt="" />
            <b>CRM</b>
          </span>
          <span className={styles.running} aria-hidden="true" />
        </span>
        <button
          ref={appRef}
          type="button"
          className={`${styles.app} ${styles.practiceApp} ${launching ? styles.launching : styles.bouncing}`}
          onClick={open}
        >
          <span className={styles.name}>{appDock.practiceApp}</span>
          <span className={`${styles.icon} ${styles.practiceIcon}`} aria-hidden="true">
            <img src={logoUrl} alt="" />
          </span>
          <span className={launching ? styles.running : styles.notRunning} aria-hidden="true" />
        </button>
      </nav>
      {!launching && <AssistPointer containerRef={wrapRef} getTarget={() => appRef.current} targetKey="practice-app" hint={hint} />}
    </div>
  );
}
