import { useEffect, useRef, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  ChevronDown,
  ChevronRight,
  CalendarDays,
  CalendarHeart,
  House,
  List,
  LogOut,
  MessagesSquare,
  Plus,
  Printer,
  Search,
  SquarePen,
  Star,
  UserRound,
  type LucideIcon,
} from 'lucide-react';
import { useGuideContext } from '../GuideContext.tsx';
import styles from './PracticeAppWindow.module.css';

const QUICK_ICONS: LucideIcon[] = [House, MessagesSquare, Search];

/** Closing: the sheet drops away, then the app shrinks back down toward the dock (matches the CSS). */
const CLOSE_MS = 850;
/** Then a beat on Symplast CRM before the card moves, so the viewer is looking at the pipeline when it does. */
const BACK_TO_CRM_MS = 450;
const TOP_ICONS: LucideIcon[] = [CalendarHeart, Printer, CalendarDays, List, Search, Plus];

type Block = 'consult' | 'lunch' | 'spa' | 'op';

/**
 * A made-up week on the calendar: which block runs when on each day (hours on a 24h clock),
 * with blank appointments in some. Layout only; the labels come from copy.
 */
const WEEK: { day: number; from: number; to: number; block: Block; appointments?: number[] }[] = [
  { day: 0, from: 9, to: 12, block: 'consult', appointments: [9.5, 10.5] },
  { day: 0, from: 12.5, to: 13.5, block: 'lunch' },
  { day: 0, from: 13.5, to: 17, block: 'spa', appointments: [14.5] },
  { day: 1, from: 9, to: 12.5, block: 'op', appointments: [10] },
  { day: 1, from: 12.5, to: 13.5, block: 'lunch' },
  { day: 1, from: 13.5, to: 17, block: 'consult', appointments: [14, 15.5] },
  { day: 2, from: 9, to: 12.5, block: 'consult', appointments: [11] },
  { day: 2, from: 12.5, to: 13.5, block: 'lunch' },
  { day: 2, from: 13.5, to: 17, block: 'spa', appointments: [13.5, 15] },
  { day: 3, from: 9, to: 12.5, block: 'consult' },
  { day: 3, from: 12.5, to: 13.5, block: 'lunch' },
  { day: 3, from: 13.5, to: 17, block: 'spa', appointments: [14.5] },
  { day: 4, from: 9, to: 12.5, block: 'consult', appointments: [9] },
  { day: 4, from: 12.5, to: 13.5, block: 'lunch' },
  { day: 4, from: 13.5, to: 17, block: 'op', appointments: [16] },
];

/**
 * The Symplast Practice App open in its own window: sidebar, week calendar, and on top of it (dimmed) the
 * screen the tour is about (`children`: the New Appointment sheet or the appointment window).
 * Shows staff that booking and checkout happen in the Practice App, not in Symplast CRM. The app itself is decorative.
 */
export function PracticeAppWindow(props: {
  closing: boolean;
  /** Called once the app has closed and the pipeline has been on screen for a beat. */
  onClosed?: () => void;
  children: ReactNode;
}) {
  const { closing, onClosed, children } = props;
  const { config } = useGuideContext();
  const reducedMotion = useReducedMotion() ?? false;
  const closed = useRef(onClosed);
  closed.current = onClosed;

  useEffect(() => {
    if (!closing) return;
    const timer = window.setTimeout(() => closed.current?.(), (reducedMotion ? 0 : CLOSE_MS) + BACK_TO_CRM_MS);
    return () => window.clearTimeout(timer);
  }, [closing, reducedMotion]);
  const { practiceApp: p } = config.copy;
  const first = Number(p.hours[0]);
  const span = Number(p.hours[p.hours.length - 1]) - first;
  const at = (hour: number) => `${((hour - first) / span) * 100}%`;

  return (
    <div className={`${styles.backdrop} ${closing ? styles.closing : ''}`}>
      <div className={styles.window}>
        <div className={styles.app} aria-hidden="true">
          <aside className={styles.sidebar}>
            <span className={styles.lights}>
              <i />
              <i />
              <i />
            </span>
            <div className={styles.account}>
              <span className={styles.logo}>{p.logo}</span>
              <span className={styles.accountText}>
                <small>{p.account}</small>
                <strong>
                  {p.user}
                  <SquarePen size={13} />
                </strong>
              </span>
            </div>
            <nav className={styles.quick}>
              {p.quick.map((label, i) => {
                const Icon = QUICK_ICONS[i] ?? House;
                return (
                  <span key={label}>
                    <Icon size={15} />
                    {label}
                  </span>
                );
              })}
            </nav>
            <nav className={styles.menu}>
              {p.menu.map((item) => (
                <span key={item.label}>
                  <Star size={15} className={item.starred ? styles.starred : styles.star} />
                  {item.label}
                  {item.open ? <ChevronDown size={15} /> : <ChevronRight size={15} />}
                </span>
              ))}
            </nav>
            <span className={styles.signOut}>
              <LogOut size={15} />
              {p.signOut}
            </span>
          </aside>

          <div className={styles.main}>
            <header className={styles.top}>
              <span className={styles.views}>
                {p.views.map((view, i) => (
                  <span key={view} className={i === 1 ? styles.viewActive : undefined}>
                    {view}
                  </span>
                ))}
              </span>
              <span className={styles.topIcons}>
                {TOP_ICONS.map((Icon, i) => (
                  <Icon key={i} size={18} />
                ))}
              </span>
            </header>
            <div className={styles.staff}>
              {[0, 1, 2, 3].map((i) => (
                <span key={i} className={styles.staffAvatar}>
                  <UserRound size={14} />
                </span>
              ))}
            </div>
            <div className={styles.calendar} style={{ gridTemplateColumns: `44px repeat(${p.days.length}, 1fr)` }}>
              <span />
              {p.days.map((d) => (
                <span key={d.date} className={styles.dayHead}>
                  <strong>{d.date}</strong>
                  {d.weekday}
                </span>
              ))}
              <div className={styles.hours}>
                {p.hours.slice(0, -1).map((hour, i) => (
                  <span key={hour} style={{ top: at(first + i) }}>
                    {hour}
                  </span>
                ))}
              </div>
              {p.days.map((d, day) => (
                <div key={d.date} className={styles.day}>
                  {WEEK.filter((b) => b.day === day).map((b) => (
                    <div
                      key={b.from}
                      className={`${styles.block} ${styles[b.block]}`}
                      style={{ top: at(b.from), height: `calc(${at(first + b.to - b.from)} - 2px)` }}
                    >
                      <span className={styles.blockLabel}>{p.blocks[b.block]}</span>
                      {b.appointments?.map((start) => (
                        <span
                          key={start}
                          className={styles.appointment}
                          style={{ top: `${((start - b.from) / (b.to - b.from)) * 100}%`, height: `${(0.75 / (b.to - b.from)) * 100}%` }}
                        >
                          <i />
                          <i />
                        </span>
                      ))}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className={styles.scrim} />
        <div className={styles.layer}>{children}</div>
      </div>
    </div>
  );
}
