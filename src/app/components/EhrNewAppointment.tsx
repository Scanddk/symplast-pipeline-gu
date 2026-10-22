import { useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useGuideContext } from '../GuideContext.tsx';
import { AssistPointer } from './AssistPointer.tsx';
import { PracticeAppWindow } from './PracticeAppWindow.tsx';
import styles from './EhrNewAppointment.module.css';


/**
 * Replica of Symplast's New Appointment sheet, from the content owner's screenshot, open over the
 * whole Symplast Practice App and prefilled for the fictional patient: the consultation, or later the procedure.
 * The guide points at Save; saving books it.
 */
export function EhrNewAppointment(props: {
  kind: 'consult' | 'procedure';
  /** The appointment's day. */
  day: number;
  onComplete: () => void;
  onCancel: () => void;
  onSkip: () => void;
}) {
  const { kind, day, onComplete, onCancel, onSkip } = props;
  const { config, fill } = useGuideContext();
  const { ehrNew: e, ghl } = config.copy;
  const [closing, setClosing] = useState(false);
  const sheetRef = useRef<HTMLDivElement>(null);
  const saveRef = useRef<HTMLButtonElement>(null);
  // The consultation is the slot your team offered in the texts; the procedure has its own times.
  const booking = kind === 'consult' ? { ...e.kinds.consult, ...config.copy.slot } : e.kinds.procedure;
  const vars = {
    practice: ghl.accountName,
    day,
    block: booking.block,
    service: fill(booking.service, { interest: config.copy.webForm.interest }),
    resource: booking.resource,
    start: booking.start,
    end: booking.end,
    duration: booking.duration,
  };

  useEffect(() => {
    saveRef.current?.focus({ preventScroll: true });
    const onKey = (ev: KeyboardEvent) => ev.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const save = () => {
    if (closing) return;
    setClosing(true);
  };

  return (
    <PracticeAppWindow closing={closing} onClosed={onComplete}>
      <div ref={sheetRef} className={styles.sheet} role="dialog" aria-modal="true" aria-label={e.dialogLabel}>
        <header className={styles.bar}>
          <button type="button" className={styles.cancel} onClick={onCancel}>
            {e.cancel}
          </button>
          <strong className={styles.title}>{e.title}</strong>
          <span className={styles.actions}>
            <span className={styles.park} aria-hidden="true">
              {e.saveAndPark}
            </span>
            <button ref={saveRef} type="button" className={styles.save} onClick={save}>
              {e.save}
            </button>
          </span>
        </header>
        <div className={styles.sub} aria-hidden="true">
          <span>{e.multiple}</span>
          <span className={styles.addAnother}>{e.saveAndAdd}</span>
        </div>

        <div className={styles.scroll} aria-hidden="true">
          <p className={styles.block}>
            {fill(e.block, vars)}
            <ChevronDown size={16} />
          </p>
          {e.groups.map((group, i) => (
            <div key={i} className={styles.group}>
              {group.map((row) => (
                <p key={row.label} className={styles.row}>
                  <span>{row.label}</span>
                  <span className={styles.value}>
                    {fill(row.value, vars)}
                    <ChevronRight size={16} />
                  </span>
                </p>
              ))}
            </div>
          ))}
          <div className={styles.group}>
            {e.toggles.map((toggle) => (
              <p key={toggle.label} className={styles.row}>
                <span>{toggle.label}</span>
                <span className={`${styles.toggle} ${toggle.on ? styles.on : ''}`} />
              </p>
            ))}
          </div>
          <div className={styles.group}>
            <p className={styles.row}>
              <span>{e.billing.label}</span>
              <span className={styles.value}>
                {e.billing.value}
                <ChevronRight size={16} />
              </span>
            </p>
          </div>
          <p className={styles.skipRow}>
            <button type="button" className={styles.skip} onClick={onSkip}>
              {e.skip}
            </button>
          </p>
        </div>

        {!closing && <AssistPointer containerRef={sheetRef} getTarget={() => saveRef.current} targetKey="save" hint={booking.hint} />}
      </div>
    </PracticeAppWindow>
  );
}
