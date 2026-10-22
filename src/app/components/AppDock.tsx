import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import logoUrl from '../assets/symplast-logomark.svg';
import { useGuideContext } from '../GuideContext.tsx';
import { AssistPointer } from './AssistPointer.tsx';
import styles from './AppDock.module.css';

/** Room the pointer's hint takes beside the dock when it's centred (the hint goes to its right). */
const HINT_ROOM = 320;
/** The app's name label sits above the dock. */
const LABEL_ROOM = 60;

/** The icon's open animation before the app's window appears. */
const LAUNCH_MS = 650;

/**
 * A computer's app dock: Symplast CRM is open, and the Symplast Practice App bounces for attention, like a Mac.
 * Shows that booking and checkout happen in the Practice App, not somewhere in Symplast CRM.
 */
export function AppDock(props: {
  hint: string;
  /** Something on screen the dock and its hint must not cover (e.g. the text conversation): the dock moves to the other side. */
  avoid?: string;
  onOpen: () => void;
}) {
  const { hint, avoid, onOpen } = props;
  const { config } = useGuideContext();
  const { appDock } = config.copy;
  const reducedMotion = useReducedMotion() ?? false;
  const [launching, setLaunching] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const appRef = useRef<HTMLButtonElement>(null);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Centred, unless the centred dock (with its name label and hint) would cover something to avoid:
  // then on the side of the screen that thing isn't on.
  const [side, setSide] = useState<'center' | 'left' | 'right'>('center');
  // When there's something to avoid, the dock waits (hidden) until it has looked where that thing settled.
  const [placed, setPlaced] = useState(!avoid);
  useLayoutEffect(() => {
    if (!avoid) return;
    const place = () => {
      const r = document.querySelector(avoid)?.getBoundingClientRect();
      const dock = wrapRef.current?.getBoundingClientRect();
      if (!r || !dock) return setSide('center');
      const middle = window.innerWidth / 2;
      const centred = { left: middle - dock.width / 2, right: middle + dock.width / 2 + HINT_ROOM, top: dock.top - LABEL_ROOM, bottom: dock.bottom };
      const covers = centred.left < r.right && r.left < centred.right && centred.top < r.bottom && r.top < centred.bottom;
      setSide(!covers ? 'center' : r.left + r.width / 2 < middle ? 'right' : 'left');
    };
    place();
    // The conversation places itself after it renders; look again once it has, then show the dock.
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        place();
        setPlaced(true);
      }),
    );
    window.addEventListener('resize', place);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', place);
    };
  }, [avoid]);

  const open = () => {
    if (launching) return;
    setLaunching(true);
    timer.current = window.setTimeout(onOpen, reducedMotion ? 0 : LAUNCH_MS);
  };

  return (
    <div
      ref={wrapRef}
      className={`${styles.wrap} ${styles[side]} ${placed ? '' : styles.unplaced} ${reducedMotion ? styles.still : ''}`}
    >
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
      {/* Aimed at the icon's centre, so the hint starts just past its edge and never covers an app. */}
      {!launching && (
        <AssistPointer containerRef={wrapRef} getTarget={() => appRef.current} targetKey={`practice-app-${side}`} hint={hint} aim={0.5} />
      )}
    </div>
  );
}
