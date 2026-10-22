import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Check, ClipboardPlus, EllipsisVertical, FileText, Receipt, SquarePen, type LucideIcon } from 'lucide-react';
import { useGuideContext } from '../GuideContext.tsx';
import { AssistPointer } from './AssistPointer.tsx';
import { PracticeAppWindow } from './PracticeAppWindow.tsx';
import styles from './EhrCheckout.module.css';

const ACTION_ICONS: LucideIcon[] = [ClipboardPlus, Receipt, FileText, SquarePen, EllipsisVertical];

type EhrCheckoutProps = {
  /** Checked out and closed: the lesson fires the checkout event. */
  onComplete: () => void;
  /** Closed without checking out. */
  onCancel: () => void;
  /** "Skip the demo": fire the event without the walkthrough. */
  onSkip: () => void;
};

/**
 * Replica of Symplast's appointment window, where staff check a patient out, open over the whole Symplast Practice App.
 * The viewer does the clicks; an assistive-touch pointer shows where to tap next:
 * the status pill, then Checked Out, then Close.
 */
export function EhrCheckout({ onComplete, onCancel, onSkip }: EhrCheckoutProps) {
  const { config, cast, fill } = useGuideContext();
  const { ehr, ghl } = config.copy;
  const [status, setStatus] = useState(ehr.startStatus);
  const [menuOpen, setMenuOpen] = useState(false);
  const [wrongPick, setWrongPick] = useState(false);
  const [closing, setClosing] = useState(false);
  const windowRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLButtonElement>(null);
  const targetItemRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const checkedOut = status === ehr.targetStatus;
  const target = checkedOut ? closeRef : menuOpen ? targetItemRef : pillRef;
  const hint = checkedOut ? 'close' : menuOpen ? (wrongPick ? 'wrong' : 'pick') : 'status';
  const current = ehr.statuses.find((s) => s.id === status)!;
  const initials = cast.name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  useEffect(() => {
    target.current?.focus({ preventScroll: true });
  }, [target]);

  const choose = (id: string) => {
    if (id !== ehr.targetStatus) return setWrongPick(true);
    setStatus(id);
    setMenuOpen(false);
  };

  const close = () => {
    if (!checkedOut) return onCancel();
    setClosing(true);
  };

  return (
    <PracticeAppWindow closing={closing} onClosed={onComplete}>
      <div ref={windowRef} className={styles.window} role="dialog" aria-modal="true" aria-label={ehr.dialogLabel}>
        <header className={styles.titlebar}>
          <button ref={closeRef} type="button" className={styles.titleButton} onClick={close}>
            {ehr.close}
          </button>
          <span className={styles.title}>{ehr.title}</span>
          <span className={styles.titleButton} aria-hidden="true">
            {ehr.park}
          </span>
        </header>

        <section className={styles.patient}>
          <span className={styles.avatar} aria-hidden="true">
            {initials}
          </span>
          <div className={styles.who}>
            <p className={styles.name}>{cast.name}</p>
            <p className={styles.phone}>{ehr.phone}</p>
            <p className={styles.type}>{ehr.appointmentType}</p>
          </div>
          <ul className={styles.actions} aria-hidden="true">
            {ehr.actions.map((label, i) => {
              const Icon = ACTION_ICONS[i] ?? EllipsisVertical;
              return (
                <li key={label}>
                  <span className={styles.actionIcon}>
                    <Icon size={20} />
                  </span>
                  {label}
                </li>
              );
            })}
          </ul>
        </section>

        <div className={styles.statusRow}>
          <span className={styles.ribbon} aria-hidden="true">
            {ehr.ribbon}
          </span>
          <button
            ref={pillRef}
            type="button"
            className={`${styles.statusPill} ${checkedOut ? styles.statusDone : ''}`}
            style={{ '--status': `var(--ehr-status-${status})` } as CSSProperties}
            onClick={() => {
              if (checkedOut) return;
              setMenuOpen(!menuOpen);
              setWrongPick(false);
            }}
            aria-haspopup="listbox"
            aria-expanded={menuOpen}
          >
            {current.label}
          </button>
          {menuOpen && (
            <ul className={styles.menu} role="listbox" aria-label={ehr.title}>
              {ehr.statuses.map((s) => (
                <li key={s.id}>
                  <button
                    ref={s.id === ehr.targetStatus ? targetItemRef : undefined}
                    type="button"
                    role="option"
                    aria-selected={s.id === status}
                    className={styles.menuItem}
                    onClick={() => choose(s.id)}
                  >
                    <span className={styles.dot} style={{ background: `var(--ehr-status-${s.id})` }} aria-hidden="true" />
                    {s.label}
                    {s.id === status && <Check size={16} className={styles.tick} aria-hidden="true" />}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <section className={styles.body} aria-hidden="true">
          <p className={styles.sectionLabel}>{ehr.details}</p>
          <p className={styles.detail}>
            <span className={styles.bullet} />
            {fill(ehr.when, { practice: ghl.accountName, ...config.copy.slot })}
          </p>
          <p className={styles.detail}>
            <span className={styles.bullet} />
            {fill(ehr.duration, config.copy.slot)}
          </p>
          <p className={styles.sectionLabel}>{ehr.attachments}</p>
          <span className={styles.skeleton} style={{ width: '46%' }} />
          <span className={styles.skeleton} style={{ width: '62%' }} />
          <span className={styles.skeleton} style={{ width: '38%' }} />
        </section>

        <footer className={styles.footer}>
          <button type="button" className={styles.skip} onClick={onSkip}>
            {ehr.skip}
          </button>
        </footer>

        <AssistPointer containerRef={windowRef} getTarget={() => target.current} targetKey={hint} hint={ehr.hints[hint]} />
      </div>
    </PracticeAppWindow>
  );
}
