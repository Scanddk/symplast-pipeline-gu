import { useEffect, useLayoutEffect, useRef } from 'react';
import { animate, useReducedMotion } from 'motion/react';
import { ChevronLeft, Trophy } from 'lucide-react';
import type { EngineState, Step } from '../../../engine/index.ts';
import type { Stage } from '../../../schema/rules.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { DemoCard, type CardActions } from './DemoCard.tsx';
import { Bar, GhlCard } from './GhlCard.tsx';

const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' });
import { TextLane } from './TextLane.tsx';
import { RuleIdTag, VerificationBadge } from './Badges.tsx';
import styles from './Board.module.css';

type BoardProps = {
  engine: EngineState;
  currentStep: Step | null;
  /** Set only right after a forward step. Back and Reset never animate. */
  animatedStep: Step | null;
  onOpenStage: (stageId: string) => void;
  /** Text lanes under texting columns. The texts lesson turns them off and uses the message overlay instead. */
  showLanes?: boolean;
  /** Dim everything except the demo card and its column header, e.g. while a text bubble is on screen. */
  spotlight?: boolean;
  /** What a guided tour lets the viewer click on the card right now. */
  cardActions?: CardActions;
};

/** Neutral, GHL-like board: one column per enabled stage, then the closed-out Won area. */
export function Board({ engine, currentStep, animatedStep, onOpenStage, showLanes = true, spotlight = false, cardActions }: BoardProps) {
  const { config } = useGuideContext();
  const reducedMotion = useReducedMotion() ?? false;
  const scrollerRef = useRef<HTMLDivElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const lastCardPos = useRef<{ x: number; y: number } | null>(null);
  const lastAnimatedStepId = useRef<string | null>(null);
  const lastLocation = useRef<string | null>(null);

  const card = engine.card;
  const cardLocation = card ? (card.status === 'open' ? card.stage : 'closed_won') : null;
  // Reduced motion keeps a static highlight until the next step; otherwise it flashes once after a forward step.
  const highlightSource = reducedMotion ? currentStep : animatedStep;
  const highlighted = highlightSource?.cues.find((c) => c.type === 'highlight_column');
  const highlightStage = highlighted?.type === 'highlight_column' ? highlighted.stage : null;
  const moved = animatedStep?.cues.some((c) => c.type === 'move_card' && c.from !== null) ?? false;
  const created = animatedStep?.cues.some((c) => c.type === 'move_card' && c.from === null) ?? false;
  const textCueSeries = new Set(
    currentStep?.cues.flatMap((c) => (c.type === 'text' ? [c.seriesId] : [])) ?? [],
  );

  // Move the card in a short eased arc from where it was to where it is now. One thing moves at a time.
  useLayoutEffect(() => {
    const el = cardRef.current;
    const board = boardRef.current;
    if (!el || !board) {
      // No card (start or Reset): go back to the first column.
      if (lastLocation.current !== null && scrollerRef.current) scrollerRef.current.scrollLeft = 0;
      lastLocation.current = null;
      lastCardPos.current = null;
      return;
    }
    // If the card lands in a column scrolled out of view, jump the board sideways (no animation) so it shows.
    if (lastLocation.current !== cardLocation) {
      lastLocation.current = cardLocation;
      revealColumn(el.closest('[data-stage]'), scrollerRef.current);
    }

    const rect = el.getBoundingClientRect();
    const origin = board.getBoundingClientRect();
    const pos = { x: rect.left - origin.left, y: rect.top - origin.top };
    const previous = lastCardPos.current;
    lastCardPos.current = pos;

    // Back and Reset clear this, so stepping forward through the same step again replays the move.
    if (!animatedStep) lastAnimatedStepId.current = null;
    if (!animatedStep || !(moved || created) || reducedMotion) return;
    if (lastAnimatedStepId.current === animatedStep.id) return;
    lastAnimatedStepId.current = animatedStep.id;
    if (created) return dropCard(el);
    if (!previous) return;

    const dx = previous.x - pos.x;
    const dy = previous.y - pos.y;
    if (dx === 0 && dy === 0) return;
    flyCard(el, dx, dy);
  });

  // Keep the card's column in view when the window is resized.
  useEffect(() => {
    const onResize = () => revealColumn(cardRef.current?.closest('[data-stage]') ?? null, scrollerRef.current);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const highlight = (location: string) =>
    highlightStage === location && highlightSource ? (
      <span
        key={highlightSource.id}
        className={reducedMotion ? styles.highlightStatic : moved || created ? styles.highlightAfterMove : styles.highlight}
        aria-hidden="true"
      />
    ) : null;

  return (
    <div ref={scrollerRef} className={styles.scroller} role="region" aria-label={config.copy.board.label} tabIndex={0}>
      <div
        ref={boardRef}
        className={`${styles.board} ${spotlight ? styles.spotlight : ''}`}
        style={{ '--columns': config.stages.length } as React.CSSProperties}
      >
        {config.stages.map((stage) => {
          const enrollment = stage.seriesId ? engine.series[stage.seriesId] : undefined;
          const series = stage.seriesId ? config.seriesById[stage.seriesId] : undefined;
          const showLane =
            showLanes &&
            series &&
            enrollment &&
            (cardLocation === stage.id || enrollment.status === 'active' || textCueSeries.has(series.id));
          return (
            <div key={stage.id} className={`${styles.column} ${cardLocation === stage.id ? styles.hasCard : ''}`} data-stage={stage.id}>
              {highlight(stage.id)}
              <StageHeader stage={stage} onOpen={() => onOpenStage(stage.id)} />
              <div className={styles.body}>
                {cardLocation === stage.id && <DemoCard ref={cardRef} engine={engine} actions={cardActions} />}
                <SkeletonCard />
                <SkeletonCard />
                {showLane && <TextLane series={series} enrollment={enrollment} />}
              </div>
            </div>
          );
        })}
        <ClosedOutArea highlight={highlight('closed_won')} hasCard={cardLocation === 'closed_won'}>
          {cardLocation === 'closed_won' && <DemoCard ref={cardRef} engine={engine} actions={cardActions} />}
        </ClosedOutArea>
      </div>
    </div>
  );
}

/**
 * Fly the card from its old spot (dx, dy away) to where it now sits: one continuous eased path with an arc.
 * On the way it lifts toward the viewer, leans into its direction of travel, and its shadow deepens
 * (the card reads `--lift`, 0 → 1 → 0). Starts in the same frame so the card never flashes at its destination.
 */
function flyCard(el: HTMLElement, dx: number, dy: number) {
  const arc = Math.min(70, 24 + Math.abs(dx) / 8);
  const travel = dx < 0 ? 1 : -1; // +1 when moving right
  const place = (p: number) => {
    const lift = Math.sin(Math.PI * p);
    const x = dx * (1 - p);
    const y = dy * (1 - p) - arc * lift;
    el.style.transform =
      `perspective(900px) translate3d(${x}px, ${y}px, ${lift * 40}px) ` +
      `rotateY(${travel * 12 * lift}deg) rotateX(${8 * lift}deg) rotateZ(${travel * 3 * lift}deg)`;
    el.style.setProperty('--lift', lift.toFixed(3));
  };
  place(0);
  animate(0, 1, {
    duration: 0.75,
    ease: [0.45, 0, 0.2, 1],
    onUpdate: place,
    onComplete: () => {
      el.style.transform = '';
      el.style.removeProperty('--lift');
    },
  });
}

/**
 * A new opportunity arriving: the card drops into its column from above and toward the viewer,
 * tipping flat as it lands, with its shadow settling (`--lift` 1 → 0).
 */
function dropCard(el: HTMLElement) {
  const place = (p: number) => {
    const lift = 1 - p;
    el.style.opacity = String(Math.min(1, p * 2.5));
    el.style.transform =
      `perspective(900px) translate3d(0, ${-70 * lift}px, ${90 * lift}px) ` +
      `rotateX(${-28 * lift}deg) scale(${1 - 0.12 * lift})`;
    el.style.setProperty('--lift', lift.toFixed(3));
  };
  place(0);
  animate(0, 1, {
    duration: 0.75,
    ease: [0.34, 1.3, 0.64, 1],
    onUpdate: place,
    onComplete: () => {
      el.style.transform = '';
      el.style.opacity = '';
      el.style.removeProperty('--lift');
    },
  });
}

/** Scroll the board just enough that a column is fully visible. Instant, so the card's arc stays the only motion. */
function revealColumn(column: Element | null, scroller: HTMLElement | null) {
  if (!column || !scroller) return;
  const col = column.getBoundingClientRect();
  const view = scroller.getBoundingClientRect();
  const margin = 16;
  if (col.right > view.right) scroller.scrollLeft += col.right - view.right + margin;
  else if (col.left < view.left) scroller.scrollLeft -= view.left - col.left + margin;
}

function StageHeader({ stage, onOpen }: { stage: Stage; onOpen: () => void }) {
  const { config, fill } = useGuideContext();
  const stats = config.exampleBoard[stage.id];
  const { opportunities } = config.copy.ghl;
  return (
    <div className={styles.headerWrap}>
      <button type="button" className={styles.header} onClick={onOpen} aria-haspopup="dialog" data-stage-header={stage.id}>
        <span className={styles.dot} style={{ background: `var(--stage-dot-${stage.dot})` }} aria-hidden="true" />
        <ChevronLeft className={styles.chevron} size={14} aria-hidden="true" />
        <span className={styles.stageName}>
          {stage.seriesId && <span className={styles.chat}>💬 </span>}
          {/* Allow a line break after "/" so long names wrap between words, not inside them. */}
          {stage.name.split('/').map((part, i) => (
            <span key={i}>
              {i > 0 && '/'}
              {i > 0 && <wbr />}
              {part}
            </span>
          ))}
        </span>
        {/* Fictional example numbers, as GHL shows them. Hidden from screen readers so the button reads as the stage name. */}
        <span className={styles.headerStats} aria-hidden="true">
          <span>{fill(stats.count === 1 ? opportunities.one : opportunities.other, { count: stats.count })}</span>
          <span className={styles.headerValue}>{usd.format(stats.value)}</span>
        </span>
      </button>
      <span className={styles.headerMeta}>
        <RuleIdTag id={stage.id} />
        <VerificationBadge verification={stage.verification} compact />
      </span>
    </div>
  );
}

function SkeletonCard() {
  return (
    <div aria-hidden="true">
      <GhlCard
        name={<Bar width="68%" />}
        rows={[
          { label: <Bar width="34px" />, value: <Bar width="80%" /> },
          { label: <Bar width="28px" />, value: <Bar width="55%" /> },
          { label: <Bar width="32px" />, value: <Bar width="34px" /> },
        ]}
      />
    </div>
  );
}

function ClosedOutArea(props: { children: React.ReactNode; highlight: React.ReactNode; hasCard: boolean }) {
  const { children, highlight, hasCard } = props;
  const { config } = useGuideContext();
  return (
    <div className={`${styles.closedOut} ${hasCard ? styles.hasCard : ''}`} data-stage="closed_won">
      {highlight}
      <p className={styles.closedTitle}>
        <Trophy size={14} aria-hidden="true" />
        {config.copy.closedOut.title}
      </p>
      <p className={styles.closedBody}>{config.copy.closedOut.body}</p>
      {children}
    </div>
  );
}
