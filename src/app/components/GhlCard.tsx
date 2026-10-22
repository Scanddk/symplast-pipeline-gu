import type { ReactNode } from 'react';
import { CalendarPlus, FileText, MessageCircleMore, PhoneCall, SquareCheck, Tag, UserX } from 'lucide-react';
import styles from './GhlCard.module.css';

type GhlCardProps = {
  name: ReactNode;
  /** Makes the phone icon a real button (calling from the card). */
  onCall?: () => void;
  callLabel?: string;
  /** Top-right slot: the unassigned-owner avatar by default. */
  corner?: ReactNode;
  tags?: ReactNode;
  rows: { label: ReactNode; value: ReactNode }[];
  footer?: ReactNode;
  variant?: 'placeholder' | 'demo';
};

/** Opportunity card laid out like GHL's: name, owner avatar, tags, label/value rows, action icons. */
export function GhlCard({ name, corner, tags, rows, footer, variant = 'placeholder', onCall, callLabel }: GhlCardProps) {
  return (
    <div className={variant === 'demo' ? styles.demo : styles.placeholder}>
      <div className={styles.top}>
        <div className={styles.name}>{name}</div>
        {corner ?? <UnassignedAvatar />}
      </div>
      {tags && <div className={styles.tags}>{tags}</div>}
      <dl className={styles.rows}>
        {rows.map((row, i) => (
          <div key={i} className={styles.row}>
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
      <ActionIcons onCall={onCall} callLabel={callLabel} />
      {footer}
    </div>
  );
}

function UnassignedAvatar() {
  return (
    <span className={styles.avatar} aria-hidden="true">
      <UserX size={12} strokeWidth={1.75} />
    </span>
  );
}

/** The CRM's quick-action row: call, message, tags, notes, tasks, appointment. Only the call can be live. */
function ActionIcons({ onCall, callLabel }: { onCall?: () => void; callLabel?: string }) {
  return (
    <div className={styles.icons}>
      {onCall ? (
        <button
          type="button"
          className={styles.iconButton}
          onClick={(e) => {
            e.stopPropagation();
            onCall();
          }}
          aria-label={callLabel}
          data-card-call
        >
          <PhoneCall size={13} strokeWidth={1.75} />
        </button>
      ) : (
        <PhoneCall size={13} strokeWidth={1.75} aria-hidden="true" />
      )}
      <MessageCircleMore size={13} strokeWidth={1.75} aria-hidden="true" />
      <Tag size={13} strokeWidth={1.75} aria-hidden="true" />
      <FileText size={13} strokeWidth={1.75} aria-hidden="true" />
      <SquareCheck size={13} strokeWidth={1.75} aria-hidden="true" />
      <CalendarPlus size={13} strokeWidth={1.75} aria-hidden="true" />
    </div>
  );
}

/** Grey bar standing in for text on placeholder cards. */
export function Bar({ width }: { width: string }) {
  return <span className={styles.bar} style={{ width }} />;
}

/** GHL's opportunity status pill ("open"). The texts lesson points its "still open?" check at it. */
export function GhlStatus({ children }: { children: ReactNode }) {
  return (
    <span className={styles.status} data-status-pill>
      {children}
    </span>
  );
}
