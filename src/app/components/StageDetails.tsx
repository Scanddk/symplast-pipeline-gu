import { MessageSquare } from 'lucide-react';
import { entryEventsFor } from '../../../engine/index.ts';
import type { Stage } from '../../../schema/rules.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { ActorIcon } from './ActorBadge.tsx';
import { DraftBadge, MayDifferMarker, NcParts, RuleIdTag, VerificationBadge } from './Badges.tsx';
import styles from './StageDetails.module.css';

/**
 * The four slots for one stage, in order: what it means, gets here when, while it's here, your part.
 * Everything shown comes from content; the trigger list is derived by the engine.
 */
export function StageDetails({ stage, highlightEventId }: { stage: Stage; highlightEventId: string | null }) {
  const { config, t } = useGuideContext();
  const { copy } = config;
  const triggers = entryEventsFor(stage.id, config);
  const series = stage.seriesId ? config.seriesById[stage.seriesId] : undefined;

  return (
    <div className={styles.details}>
      <section className={styles.slot}>
        <h3 className={styles.slotTitle}>
          {copy.panel.whatItMeans} <DraftBadge draft={stage.meaning.draft} />
        </h3>
        <p>{t(stage.meaning)}</p>
        <p className={styles.meta}>
          <RuleIdTag id={stage.id} />
          <VerificationBadge verification={stage.verification} />
        </p>
        <NcParts verification={stage.verification} />
      </section>

      <section className={styles.slot}>
        <h3 className={styles.slotTitle}>{copy.panel.getsHere}</h3>
        {triggers.length === 0 ? (
          <p className={styles.muted}>{copy.panel.noEntry}</p>
        ) : (
          <ul className={styles.chips}>
            {triggers.map((event) => {
              const active = event.id === highlightEventId;
              return (
                <li
                  key={event.id}
                  className={active ? styles.chipActive : styles.chip}
                  style={{ '--actor': `var(--actor-${event.actor})` } as React.CSSProperties}
                  aria-current={active ? 'true' : undefined}
                >
                  <span className={styles.chipActor}>
                    <ActorIcon actor={event.actor} size={14} />
                    {copy.actors[event.actor]}
                  </span>
                  <span className={styles.chipLabel}>{t(event.label)}</span>
                  {(event.configurable || active) && (
                    <span className={styles.chipMeta}>
                      {event.configurable && <MayDifferMarker />}
                      {active && <span className={styles.caused}>{copy.panel.causedThis}</span>}
                    </span>
                  )}
                  <span className={styles.chipMeta}>
                    <RuleIdTag id={event.id} />
                    <VerificationBadge verification={event.verification} />
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {series && (
        <section className={styles.slot}>
          <h3 className={styles.slotTitle}>
            <MessageSquare size={16} aria-hidden="true" /> {copy.panel.whileHere}
          </h3>
          <h4 className={styles.subTitle}>{copy.panel.whatTextsAreFor}</h4>
          <p>
            {t(series.purpose)} {series.exampleTiming && <span className={styles.example}>{copy.markers.exampleTiming}</span>}
          </p>
          <p className={styles.meta}>
            <RuleIdTag id={series.id} />
            <VerificationBadge verification={series.verification} />
          </p>
          <p className={styles.rule}>
            {t(config.checkpoint.wording)}
            <span className={styles.meta}>
              <RuleIdTag id={config.checkpoint.id} />
              <VerificationBadge verification={config.checkpoint.verification} />
            </span>
          </p>
          <p className={styles.rule}>
            {t(config.checkpoint.stopsWhen, { seriesId: series.id, vars: { stage: stage.name } })}
          </p>
          <p className={styles.rule}>
            {t(config.dnd.wording)}
            <span className={styles.meta}>
              <RuleIdTag id={config.dnd.id} />
              <VerificationBadge verification={config.dnd.verification} />
              <VerificationBadge verification={series.dnd.verification} />
            </span>
          </p>
          <NcParts verification={config.dnd.verification} />
        </section>
      )}

      <section className={styles.slot}>
        <h3 className={styles.slotTitle}>
          {copy.panel.yourPart} <DraftBadge draft={stage.yourPart.draft} />
        </h3>
        <p>{t(stage.yourPart)}</p>
      </section>
    </div>
  );
}
