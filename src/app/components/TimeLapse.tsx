import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { CalendarDays } from 'lucide-react';
import { useReducedMotion } from 'motion/react';
import { useGuideContext } from '../GuideContext.tsx';
import { AssistPointer } from './AssistPointer.tsx';
import styles from './TimeLapse.module.css';

/**
 * One day and night, sunrise to sunrise, as the calendar flips. Each day takes longer than the one before,
 * so time drags while nothing happens (and the later days, like the cheeky ones, stay on screen longer).
 */
const FIRST_DAY_MS = 1000;
const SLOWER_BY_MS = 450;
const dayMs = (i: number) => FIRST_DAY_MS + i * SLOWER_BY_MS;

/**
 * Days go by before the clock jumps: above the calendar, the sun rises, crosses, and sets, night falls with the
 * moon and stars, and the calendar flips at each sunrise, each day a little slower. It ends with the sun easing
 * up on the last day; then the viewer sees what happened to the card.
 */
export function TimeLapse(props: {
  fromDay: number;
  toDay: number;
  /** What to say once the days have gone by (already filled in). */
  text: { title: string; body: string; continue: string; hint: string };
  /** An emoji that crosses the sky instead of the sun, by day counted from fromDay (0 = the first day). */
  sunFaces?: Record<string, string>;
  onComplete: () => void;
}) {
  const { fromDay, toDay, text, sunFaces, onComplete } = props;
  const { config, fill } = useGuideContext();
  const { timeLapse: t } = config.copy;
  const reducedMotion = useReducedMotion() ?? false;
  const [day, setDay] = useState(reducedMotion ? toDay : fromDay);
  const cardRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const done = day >= toDay;
  const days = Math.max(0, toDay - fromDay);
  // The calendar flips at each sunrise, so `day` is the day the sky is cycling through.
  const face = done ? undefined : sunFaces?.[String(day - fromDay)];

  useEffect(() => {
    if (done) return;
    const timer = window.setTimeout(() => setDay((d) => d + 1), dayMs(day - fromDay));
    return () => window.clearTimeout(timer);
  }, [day, done, fromDay]);

  useEffect(() => {
    if (done) buttonRef.current?.focus({ preventScroll: true });
  }, [done]);

  return (
    <div className={styles.backdrop}>
      <div ref={cardRef} className={styles.card} role="dialog" aria-modal="true" aria-label={text.title}>
        <div
          className={`${styles.sky} ${reducedMotion || days === 0 ? styles.still : done ? styles.rest : ''}`}
          aria-hidden="true"
        >
          {/* One day's cycle, started afresh each day at that day's length; each starts at sunrise, where the last ended. */}
          <div key={day} className={styles.cycle} style={{ '--day-ms': `${dayMs(day - fromDay)}ms` } as CSSProperties}>
            <span className={styles.night} />
            <span className={styles.glow} />
            <span className={styles.stars} />
            <span className={styles.orbit}>
              {/* An emoji in the sun's place stays upright as it arcs. */}
              {face ? <i className={styles.face}>{face}</i> : <i className={styles.sun} />}
              <i className={styles.moon} />
            </span>
            <svg className={styles.hills} viewBox="0 0 520 80" preserveAspectRatio="none">
              <path className={styles.hillBack} d="M0 46 C 70 18 150 20 230 40 S 400 10 520 34 V 80 H 0 Z" />
              <path className={styles.hillFront} d="M0 64 C 90 40 190 44 280 60 S 440 46 520 58 V 80 H 0 Z" />
            </svg>
          </div>
        </div>
        <div className={styles.calendar} aria-hidden="true">
          <span className={styles.rings}>
            <i />
            <i />
          </span>
          <CalendarDays size={18} className={styles.calIcon} />
          <span key={day} className={styles.day}>
            {fill(t.day, { day })}
          </span>
        </div>
        <p className={`${styles.title} ${done ? styles.shown : ''}`} aria-live="polite">
          {done ? text.title : ' '}
        </p>
        <p className={`${styles.body} ${done ? styles.shown : ''}`}>{text.body}</p>
        <button ref={buttonRef} type="button" className={styles.button} onClick={onComplete} disabled={!done}>
          {text.continue}
        </button>
        {done && <AssistPointer containerRef={cardRef} getTarget={() => buttonRef.current} targetKey="continue" hint={text.hint} />}
      </div>
    </div>
  );
}
