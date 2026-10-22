import { Ban, Check, Clock, Hand, Hourglass, MessageSquare, X } from 'lucide-react';
import { formatDays, type Enrollment } from '../../../engine/index.ts';
import type { Series } from '../../../schema/rules.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { RuleIdTag, VerificationBadge } from './Badges.tsx';
import styles from './TextLane.module.css';

/**
 * Slim vertical lane under a 💬 column: wait → check → text, repeated.
 * Time is compressed: each row shows the simulated day, not real spacing.
 */
export function TextLane({ series, enrollment }: { series: Series; enrollment: Enrollment }) {
  const { config, fill, t } = useGuideContext();
  const { copy } = config;
  const nextIndex = enrollment.status === 'active' ? enrollment.texts.findIndex((x) => x.state === 'upcoming') : -1;
  const failedIndex = enrollment.texts.findIndex((x) => x.state === 'skipped');

  return (
    <section className={styles.lane} aria-label={`${copy.lane.label}: ${t(series.name)}`}>
      <header className={styles.header}>
        <span className={styles.title}>
          <MessageSquare size={12} aria-hidden="true" />
          {t(series.name)}
        </span>
        {series.exampleTiming && <span className={styles.example}>{copy.markers.exampleTiming}</span>}
        <RuleIdTag id={series.id} />
        <VerificationBadge verification={series.verification} compact />
      </header>
      <ol className={styles.steps}>
        {enrollment.texts.map((text, i) => {
          const isNext = i === nextIndex;
          const checkFailed = i === failedIndex;
          const checkRan = text.state === 'sent' || checkFailed;
          const stateLabel = isNext ? copy.lane.states.next : copy.lane.states[text.state];
          return (
            <li key={text.id} className={styles.group}>
              <p className={styles.wait}>
                <Hourglass size={11} aria-hidden="true" />
                {fill(copy.lane.wait, { days: formatDays(series.texts[i].waitDays, config) })}
              </p>
              <p className={checkFailed ? styles.checkFailed : checkRan ? styles.checkPassed : styles.check}>
                {checkFailed ? <X size={12} aria-hidden="true" /> : checkRan ? <Check size={12} aria-hidden="true" /> : <span className={styles.checkDot} aria-hidden="true" />}
                {copy.lane.check}
                {checkFailed && text.skipReason && (
                  <span className={styles.reason}>{t(config.checkpoint.skipReasons[text.skipReason])}</span>
                )}
              </p>
              <p className={`${styles.text} ${styles[text.state]} ${isNext ? styles.next : ''}`}>
                <TextStateIcon state={text.state} />
                <span className={styles.textName}>{fill(copy.lane.text, { n: i + 1 })}</span>
                <span className={styles.stateLabel}>{stateLabel}</span>
                <span className={styles.day}>{fill(copy.board.day, { day: text.dueOn })}</span>
              </p>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

function TextStateIcon({ state }: { state: Enrollment['texts'][number]['state'] }) {
  switch (state) {
    case 'sent':
      return <Check size={12} aria-hidden="true" />;
    case 'upcoming':
      return <Clock size={12} aria-hidden="true" />;
    case 'skipped':
      return <Ban size={12} aria-hidden="true" />;
    case 'stopped_by_staff':
      return <Hand size={12} aria-hidden="true" />;
  }
}
