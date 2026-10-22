import { Building2, Clock, Monitor, Smartphone, UserRound, type LucideIcon } from 'lucide-react';
import type { Actor } from '../../../schema/common.ts';
import { useGuideContext } from '../GuideContext.tsx';
import styles from './ActorBadge.module.css';

const ICONS: Record<Actor, LucideIcon> = {
  staff_symplast: Building2,
  staff_ghl: Monitor,
  staff_other: Smartphone,
  patient: UserRound,
  time: Clock,
};

export function ActorIcon({ actor, size = 16 }: { actor: Actor; size?: number }) {
  const Icon = ICONS[actor];
  return <Icon size={size} aria-hidden="true" strokeWidth={2} />;
}

/** Icon + text label. Color is a secondary cue only. */
export function ActorBadge({ actor }: { actor: Actor }) {
  const { config } = useGuideContext();
  return (
    <span className={styles.badge} style={{ '--actor': `var(--actor-${actor})` } as React.CSSProperties}>
      <ActorIcon actor={actor} size={14} />
      {config.copy.actors[actor]}
    </span>
  );
}
