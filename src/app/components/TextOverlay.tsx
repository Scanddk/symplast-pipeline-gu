import { useLayoutEffect, useState, type CSSProperties, type RefObject } from 'react';
import { Check, CheckCheck, Hand, Hourglass, X } from 'lucide-react';
import { formatDays, type EngineState, type Step, type TextState } from '../../../engine/index.ts';
import { useGuideContext } from '../GuideContext.tsx';
import styles from './TextOverlay.module.css';

/** A box in board-frame coordinates. */
type Box = { x: number; y: number; w: number; h: number };

/** Where everything goes, measured from the board as it is on screen. */
type Placement = {
  top: number;
  left: number;
  side: 'left' | 'right';
  /** Below 1 when the message stack is taller than the visible space; it shrinks to fit. */
  scale: number;
  frameWidth: number;
  bandTop: number;
  card: Box;
  /** Header of the stage the texts belong to: what "still in this stage?" checks. */
  header: Box | null;
  /** The card's status pill: what "still open?" checks. */
  status: Box | null;
};

const CLUSTER_WIDTH = 340;
const GAP = 18;
/** The stack never shrinks below this; past it, the page scrolls instead. */
const MIN_SCALE = 0.6;
/** Rough size of a check pill, for keeping it on screen. */
const PILL_WIDTH = 250;
const PILL_HEIGHT = 34;

/*
 * The moment a text is due, played slowly enough to follow (milliseconds from the step):
 * the wait ticks by; each check lights up what it looks at, thinks, then answers and holds;
 * then the message sends.
 */
const WAIT_MS = 1400;
const CHECK_START_MS = WAIT_MS + 300;
const CHECK_PENDING_MS = 1300;
const CHECK_HOLD_MS = 900;
const TYPING_MS = 800;

/**
 * The text moment in the texts lesson, drawn over the board like on-screen texts in a TV drama.
 * Each check is anchored to the thing it checks: the stage header ("still in this stage?") and the
 * card's status pill ("still open?"), each ringed in turn with its answer pill beside it.
 * Then the message sends beside the card, with earlier texts in the thread behind it.
 * `animate` plays the sequence; otherwise (Back, Restart, reduced motion) the end state shows at once.
 */
export function TextOverlay(props: {
  step: Step | null;
  engine: EngineState;
  frameRef: RefObject<HTMLElement | null>;
  animate: boolean;
}) {
  const { step, engine, frameRef, animate } = props;
  const { config, t, fill } = useGuideContext();
  const { story, lane, board } = config.copy;
  const [clusterEl, setClusterEl] = useState<HTMLDivElement | null>(null);
  /** Step whose earlier texts were dropped for space. The new message always stays full size. */
  const [historyDroppedFor, setHistoryDroppedFor] = useState<string | null>(null);

  const cue = step?.cues.find((c) => c.type === 'text');
  const textCue = cue?.type === 'text' ? cue : null;
  const series = textCue ? config.seriesById[textCue.seriesId] : null;
  const textStepId = textCue ? step!.id : null;
  const showHistory = historyDroppedFor !== textStepId;
  const hasHistory = Boolean(
    textCue && series && engine.series[series.id]?.texts.some((x, i) => x.state === 'sent' && i < series.texts.findIndex((t) => t.id === textCue.textId)),
  );
  const placement = useCardPlacement(frameRef, clusterEl, textStepId, series?.stageId ?? null, {
    canDrop: showHistory && hasHistory,
    drop: () => setHistoryDroppedFor(textStepId),
  });
  useRevealCard(frameRef, textCue ? step!.id : null, series?.stageId ?? null);

  if (!step || !textCue || !series || !placement) return null;
  const enrollment = engine.series[series.id];
  const current = series.texts.findIndex((x) => x.id === textCue.textId);
  if (!enrollment || current < 0) return null;
  const stage = config.stageById[series.stageId];
  const message = (i: number) => t({ client: series.texts[i].message, internal: series.texts[i].message });
  const label = (i: number) => fill(story.textMeta, { sender: story.sender, day: enrollment.texts[i].dueOn });
  const history = showHistory ? enrollment.texts.map((x, i) => ({ x, i })).filter(({ x, i }) => i < current && x.state === 'sent') : [];
  const now = enrollment.texts[current];
  const outcome = textCue.state;

  // Staff stopping the texts happens now, not after a wait, and runs no check.
  const waitDays = outcome === 'stopped_by_staff' ? 0 : series.texts[current].waitDays;
  const checkStart = waitDays > 0 ? CHECK_START_MS : 0;
  const checkStep = CHECK_PENDING_MS + CHECK_HOLD_MS;
  const checks = now.check
    ? [
        {
          key: 'stage',
          label: t(config.checkpoint.questions.inStage, { vars: { stage: stage.name } }),
          yes: now.check.stillInStage,
          target: placement.header,
        },
        { key: 'open', label: t(config.checkpoint.questions.open), yes: now.check.open, target: placement.status },
      ].map((check, i) => ({ ...check, in: checkStart + i * checkStep, done: checkStart + i * checkStep + CHECK_PENDING_MS }))
    : [];
  const sendAt = checkStart + checks.length * checkStep;
  const bubbleAt = outcome === 'sent' ? sendAt + TYPING_MS : sendAt;
  const [dayBefore, dayAfter] = board.day.split('{day}');
  const days = Array.from({ length: waitDays + 1 }, (_, i) => now.dueOn - waitDays + i);
  const ms = (value: number) => `${value}ms`;
  const { card, header } = placement;
  const spotlightHeader = header && checks.length > 0;

  return (
    <div key={step.id} className={`${styles.overlay} ${animate ? styles.play : styles.still}`}>
      {/* Darken and blur the board, leaving spotlights on the card and on the stage being checked. */}
      <div
        className={styles.scrim}
        aria-hidden="true"
        style={
          {
            '--cx': `${card.x + card.w / 2}px`,
            '--cy': `${card.y + card.h / 2}px`,
            '--rx': `${card.w * 0.95}px`,
            '--ry': `${card.h * 0.95}px`,
            '--hx': spotlightHeader ? `${header.x + header.w / 2}px` : '-500px',
            '--hy': spotlightHeader ? `${header.y + header.h / 2}px` : '-500px',
            '--hrx': spotlightHeader ? `${header.w * 0.85}px` : '1px',
            '--hry': spotlightHeader ? `${header.h * 1.2}px` : '1px',
          } as CSSProperties
        }
      />

      {/* Each check: a ring on what it looks at, and its answer pill right beside it. */}
      {checks.map((check) =>
        check.target ? (
          <div key={check.key} aria-hidden="true">
            <div
              className={`${styles.ring} ${check.yes ? styles.ringPass : styles.ringFail}`}
              style={
                {
                  left: check.target.x - 6,
                  top: check.target.y - 6,
                  width: check.target.w + 12,
                  height: check.target.h + 12,
                  '--in': ms(check.in),
                  '--done': ms(check.done),
                } as CSSProperties
              }
            >
              <span className={styles.ringPending} />
            </div>
            <CheckPill
              check={check}
              anchor={check.key === 'stage' ? pillAboveHeader(check.target, placement) : pillBesideStatus(check.target, placement)}
              answer={check.yes ? story.yes : story.no}
            />
          </div>
        ) : null,
      )}

      <div
        ref={setClusterEl}
        className={`${styles.cluster} ${placement.side === 'left' ? styles.toLeft : styles.toRight}`}
        style={{
          top: placement.top,
          left: placement.left,
          width: CLUSTER_WIDTH,
          transform: placement.scale < 1 ? `scale(${placement.scale})` : undefined,
          transformOrigin: placement.side === 'left' ? '100% 0' : '0 0',
        }}
        role="status"
        aria-label={story.messageLabel}
      >
        {history.map(({ i }) => (
          <div key={i} className={styles.past}>
            <p className={styles.label}>{label(i)}</p>
            <p className={styles.bubble}>{message(i)}</p>
          </div>
        ))}

        <div className={styles.now}>
          {waitDays > 0 && (
            <div className={styles.wait} style={{ '--n': waitDays, '--wait': ms(WAIT_MS) } as CSSProperties}>
              <Hourglass size={14} className={styles.hourglass} aria-hidden="true" />
              <span>{fill(lane.wait, { days: formatDays(waitDays, config) })}</span>
              <span className={styles.dayTicker} aria-hidden="true">
                {dayBefore}
                <span className={styles.odometer}>
                  <span className={styles.digits}>
                    {days.map((d) => (
                      <span key={d}>{d}</span>
                    ))}
                  </span>
                </span>
                {dayAfter}
              </span>
              <span className={styles.waitBar} aria-hidden="true" />
            </div>
          )}

          {/* Screen readers get the checks here; on screen they sit beside what they check. */}
          {checks.length > 0 && (
            <ul className="visually-hidden">
              {checks.map((check) => (
                <li key={check.key}>
                  {check.label} {check.yes ? story.yes : story.no}
                </li>
              ))}
            </ul>
          )}

          <div className={styles.message} style={{ '--send-at': ms(sendAt), '--bubble-at': ms(bubbleAt), '--typing': ms(TYPING_MS) } as CSSProperties}>
            <p className={styles.label}>
              {label(current)}
              {series.exampleMessages && <span className={styles.example}>{story.exampleMessage}</span>}
            </p>
            <div className={styles.send}>
              {outcome === 'sent' && (
                <span className={styles.typing} aria-hidden="true">
                  <i />
                  <i />
                  <i />
                </span>
              )}
              <p className={`${styles.bubble} ${outcome === 'sent' ? styles.sent : styles.notSent}`}>{message(current)}</p>
            </div>
            {outcome === 'sent' ? (
              <p className={styles.status}>
                <CheckCheck size={13} aria-hidden="true" />
                {lane.states.sent}
              </p>
            ) : (
              <Outcome state={outcome} reason={now.skipReason ? t(config.checkpoint.skipReasons[now.skipReason]) : null} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

type Anchor = {
  left: number;
  top: number;
  shift: string;
  arrow: 'down' | 'up' | 'left' | 'right';
  /** For up/down pointers: where along the pill the pointer sits, so it still aims at the target after clamping. */
  arrowX?: number;
};

/** Centred above the stage header, or below it if the header is at the top of the visible area. */
function pillAboveHeader(header: Box, p: Placement): Anchor {
  const target = header.x + header.w / 2;
  const left = Math.max(GAP, Math.min(target - PILL_WIDTH / 2, p.frameWidth - GAP - PILL_WIDTH));
  const arrowX = target - left;
  const above = header.y - PILL_HEIGHT - 14;
  return above >= p.bandTop
    ? { left, top: above, shift: 'none', arrow: 'down', arrowX }
    : { left, top: header.y + header.h + 14, shift: 'none', arrow: 'up', arrowX };
}

/** Next to the status pill, on the side away from the message; below the card if there's no room. */
function pillBesideStatus(status: Box, p: Placement): Anchor {
  const middle = status.y + status.h / 2;
  if (p.side === 'right') {
    // The message is to the right of the card, so the pill goes on the card's left.
    if (p.card.x - 14 - PILL_WIDTH >= GAP) return { left: p.card.x - 14, top: middle, shift: 'translate(-100%, -50%)', arrow: 'right' };
  } else if (status.x + status.w + 14 + PILL_WIDTH <= p.frameWidth - GAP) {
    return { left: status.x + status.w + 14, top: middle, shift: 'translateY(-50%)', arrow: 'left' };
  }
  const left = Math.max(GAP, Math.min(p.card.x, p.frameWidth - GAP - PILL_WIDTH));
  return { left, top: p.card.y + p.card.h + 14, shift: 'none', arrow: 'up', arrowX: status.x + status.w / 2 - left };
}

const ARROW_CLASS = { down: 'arrowDown', up: 'arrowUp', left: 'arrowLeft', right: 'arrowRight' } as const;

function CheckPill(props: { check: { label: string; yes: boolean; in: number; done: number }; anchor: Anchor; answer: string }) {
  const { check, anchor, answer } = props;
  return (
    <div
      className={styles.anchor}
      style={
        {
          left: anchor.left,
          top: anchor.top,
          transform: anchor.shift,
          width: anchor.arrowX !== undefined ? PILL_WIDTH : undefined,
          '--arrow-x': anchor.arrowX !== undefined ? `${anchor.arrowX}px` : undefined,
        } as CSSProperties
      }
    >
      <span
        className={`${styles.pill} ${styles[ARROW_CLASS[anchor.arrow]]} ${check.yes ? styles.pass : styles.fail}`}
        style={{ '--in': `${check.in}ms`, '--done': `${check.done}ms` } as CSSProperties}
      >
        <span className={styles.pillIcon}>
          <span className={styles.spinner} />
          <span className={styles.reveal}>{check.yes ? <Check size={14} /> : <X size={14} />}</span>
        </span>
        {check.label}
        <strong className={styles.reveal}>{answer}</strong>
      </span>
    </div>
  );
}

function Outcome({ state, reason }: { state: TextState; reason: string | null }) {
  const { config } = useGuideContext();
  const { story, lane } = config.copy;
  if (state === 'skipped')
    return (
      <p className={styles.outcome}>
        <X size={13} aria-hidden="true" />
        {story.notSent}
        {reason && `: ${reason}`}
      </p>
    );
  if (state === 'stopped_by_staff')
    return (
      <p className={styles.outcome}>
        <Hand size={13} aria-hidden="true" />
        {lane.states.stopped_by_staff}
      </p>
    );
  return null;
}

const boxIn = (el: Element | null | undefined, frame: DOMRect): Box | null => {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { x: r.left - frame.left, y: r.top - frame.top, w: r.width, h: r.height };
};

/**
 * Measure the card, the stage header, and the status pill, then place the message stack beside the card,
 * inside the part of the board that is on screen (above the pinned dock) and clear of the stage header.
 * If the stack is taller than that space (short laptop screens), earlier texts are dropped first so every
 * new message shows at the same size; only if it still doesn't fit does the stack shrink.
 * Kept up to date as the page or board scrolls, the window resizes, the opening zoom settles,
 * or the stack changes size.
 */
function useCardPlacement(
  frameRef: RefObject<HTMLElement | null>,
  clusterEl: HTMLElement | null,
  stepId: string | null,
  stageId: string | null,
  history: { canDrop: boolean; drop: () => void },
): Placement | null {
  const [placement, setPlacement] = useState<Placement | null>(null);

  useLayoutEffect(() => {
    const frame = frameRef.current;
    if (!frame || !stepId) return;
    const measure = () => {
      const cardEl = frame.querySelector('[data-testid="demo-card"]');
      if (!cardEl) return setPlacement(null);
      const f = frame.getBoundingClientRect();
      const card = boxIn(cardEl, f)!;
      const header = stageId ? boxIn(frame.querySelector(`[data-stage-header="${stageId}"]`), f) : null;
      const status = boxIn(cardEl.querySelector('[data-status-pill]'), f);

      // The visible band, in board coordinates: below the window top, above the dock (or window bottom).
      const dock = document.querySelector('[data-dock]');
      const visibleBottom = dock ? dock.getBoundingClientRect().top : window.innerHeight;
      const bandTop = Math.max(f.top, 0) - f.top + GAP;
      const bandBottom = Math.min(f.bottom, visibleBottom) - f.top - GAP;

      const natural = clusterEl?.offsetHeight ?? 0;
      const side = card.x > CLUSTER_WIDTH * MIN_SCALE + GAP * 2 ? 'left' : 'right';
      const stackLeft = side === 'left' ? card.x - GAP - CLUSTER_WIDTH : card.x + card.w + GAP;
      // If the stack would sit over the stage header (and its pill), start it below the header instead.
      const overHeader = header !== null && stackLeft < header.x + header.w + 40 && stackLeft + CLUSTER_WIDTH > header.x - 40;
      const top = overHeader ? Math.max(bandTop, header.y + header.h + GAP) : bandTop;
      const band = Math.max(0, bandBottom - top);
      if (natural > band && band > 0 && history.canDrop) return history.drop();
      const scale = natural > band && band > 0 ? Math.max(MIN_SCALE, band / natural) : 1;
      const height = natural * scale;
      const width = CLUSTER_WIDTH * scale;
      const centred = card.y + card.h / 2 - height / 2;

      setPlacement({
        top: Math.max(top, Math.min(centred, bandBottom - height)),
        left: Math.max(GAP - (CLUSTER_WIDTH - width), Math.min(stackLeft, f.width - CLUSTER_WIDTH - GAP)),
        side,
        scale,
        frameWidth: f.width,
        bandTop,
        card,
        header,
        status,
      });
    };
    measure();
    const scroller = frame.querySelector('[role="region"]');
    scroller?.addEventListener('scroll', measure);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { passive: true });
    // The opening zoom changes the board's size; measure again once it settles.
    document.addEventListener('transitionend', measure);
    const resize = clusterEl ? new ResizeObserver(measure) : null;
    if (clusterEl) resize?.observe(clusterEl);
    return () => {
      scroller?.removeEventListener('scroll', measure);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure);
      document.removeEventListener('transitionend', measure);
      resize?.disconnect();
    };
  }, [frameRef, clusterEl, stepId, stageId, history.canDrop]); // eslint-disable-line react-hooks/exhaustive-deps

  return placement;
}

/**
 * When a text plays, make sure the card and the stage header being checked are on screen:
 * scroll the board sideways to them, then the page so they sit above the pinned dock.
 * Instant, so the text sequence stays the only motion.
 */
function useRevealCard(frameRef: RefObject<HTMLElement | null>, textStepId: string | null, stageId: string | null) {
  useLayoutEffect(() => {
    if (!textStepId) return;
    const frame = frameRef.current;
    const card = frame?.querySelector('[data-testid="demo-card"]');
    if (!frame || !card) return;
    const header = stageId ? frame.querySelector(`[data-stage-header="${stageId}"]`) : null;
    const span = () => {
      const c = card.getBoundingClientRect();
      const h = header?.getBoundingClientRect();
      return {
        left: Math.min(c.left, h?.left ?? c.left),
        right: Math.max(c.right, h?.right ?? c.right),
        // Leave room above the header for its check pill, and below the card for a pill there.
        top: Math.min(c.top, h ? h.top - PILL_HEIGHT - 20 : c.top),
        bottom: c.bottom + PILL_HEIGHT,
      };
    };
    const scroller = frame.querySelector<HTMLElement>('[role="region"]');
    if (scroller) {
      const s = scroller.getBoundingClientRect();
      const box = span();
      if (box.right > s.right - GAP) scroller.scrollLeft += box.right - s.right + GAP;
      else if (box.left < s.left + GAP) scroller.scrollLeft -= s.left - box.left + GAP;
    }
    const box = span();
    const dock = document.querySelector('[data-dock]');
    const visibleBottom = dock ? dock.getBoundingClientRect().top : window.innerHeight;
    if (box.bottom > visibleBottom - GAP) window.scrollBy({ top: box.bottom - visibleBottom + GAP, behavior: 'instant' });
    else if (box.top < GAP) window.scrollBy({ top: box.top - GAP, behavior: 'instant' });
  }, [frameRef, textStepId, stageId]);
}
