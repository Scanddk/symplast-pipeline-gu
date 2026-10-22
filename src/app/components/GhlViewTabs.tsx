import { ArrowUpDown, ChevronDown, Download, EllipsisVertical, Filter, LayoutGrid, LayoutList, List, Plus, Search } from 'lucide-react';
import { useGuideContext } from '../GuideContext.tsx';
import styles from './GhlViewTabs.module.css';

/**
 * Replica of GHL's opportunities toolbar: pipeline picker and count, view toggle, Import, Add opportunity,
 * the "Open opportunities" tab, filter and sort pills, and search. Decorative only.
 * The guide's day counter sits at the end of the tab row.
 */
export function GhlViewTabs({ day }: { day: number | null }) {
  const { config, fill } = useGuideContext();
  const { ghl } = config.copy;
  const total = config.stages.reduce((sum, s) => sum + (config.exampleBoard[s.id]?.count ?? 0), 0);

  return (
    <div className={styles.toolbar}>
      <div className={styles.ghl}>
        <div className={styles.topRow} aria-hidden="true">
          <span className={styles.pipeline}>
            {ghl.pipelineName}
            <ChevronDown size={14} />
          </span>
          <span className={styles.count}>{fill(ghl.opportunities.other, { count: total })}</span>
          <span className={styles.actions}>
            <span className={styles.toggle}>
              <span className={styles.toggleOn}>
                <LayoutGrid size={14} />
              </span>
              <span>
                <LayoutList size={14} />
              </span>
            </span>
            <span className={styles.import}>
              <Download size={14} />
              {ghl.import}
            </span>
            <span className={styles.add}>
              <Plus size={14} />
              {ghl.addOpportunity}
            </span>
            <EllipsisVertical size={16} className={styles.more} />
          </span>
        </div>
        <div className={styles.tabs}>
          <span className={styles.tab} aria-hidden="true">
            <List size={14} />
            {ghl.openTab}
          </span>
          {day !== null && <span className={styles.day}>{fill(config.copy.board.day, { day })}</span>}
        </div>
        <div className={styles.filters} aria-hidden="true">
          <span className={styles.pill}>
            <Filter size={13} />
            {ghl.filters}
          </span>
          <span className={styles.pill}>
            <ArrowUpDown size={13} />
            {ghl.sort}
          </span>
          <span className={styles.search}>
            <Search size={14} />
            {ghl.search}
          </span>
        </div>
      </div>
    </div>
  );
}
