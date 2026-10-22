import { useLayoutEffect, useState, type RefObject } from 'react';
import { useReducedMotion } from 'motion/react';
import styles from './AssistPointer.module.css';

/**
 * Assistive-touch guide for the lesson demos: a translucent touch circle that glides to the next thing
 * to tap and ripples there, with a short hint beside it (announced politely for screen readers).
 * Pass a different `targetRef` for each step and it travels there.
 */
export function AssistPointer(props: {
  containerRef: RefObject<HTMLElement | null>;
  /** What to point at now. */
  getTarget: () => Element | null | undefined;
  /** Changes whenever the target changes, so the guide travels to the new one. */
  targetKey: string;
  hint: string;
}) {
  const { containerRef, getTarget, targetKey, hint } = props;
  const reducedMotion = useReducedMotion() ?? false;
  const [pos, setPos] = useState<{ x: number; y: number; tip: 'right' | 'left' | 'below' | 'above' } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const container = containerRef.current;
      const target = getTarget();
      if (!container || !target) return;
      const c = container.getBoundingClientRect();
      const t = target.getBoundingClientRect();
      // Screen distances inside a scaled container (e.g. the zoomed-out CRM) are scaled too; undo that.
      const scale = container.offsetWidth ? c.width / container.offsetWidth : 1;
      // Aim a little right of centre so the touch doesn't hide the label being pointed at.
      const x = (t.left - c.left + t.width * 0.78) / scale;
      const y = (t.top - c.top + t.height / 2) / scale + container.scrollTop;
      // Hint beside the touch (right, else left) so it never covers the next options; above/below as a last resort.
      // Room is measured to the container's edges if it clips its content, otherwise to the window's.
      const clips = getComputedStyle(container).overflow !== 'visible';
      const touchX = t.left + t.width * 0.78;
      const roomRight = (clips ? c.right : window.innerWidth) - touchX;
      const roomLeft = touchX - (clips ? c.left : 0);
      const tip = roomRight > 300 ? 'right' : roomLeft > 300 ? 'left' : y < container.offsetHeight - 120 ? 'below' : 'above';
      setPos({ x, y, tip });
    };
    // Start from the middle of the window the first time, so the guide visibly travels to its first target.
    let frame = 0;
    if (!pos && containerRef.current) {
      const c = containerRef.current.getBoundingClientRect();
      setPos({ x: c.width / 2, y: c.height * 0.75, tip: 'right' });
      frame = requestAnimationFrame(() => requestAnimationFrame(measure));
    } else {
      measure();
    }
    // Windows open and panels slide in (the target's or any ancestor's animation); aim again once they've settled.
    // This matters most for the first target, which is often measured while its window is still opening.
    document.addEventListener('animationend', measure, true);
    window.addEventListener('resize', measure);
    // Any scroll (page, board, or panel) moves the target.
    window.addEventListener('scroll', measure, { capture: true, passive: true });
    // Camera moves (zooms) shift everything; aim again once they finish.
    document.addEventListener('transitionend', measure);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener('animationend', measure, true);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, { capture: true });
      document.removeEventListener('transitionend', measure);
    };
  }, [containerRef, targetKey]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!pos) return null;
  return (
    <div className={`${styles.pointer} ${reducedMotion ? styles.still : ''}`} style={{ left: pos.x, top: pos.y }}>
      <span className={styles.touch} aria-hidden="true">
        <span className={styles.ripple} />
        <span className={styles.ripple} />
      </span>
      <p className={`${styles.tip} ${styles[`tip_${pos.tip}`]}`} aria-live="polite">
        {hint}
      </p>
    </div>
  );
}
