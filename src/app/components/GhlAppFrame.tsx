import type { ReactNode, RefObject } from 'react';
import {
  Bell,
  Bot,
  Calendar,
  ChevronsUpDown,
  CircleHelp,
  Contact,
  LayoutGrid,
  Megaphone,
  MessageCircle,
  Network,
  Phone,
  Receipt,
  Search,
  Send,
  Settings,
  Sparkles,
  UserRound,
  WandSparkles,
  Zap,
  type LucideIcon,
} from 'lucide-react';
import logoUrl from '../assets/symplast-logomark.svg';
import { useGuideContext } from '../GuideContext.tsx';
import styles from './GhlAppFrame.module.css';

const NAV_ICONS: Record<string, LucideIcon> = {
  ask_ai: Sparkles,
  dashboard: LayoutGrid,
  conversations: MessageCircle,
  calendars: Calendar,
  contacts: Contact,
  opportunities: Network,
  payments: Receipt,
  ai_studio: WandSparkles,
  ai_agents: Bot,
  marketing: Send,
  settings: Settings,
};

const TOP_ICONS: { icon: LucideIcon; tone: string }[] = [
  { icon: Phone, tone: 'call' },
  { icon: Sparkles, tone: 'ai' },
  { icon: Megaphone, tone: 'campaign' },
  { icon: Bell, tone: 'alerts' },
  { icon: CircleHelp, tone: 'help' },
];

type GhlAppFrameProps = {
  /** false: the whole GHL app (sidebar, top bar). true: pushed in to just the pipeline. */
  focused: boolean;
  /** The pipeline area. Overlays inside it position against this element. */
  contentRef?: RefObject<HTMLElement | null>;
  /** The browser's own toolbar above the app (e.g. Chrome asking for the microphone). */
  browserBar?: ReactNode;
  /** Pops out over the top right of the app, under the top bar's icons (e.g. the dialer). Seen in the full view. */
  popover?: ReactNode;
  /** Push in further, scaling the pipeline about one point of it (in content coordinates). */
  zoomTo?: { x: number; y: number; scale: number } | null;
  children: ReactNode;
};

/**
 * The GHL app around the pipeline, as in reference/: Symplast-branded sidebar and the Opportunities top bar.
 * Decorative chrome; going from full to focused is one push-in camera move.
 */
export function GhlAppFrame({ focused, contentRef, browserBar, popover, zoomTo, children }: GhlAppFrameProps) {
  const { config } = useGuideContext();
  const { ghl } = config.copy;

  return (
    <div className={`${styles.stage} ${focused ? styles.focused : styles.full}`}>
      {browserBar}
      <div className={styles.app}>
        <aside className={styles.sidebar} aria-hidden="true">
          <div className={styles.sidebarInner}>
            <img className={styles.logo} src={logoUrl} alt="" width={72} height={72} />
            <div className={styles.account}>
              <span className={styles.accountAvatar}>
                <UserRound size={14} />
              </span>
              <span className={styles.accountText}>
                <strong>{ghl.accountName}</strong>
                <span>{ghl.accountLocation}</span>
              </span>
              <ChevronsUpDown size={14} />
            </div>
            <div className={styles.searchRow}>
              <span className={styles.search}>
                <Search size={13} />
                {ghl.searchShort}
                <kbd>⌘K</kbd>
              </span>
              <span className={styles.bolt}>
                <Zap size={13} />
              </span>
            </div>
            <nav className={styles.nav}>
              {ghl.nav.map((item) => {
                const Icon = NAV_ICONS[item.id] ?? LayoutGrid;
                return (
                  <span key={item.id} className={item.id === ghl.activeNav ? styles.navActive : styles.navItem}>
                    <Icon size={16} />
                    {item.label}
                    {item.badge && <span className={styles.beta}>{ghl.beta}</span>}
                  </span>
                );
              })}
            </nav>
          </div>
        </aside>

        <div className={styles.main}>
          <header className={styles.topbar} aria-hidden="true">
            <div className={styles.topbarInner}>
              <span className={styles.appTitle}>{ghl.appTitle}</span>
              <span className={styles.appTabs}>
                {ghl.appTabs.map((tab, i) => (
                  <span key={tab} className={i === 0 ? styles.appTabActive : styles.appTab}>
                    {tab}
                  </span>
                ))}
              </span>
              <span className={styles.topIcons}>
                {TOP_ICONS.map(({ icon: Icon, tone }) => (
                  <span key={tone} className={styles.topIcon} style={{ background: `var(--ghl-top-${tone})` }}>
                    <Icon size={15} />
                  </span>
                ))}
                <span className={styles.topIcon} style={{ background: 'var(--ghl-top-avatar)' }}>
                  <UserRound size={15} />
                </span>
              </span>
            </div>
          </header>
          <section
            ref={contentRef}
            className={styles.content}
            style={zoomTo ? { transform: `scale(${zoomTo.scale})`, transformOrigin: `${zoomTo.x}px ${zoomTo.y}px` } : undefined}
          >
            {children}
          </section>
          {popover && <div className={styles.popover}>{popover}</div>}
        </div>
      </div>
    </div>
  );
}
