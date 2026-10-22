import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import {
  ArrowUpRight,
  FilePlus,
  FileText,
  GripVertical,
  LayoutGrid,
  MessageCircle,
  MicOff,
  Minimize2,
  Pause,
  PhoneCall,
  PhoneForwarded,
  PhoneOff,
  Pin,
  SquareUser,
  type LucideIcon,
} from 'lucide-react';
import { useGuideContext } from '../GuideContext.tsx';
import { demoPatient, toE164 as e164 } from '../demoPatient.ts';
import { AssistPointer } from './AssistPointer.tsx';
import styles from './CrmCall.module.css';

/** "Dialing" after the microphone is allowed, before the call connects. */
const DIALING_MS = 1400;
/** How long "Call ended" shows, then the dialer folds away. */
const ENDED_MS = 900;
const CLOSE_MS = 250;

/** Space kept between the dialer and the caption dock below it. */
const DOCK_GAP = 12;


/**
 * The CRM's pop-out dialer, from the content owner's screenshot: an outgoing call from your practice's number
 * to the patient, with the call controls. It shows "Dialing" until `connected` (the microphone is allowed) and a
 * moment after; then the call timer runs. Only End Call works. Whether the patient picks up doesn't change
 * what the card does, so the replica doesn't say.
 */
export function CrmCall({ connected, onComplete }: { connected: boolean; onComplete: () => void }) {
  const { config, cast, fill } = useGuideContext();
  const { call, webForm } = config.copy;
  const patient = demoPatient(cast, config.copy);
  const [seconds, setSeconds] = useState(0);
  const [live, setLive] = useState(false);
  const [ended, setEnded] = useState(false);
  const [closing, setClosing] = useState(false);
  const dialerRef = useRef<HTMLDivElement>(null);
  const endRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<number[]>([]);
  // On short screens the dialer shrinks to stay above the caption dock, so End Call is always in view.
  const [fit, setFit] = useState(1);
  const fitRef = useRef(1);
  fitRef.current = fit;

  useLayoutEffect(() => {
    const measure = () => {
      const dialer = dialerRef.current;
      if (!dialer) return;
      const r = dialer.getBoundingClientRect();
      const dockTop = document.querySelector('[data-dock]')?.getBoundingClientRect().top ?? window.innerHeight;
      const natural = r.height / fitRef.current;
      setFit(Math.min(1, Math.max(0.6, (dockTop - DOCK_GAP - r.top) / natural)));
    };
    measure();
    // The camera is still pulling back when the dialer pops out; measure again once things settle.
    document.addEventListener('transitionend', measure);
    document.addEventListener('animationend', measure, true);
    window.addEventListener('resize', measure);
    return () => {
      document.removeEventListener('transitionend', measure);
      document.removeEventListener('animationend', measure, true);
      window.removeEventListener('resize', measure);
    };
  }, []);

  useEffect(() => {
    if (!connected) return;
    const timer = window.setTimeout(() => setLive(true), DIALING_MS);
    return () => window.clearTimeout(timer);
  }, [connected]);

  useEffect(() => {
    if (!live || ended) return;
    endRef.current?.focus({ preventScroll: true });
    const timer = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => window.clearInterval(timer);
  }, [live, ended]);

  useEffect(() => () => timers.current.forEach((t) => window.clearTimeout(t)), []);

  const end = () => {
    if (ended) return;
    setEnded(true);
    timers.current.push(window.setTimeout(() => setClosing(true), ENDED_MS));
    timers.current.push(window.setTimeout(onComplete, ENDED_MS + CLOSE_MS));
  };

  const clock = [Math.floor(seconds / 3600), Math.floor(seconds / 60) % 60, seconds % 60].map((n) => String(n).padStart(2, '0')).join(':');
  const a = call.actions;
  const rows: { icon: LucideIcon; label: string; off?: boolean }[][] = [
    [
      { icon: MessageCircle, label: a.message },
      { icon: FilePlus, label: a.notes },
      { icon: PhoneForwarded, label: a.blindTransfer, off: true },
      { icon: PhoneCall, label: a.warmTransfer, off: true },
    ],
    [
      { icon: Pause, label: a.hold },
      { icon: MicOff, label: a.mute },
      { icon: FileText, label: a.scripts },
      { icon: LayoutGrid, label: a.dial },
    ],
  ];

  return (
    <div className={styles.fit} style={fit < 1 ? { transform: `scale(${fit})` } : undefined}>
      <div
        ref={dialerRef}
        className={`${styles.dialer} ${closing ? styles.closing : ''}`}
        role="dialog"
        aria-label={fill(call.calling)}
      >
        <div className={styles.grab} aria-hidden="true">
          <GripVertical size={16} />
          <span className={styles.grabTools}>
            <span title={call.pin}>
              <Pin size={15} />
            </span>
            <span title={call.minimize}>
              <Minimize2 size={15} />
            </span>
          </span>
        </div>

        <header className={styles.head}>
          <p className={styles.direction} aria-live="polite">
            <span className={styles.outIcon} aria-hidden="true">
              <ArrowUpRight size={14} strokeWidth={3} />
            </span>
            {ended ? call.ended : call.outgoing}
          </p>
          <p className={styles.from}>
            {webForm.sitePhone} • {e164(webForm.sitePhone)}
          </p>
        </header>

        <div className={styles.person}>
          <span className={styles.avatar} aria-hidden="true">
            {patient.initials}
          </span>
          <p className={styles.name}>
            <span className={styles.contactIcon} aria-hidden="true">
              <SquareUser size={18} />
            </span>
            {cast.name}
          </p>
          <p className={styles.number}>{e164(patient.phone)}</p>
          {live ? (
            <p className={styles.clock}>
              <span className={`${styles.rec} ${ended ? styles.recOff : ''}`} aria-hidden="true" />
              {clock}
            </p>
          ) : (
            <p className={styles.dialing} aria-live="polite">
              {call.dialing}
              <span className={styles.dots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
            </p>
          )}
        </div>

        {rows.map((row, i) => (
          <ul key={i} className={styles.actions} aria-hidden="true">
            {row.map(({ icon: Icon, label, off }) => (
              <li key={label} className={off ? styles.off : undefined}>
                <span className={styles.round}>
                  <Icon size={22} strokeWidth={1.75} />
                </span>
                {label}
              </li>
            ))}
          </ul>
        ))}

        <button ref={endRef} type="button" className={styles.end} onClick={end} disabled={!live || ended}>
          <PhoneOff size={20} aria-hidden="true" />
          {call.end}
        </button>

        {live && !ended && <AssistPointer containerRef={dialerRef} getTarget={() => endRef.current} targetKey="end" hint={call.hints.end} />}
      </div>
    </div>
  );
}
