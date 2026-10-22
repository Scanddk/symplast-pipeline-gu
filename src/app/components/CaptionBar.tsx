import { CircleHelp } from 'lucide-react';
import type { Step } from '../../../engine/index.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { RuleIdTag } from './Badges.tsx';
import styles from './CaptionBar.module.css';

type CaptionBarProps = {
  step: Step | null;
  onWhy: (stageId: string, eventId: string | null) => void;
  /** Shown before the first step. Defaults to the board's start prompt. */
  fallback?: string;
};

/** One or two sentences per step, announced politely. "Why?" opens the stage that explains it. */
export function CaptionBar({ step, onWhy, fallback }: CaptionBarProps) {
  const { config, view } = useGuideContext();
  const why = step?.cues.find((c) => c.type === 'why');
  const caption = step
    ? view === 'internal'
      ? step.captionInternal
      : step.captionClient
    : (fallback ?? config.copy.caption.start);

  return (
    <section className={styles.bar} aria-label={config.copy.caption.regionLabel}>
      <p className={styles.caption} aria-live="polite" aria-atomic="true">
        {caption}
      </p>
      {why?.type === 'why' && (
        <button type="button" className={styles.why} onClick={() => onWhy(why.stage, why.eventId)} aria-haspopup="dialog">
          <CircleHelp size={16} aria-hidden="true" />
          {config.copy.caption.why}
        </button>
      )}
      {view === 'internal' && step && (
        <p className={styles.rules}>
          {step.ruleIds.map((id) => (
            <RuleIdTag key={id} id={id} />
          ))}
        </p>
      )}
    </section>
  );
}
