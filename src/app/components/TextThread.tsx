import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react';
import { useReducedMotion } from 'motion/react';
import { useGuideContext } from '../GuideContext.tsx';
import { demoPatient } from '../demoPatient.ts';
import { SenderAvatar } from './SenderAvatar.tsx';
import styles from './TextThread.module.css';

/**
 * One text in the thread. `typed`: your team types it out letter by letter; otherwise typing dots, then it lands.
 * `automatic`: sent automatically (a stage's text), shown with the automatic sender's avatar.
 */
export type ThreadLine = { from: 'patient' | 'practice'; text: string; typed?: boolean; example?: boolean; automatic?: boolean };

/** Before each text after the first, a moment to read the one before. */
const READ_MS = 1400;
/** Typing dots before a text lands. */
const DOTS_MS = 1100;
/** After the last text, time to read it before the story moves on. */
const LAST_READ_MS = 2400;
/** Typing speed for your team's typed texts, with a beat after spaces and punctuation so it reads like a person. */
const CHAR_MS = 34;
const SPACE_MS = 40;
const PUNCTUATION_MS = 260;
const WIDTH = 380;
/** Space between the thread and the card, and between the thread and the caption dock below. */
const GAP = 48;
const DOCK_GAP = 12;

/**
 * Texts between the patient (white, left) and your team (teal, right), floating beside the card, each with who
 * sent it underneath. Narrative only: replies aren't modeled, so the thread changes nothing by itself. With
 * onComplete it plays text by text and moves the story on once read; without it, the whole thread just stays.
 */
export function TextThread(props: {
  lines: ThreadLine[];
  day: number;
  contentRef: RefObject<HTMLElement | null>;
  onComplete?: () => void;
}) {
  const { lines, day, contentRef, onComplete } = props;
  const { config, cast, fill } = useGuideContext();
  const { reply, story } = config.copy;
  const reducedMotion = useReducedMotion() ?? false;
  const playing = useRef(Boolean(onComplete));
  // Where the thread is: how many texts have landed, and what's happening with the next one.
  const [shown, setShown] = useState(onComplete ? 0 : lines.length);
  const [mode, setMode] = useState<'wait' | 'dots' | 'typing'>('wait');
  const [typed, setTyped] = useState(0);
  const [pos, setPos] = useState<{ left: number; top: number; scale: number } | null>(null);
  const clusterRef = useRef<HTMLDivElement>(null);
  const done = useRef(onComplete);
  done.current = onComplete;

  useEffect(() => {
    if (!playing.current) return;
    let timer: number;
    const line = lines[shown];
    if (!line) {
      timer = window.setTimeout(() => done.current?.(), LAST_READ_MS);
    } else if (mode === 'wait') {
      timer = window.setTimeout(() => {
        setTyped(0);
        setMode(line.typed ? 'typing' : 'dots');
      }, shown === 0 ? 0 : READ_MS);
    } else if (mode === 'dots') {
      timer = window.setTimeout(() => {
        setShown(shown + 1);
        setMode('wait');
      }, DOTS_MS);
    } else if (typed < line.text.length && !reducedMotion) {
      const next = line.text[typed];
      const pause = /[.,?!]/.test(next) ? PUNCTUATION_MS : next === ' ' ? SPACE_MS : 0;
      timer = window.setTimeout(() => setTyped(typed + 1), CHAR_MS + pause);
    } else {
      timer = window.setTimeout(() => {
        setShown(shown + 1);
        setMode('wait');
      }, 300);
    }
    return () => window.clearTimeout(timer);
  }, [lines, shown, mode, typed, reducedMotion]);

  useLayoutEffect(() => {
    const measure = () => {
      const frame = contentRef.current;
      const card = frame?.querySelector('[data-testid="demo-card"]');
      if (!frame || !card) return;
      const f = frame.getBoundingClientRect();
      const c = card.getBoundingClientRect();
      const left = c.left - f.left > WIDTH + GAP ? c.left - f.left - WIDTH - GAP : c.right - f.left + GAP;
      // Beside the card, but always above the caption dock: move up first, then shrink if it still doesn't fit.
      const height = clusterRef.current?.offsetHeight ?? 0;
      const dockTop = document.querySelector('[data-dock]')?.getBoundingClientRect().top ?? window.innerHeight;
      const room = Math.min(f.height, dockTop - f.top) - DOCK_GAP;
      let top = Math.max(18, c.top - f.top - 40);
      if (top + height > room) top = Math.max(8, room - height);
      const scale = height > room - 8 ? Math.max(0.6, (room - 8) / height) : 1;
      setPos({ left: Math.max(18, Math.min(left, f.width - WIDTH - 18)), top, scale });
    };
    measure();
    // The thread grows as texts land; aim again whenever its size changes.
    const observer = new ResizeObserver(measure);
    if (clusterRef.current) observer.observe(clusterRef.current);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { capture: true, passive: true });
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, { capture: true });
    };
  }, [contentRef, pos === null]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pos) return null;
  const label = (from: ThreadLine['from']) =>
    from === 'patient' ? fill(reply.label, { name: cast.name, day }) : fill(story.textMeta, { sender: story.sender, day });
  const avatar = (line: ThreadLine) =>
    line.from === 'patient' ? (
      <SenderAvatar kind="patient" initials={demoPatient(cast, config.copy).initials} title={cast.name} />
    ) : (
      <SenderAvatar
        kind={line.automatic ? 'automation' : 'staff'}
        title={line.automatic ? config.copy.senders.automatic : config.copy.senders.team}
      />
    );
  const current = lines[shown];
  const typing = mode === 'typing' && current ? current : null;
  const dots = mode === 'dots' && current ? current : null;
  const visible = [...lines.slice(0, shown), ...(typing ? [{ ...typing, text: typing.text.slice(0, typed) }] : [])];

  return (
    <div className={styles.overlay}>
      <div
        ref={clusterRef}
        className={styles.cluster}
        style={{ left: pos.left, top: pos.top, width: WIDTH, transform: pos.scale < 1 ? `scale(${pos.scale})` : undefined }}
        role="log"
        aria-live="polite"
      >
        {visible.map((line, i) => {
          const beingTyped = Boolean(typing) && i === visible.length - 1;
          return (
            <div key={i} className={`${styles.line} ${line.from === 'practice' ? styles.practice : styles.patient}`}>
              <div className={styles.row}>
                {avatar(line)}
                {/* While your team types, screen readers wait for the finished text. */}
                <p className={`${styles.bubble} ${i < visible.length - 1 ? styles.earlier : ''}`} aria-hidden={beingTyped || undefined}>
                  {line.text}
                  {beingTyped && <span className={styles.caret} />}
                  {line.example && !beingTyped && <span className={styles.example}>{story.exampleMessage}</span>}
                </p>
              </div>
              {/* Who sent it, under the bubble's tail. */}
              <p className={styles.label}>{label(line.from)}</p>
            </div>
          );
        })}
        {dots && (
          <div className={`${styles.line} ${dots.from === 'practice' ? styles.practice : styles.patient}`} aria-hidden="true">
            <div className={styles.row}>
              {avatar(dots)}
              <span className={styles.typing}>
                <i />
                <i />
                <i />
              </span>
            </div>
            <p className={styles.label}>{label(dots.from)}</p>
          </div>
        )}
      </div>
    </div>
  );
}
