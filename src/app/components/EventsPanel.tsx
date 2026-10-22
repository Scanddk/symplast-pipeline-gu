import { FastForward, RotateCcw, Undo2 } from 'lucide-react';
import type { OfferedEvent } from '../../../engine/index.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { ActorBadge } from './ActorBadge.tsx';
import { MayDifferMarker, RuleIdTag, VerificationBadge } from './Badges.tsx';
import styles from './EventsPanel.module.css';

type EventsPanelProps = {
  offered: OfferedEvent[];
  seriesId: string | undefined;
  closed: boolean;
  canGoBack: boolean;
  onFire: (eventId: string) => void;
  onBack: () => void;
  onReset: () => void;
};

/** "What happens next?": only the events valid from the current state, plus Skip ahead, Back, and Reset. */
export function EventsPanel({ offered, seriesId, closed, canGoBack, onFire, onBack, onReset }: EventsPanelProps) {
  const { config, t } = useGuideContext();
  const { copy } = config;
  const actions = offered.filter((o) => o.event.kind === 'action');
  const skip = offered.find((o) => o.event.kind === 'skip_ahead');

  return (
    <section className={styles.panel} aria-labelledby="events-title">
      <h2 id="events-title" className={styles.title}>
        {copy.events.title}
      </h2>
      {closed && actions.length === 0 && <p className={styles.note}>{copy.events.noMoreActions}</p>}
      <ul className={styles.list}>
        {actions.map(({ event }) => (
          <li key={event.id}>
            <button
              type="button"
              className={styles.event}
              style={{ '--actor': `var(--actor-${event.actor})` } as React.CSSProperties}
              onClick={() => onFire(event.id)}
            >
              <ActorBadge actor={event.actor} />
              <span className={styles.label}>{t(event.label, { seriesId })}</span>
              <span className={styles.meta}>
                {event.configurable && <MayDifferMarker />}
                <RuleIdTag id={event.id} />
                <VerificationBadge verification={event.verification} />
              </span>
            </button>
          </li>
        ))}
      </ul>
      <div className={styles.controls}>
        {skip && (
          <div className={styles.skipWrap}>
            <button
              type="button"
              className={styles.skip}
              onClick={() => onFire(skip.event.id)}
              disabled={!skip.enabled}
              aria-describedby={skip.enabled ? undefined : 'skip-reason'}
            >
              <FastForward size={16} aria-hidden="true" />
              <span>
                <span className={styles.skipTitle}>{copy.events.skipAhead}</span>
                <span className={styles.skipHint}>{t(skip.event.label)}</span>
              </span>
            </button>
            {!skip.enabled && skip.reason && (
              <p id="skip-reason" className={styles.reason}>
                {skip.reason}
              </p>
            )}
          </div>
        )}
        <button type="button" className={styles.secondary} onClick={onBack} disabled={!canGoBack}>
          <Undo2 size={16} aria-hidden="true" />
          {copy.events.back}
        </button>
        <button type="button" className={styles.secondary} onClick={onReset} disabled={!canGoBack}>
          <RotateCcw size={16} aria-hidden="true" />
          {copy.events.reset}
        </button>
      </div>
    </section>
  );
}
