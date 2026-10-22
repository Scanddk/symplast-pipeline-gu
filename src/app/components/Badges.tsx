import { CircleAlert, CircleCheck, PencilLine, Shuffle } from 'lucide-react';
import { isNc } from '../../../engine/index.ts';
import type { Verification } from '../../../schema/common.ts';
import { useGuideContext } from '../GuideContext.tsx';
import styles from './Badges.module.css';

/** V / NC badge with open-question refs. Internal view only. `compact` shows V / NC for narrow columns. */
export function VerificationBadge({ verification, compact = false }: { verification: Verification; compact?: boolean }) {
  const { view, config } = useGuideContext();
  if (view !== 'internal') return null;
  const nc = isNc(verification);
  const label = nc ? config.copy.markers.needsConfirmation : config.copy.markers.verified;
  return (
    <span className={`${nc ? styles.nc : styles.v} ${compact ? styles.compact : ''}`} title={compact ? label : undefined}>
      {nc ? <CircleAlert size={12} aria-hidden="true" /> : <CircleCheck size={12} aria-hidden="true" />}
      {compact ? (nc ? 'NC' : 'V') : label}
      {verification.questions.length > 0 && <span className={styles.refs}>{verification.questions.join(' ')}</span>}
    </span>
  );
}

/** Lists the unverified parts of an otherwise verified rule. Internal view only. */
export function NcParts({ verification }: { verification: Verification }) {
  const { view } = useGuideContext();
  if (view !== 'internal' || verification.ncParts.length === 0) return null;
  return (
    <ul className={styles.ncParts}>
      {verification.ncParts.map((part) => (
        <li key={part}>{part}</li>
      ))}
    </ul>
  );
}

export function RuleIdTag({ id }: { id: string }) {
  const { view } = useGuideContext();
  if (view !== 'internal') return null;
  return <code className={styles.ruleId}>{id}</code>;
}

/** Shown in both views until the content owner approves the copy. */
export function DraftBadge({ draft }: { draft: boolean }) {
  const { config } = useGuideContext();
  if (!draft) return null;
  return (
    <span className={styles.draft}>
      <PencilLine size={12} aria-hidden="true" />
      {config.copy.markers.draft}
    </span>
  );
}

export function MayDifferMarker() {
  const { config } = useGuideContext();
  return (
    <span className={styles.mayDiffer}>
      <Shuffle size={12} aria-hidden="true" />
      {config.copy.markers.mayDiffer}
    </span>
  );
}
