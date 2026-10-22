import { useGuideContext } from '../GuideContext.tsx';
import { StageDetails } from './StageDetails.tsx';
import styles from './StageList.module.css';

/** Every stage's four slots as a list: the Stage reference lesson, and the board lesson below 1024px. */
export function StageList({ showNarrowNote = false }: { showNarrowNote?: boolean }) {
  const { config } = useGuideContext();
  return (
    <div className={styles.list}>
      {showNarrowNote && <p className={styles.note}>{config.copy.board.narrowNote}</p>}
      {config.stages.map((stage) => (
        <article key={stage.id} className={styles.stage} aria-labelledby={`stage-${stage.id}`}>
          <h2 id={`stage-${stage.id}`} className={styles.name}>
            <span className={styles.dot} style={{ background: `var(--stage-dot-${stage.dot})` }} aria-hidden="true" />
            {stage.seriesId && '💬 '}
            {stage.name}
          </h2>
          <StageDetails stage={stage} highlightEventId={null} />
        </article>
      ))}
    </div>
  );
}
