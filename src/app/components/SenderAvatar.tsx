import { CirclePlay, MessageSquareMore, UserRound } from 'lucide-react';
import styles from './SenderAvatar.module.css';

/**
 * Who sent a text, as the CRM's conversation view shows it: the patient's initials, a team member's avatar, or the
 * play-circle avatar for texts sent automatically. A small blue badge marks the channel (SMS). Decorative: the
 * sender is also named in text beside the message.
 */
export function SenderAvatar(props: { kind: 'patient' | 'staff' | 'automation'; initials?: string; title?: string; className?: string }) {
  const { kind, initials, title, className = '' } = props;
  return (
    <span className={`${styles.avatar} ${styles[kind]} ${className}`} title={title} aria-hidden="true">
      {kind === 'patient' ? initials : kind === 'automation' ? <CirclePlay size={19} strokeWidth={2} /> : <UserRound size={18} />}
      <span className={styles.badge}>
        <MessageSquareMore size={10} />
      </span>
    </span>
  );
}
