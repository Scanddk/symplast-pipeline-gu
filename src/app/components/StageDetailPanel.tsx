import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import type { Stage } from '../../../schema/rules.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { StageDetails } from './StageDetails.tsx';
import styles from './StageDetailPanel.module.css';

/** Side drawer with the four stage slots. Esc or the backdrop closes it; focus stays inside while open. */
export function StageDetailPanel(props: { stage: Stage; highlightEventId: string | null; onClose: () => void }) {
  const { stage, highlightEventId, onClose } = props;
  const { config } = useGuideContext();
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => opener?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key !== 'Tab' || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>('button, [href], [tabindex]:not([tabindex="-1"])');
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.backdrop} onClick={onClose}>
      <div
        ref={panelRef}
        className={styles.panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="stage-panel-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className={styles.header}>
          <h2 id="stage-panel-title" className={styles.title}>
            <span className={styles.dot} style={{ background: `var(--stage-dot-${stage.dot})` }} aria-hidden="true" />
            {stage.seriesId && '💬 '}
            {stage.name}
          </h2>
          <button ref={closeRef} type="button" className={styles.close} onClick={onClose} aria-label={config.copy.panel.close}>
            <X size={18} aria-hidden="true" />
          </button>
        </header>
        <StageDetails stage={stage} highlightEventId={highlightEventId} />
      </div>
    </div>
  );
}
