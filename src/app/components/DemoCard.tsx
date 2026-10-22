import { forwardRef } from 'react';
import type { EngineState } from '../../../engine/index.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { GhlCard, GhlStatus } from './GhlCard.tsx';
import styles from './DemoCard.module.css';

/** What a guided tour lets the viewer click on the card. */
export type CardActions = { onOpen?: () => void; onOpenName?: () => void; onCall?: () => void };

/** The single demo opportunity card, laid out like a real CRM card: name, source, status, and the action icons. */
export const DemoCard = forwardRef<HTMLDivElement, { engine: EngineState; actions?: CardActions }>(function DemoCard(
  { engine, actions },
  ref,
) {
  const { config, cast, fill } = useGuideContext();
  const card = engine.card!;

  return (
    <div
      ref={ref}
      className={`${styles.wrap} ${actions?.onOpen ? styles.clickable : ''}`}
      data-testid="demo-card"
      role={actions?.onOpen ? 'button' : undefined}
      tabIndex={actions?.onOpen ? 0 : undefined}
      aria-label={actions?.onOpen ? fill(config.copy.card.openLabel) : undefined}
      onClick={actions?.onOpen}
      onKeyDown={(e) => {
        if (actions?.onOpen && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          actions.onOpen();
        }
      }}
    >
      <GhlCard
        variant="demo"
        onCall={actions?.onCall}
        callLabel={fill(config.copy.card.callLabel)}
        name={
          actions?.onOpenName ? (
            <button
              type="button"
              className={styles.nameButton}
              data-card-name
              aria-label={fill(config.copy.card.contactLabel)}
              onClick={(e) => {
                e.stopPropagation();
                actions.onOpenName?.();
              }}
            >
              {cast.name}
            </button>
          ) : (
            <span data-card-name>{cast.name}</span>
          )
        }
        rows={[
          { label: config.copy.card.sourceLabel, value: cast.source },
          { label: config.copy.card.statusLabel, value: <GhlStatus>{config.copy.card.status[card.status]}</GhlStatus> },
        ]}
      />
    </div>
  );
});
