import { useEffect, useRef, useState } from 'react';
import {
  Calendar,
  ChevronDown,
  Copy,
  EllipsisVertical,
  Filter,
  Info,
  ListFilter,
  Network,
  Plus,
  Search,
  Settings,
  SquareUser,
  Trash2,
  X,
} from 'lucide-react';
import type { EngineState } from '../../../engine/index.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { demoPatient, formNoteLines } from '../demoPatient.ts';
import { AssistPointer } from './AssistPointer.tsx';
import styles from './OpportunityModal.module.css';

/**
 * Replica of the CRM's opportunity modal (Edit "name"), from the content owner's screenshots: the Opportunity
 * details form (contact, opportunity, and Symplast fields), the Notes tab with the website form saved as a note,
 * and the record footer. The guide shows where Notes is; everything else is decorative.
 */
export function OpportunityModal({ engine, onComplete, onCancel }: { engine: EngineState; onComplete: () => void; onCancel: () => void }) {
  const { config, cast, fill } = useGuideContext();
  const { opportunityModal: m, ghl } = config.copy;
  const f = m.fields;
  const patient = demoPatient(cast, config.copy);
  const [tab, setTab] = useState<'details' | 'notes'>('details');
  const modalRef = useRef<HTMLDivElement>(null);
  const notesRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const stage = engine.card ? config.stageById[engine.card.stage] : null;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  useEffect(() => {
    (tab === 'details' ? notesRef : closeRef).current?.focus({ preventScroll: true });
  }, [tab]);

  const close = () => (tab === 'notes' ? onComplete() : onCancel());

  return (
    <div className={styles.backdrop}>
      <div ref={modalRef} className={styles.modal} role="dialog" aria-modal="true" aria-labelledby="opp-modal-title">
        <header className={styles.header}>
          <div>
            <h2 id="opp-modal-title" className={styles.title}>
              {fill(m.title)}
            </h2>
            <p className={styles.subtitle}>{m.subtitle}</p>
          </div>
          <button ref={closeRef} type="button" className={styles.close} onClick={close} aria-label={m.close}>
            <X size={22} strokeWidth={2.25} />
          </button>
        </header>

        <div className={styles.body}>
          <nav className={styles.nav}>
            <div className={styles.navItems}>
              {m.nav.map((item) => {
                const active = item.id === (tab === 'notes' ? 'notes' : 'details');
                return item.id === 'notes' ? (
                  <button
                    key={item.id}
                    ref={notesRef}
                    type="button"
                    className={active ? styles.navActive : styles.navItem}
                    onClick={() => setTab('notes')}
                  >
                    {item.label}
                  </button>
                ) : (
                  <span key={item.id} className={active ? styles.navActive : styles.navItem} aria-hidden="true">
                    {item.label}
                  </span>
                );
              })}
            </div>
            <span className={styles.manage} aria-hidden="true">
              <Settings size={16} />
              {m.manageFields}
            </span>
          </nav>

          {tab === 'details' ? (
            <section className={styles.pane} aria-hidden="true">
              <div className={styles.paneHead}>
                <h3 className={styles.paneTitle}>
                  {m.contactDetails}
                  <SquareUser size={18} />
                </h3>
                <span className={styles.hideEmpty}>
                  <span className={styles.checkbox} />
                  {m.hideEmpty}
                </span>
              </div>
              <div className={styles.scroll}>
                <div className={styles.grid}>
                  <Field label={f.name} required value={cast.name} select />
                  <Field label={f.email} value={patient.email} />
                  <Field label={f.phone} value={patient.phone} />
                  <Field label={f.additional} placeholder={f.additionalPlaceholder} select />
                </div>
                <h4 className={styles.sectionTitle}>{m.opportunityDetails}</h4>
                <div className={styles.grid}>
                  <Field label={f.oppName} required value={cast.name} wide />
                  <Field label={f.pipeline} value={ghl.pipelineName} select />
                  <Field label={f.stage} value={stage?.name ?? ''} select />
                  <Field label={f.status} value={m.statusOpen} select />
                  <Field label={f.value} value={m.zeroValue} money />
                  <Field label={f.business} placeholder={f.businessPlaceholder} />
                  <Field label={f.source} value={cast.source} />
                  <Field label={f.closeDate} placeholder={f.closeDatePlaceholder} date="end" />
                  <div className={styles.field}>
                    <span className={styles.label}>{f.tags}</span>
                    <span className={styles.input}>
                      <span className={styles.chip}>
                        {m.tag}
                        <X size={12} />
                      </span>
                      <ChevronDown size={16} className={styles.chevron} />
                    </span>
                  </div>
                  <Field label={f.projected} value={m.zeroValue} money wide />
                  <Field label={f.estimated} placeholder={f.estimated} money wide />
                  <Field label={f.consultDate} placeholder={f.datePlaceholder} date="start" wide />
                  <Field label={f.procedureDate} placeholder={f.datePlaceholder} date="start" wide />
                </div>
              </div>
            </section>
          ) : (
            <section className={styles.pane}>
              <div className={styles.notesHead}>
                <h3 className={styles.notesTitle}>{m.notesTitle}</h3>
                <span className={styles.notesTools} aria-hidden="true">
                  <span className={styles.tool}>
                    <Filter size={20} />
                  </span>
                  <span className={styles.tool}>
                    <ListFilter size={20} />
                  </span>
                  <span className={styles.search}>
                    <Search size={18} />
                    {m.searchNotes}
                  </span>
                </span>
              </div>
              <p className={styles.addNote} aria-hidden="true">
                <Plus size={18} />
                {m.addNote}
              </p>
              <p className={styles.syncTip} role="note">
                <Info size={15} aria-hidden="true" />
                {m.notesSync}
              </p>
              <div className={styles.scroll}>
                <article className={styles.note}>
                  <div className={styles.noteBody}>
                    <p>
                      <b>{m.formNote.heading}</b>
                    </p>
                    {formNoteLines(cast, config.copy).map((line) => (
                      <p key={line.label} className={line.gap ? styles.gap : undefined}>
                        <b>{line.label}</b> {line.value}
                      </p>
                    ))}
                    <p className={styles.showLess} aria-hidden="true">
                      {m.showLess}
                    </p>
                  </div>
                  <footer className={styles.noteFoot}>
                    <span>
                      {m.record.noteDate}
                      <br />
                      {m.record.createdBy} {m.record.createdByValue}
                    </span>
                    <span className={styles.noteActions} aria-hidden="true">
                      <span className={styles.objects}>
                        <Network size={14} />1
                      </span>
                      <EllipsisVertical size={18} />
                    </span>
                  </footer>
                </article>
              </div>
            </section>
          )}
        </div>

        <footer className={styles.footer}>
          <dl className={styles.record}>
            <div>
              <dt>{m.record.createdBy}</dt>
              <dd className={styles.link}>{m.record.createdByValue}</dd>
            </div>
            <div>
              <dt>{m.record.createdOn}</dt>
              <dd>{m.record.createdOnValue}</dd>
            </div>
            <div>
              <dt>{m.record.audit}</dt>
              <dd className={styles.link}>
                {m.record.auditId}
                <Copy size={13} aria-hidden="true" />
              </dd>
            </div>
          </dl>
          {tab === 'details' && (
            <span className={styles.actions} aria-hidden="true">
              <span className={styles.delete} title={m.deleteLabel}>
                <Trash2 size={18} />
              </span>
              <span className={styles.cancel}>{m.cancel}</span>
              <span className={styles.update}>{m.update}</span>
            </span>
          )}
        </footer>

        <AssistPointer
          containerRef={modalRef}
          getTarget={() => (tab === 'details' ? notesRef.current : closeRef.current)}
          targetKey={tab}
          hint={tab === 'details' ? m.hints.notes : fill(m.hints.close)}
        />
      </div>
    </div>
  );
}

/** One form field as the CRM draws it: label (with a red * if required), then an input, select, money, or date box. */
function Field(props: {
  label: string;
  value?: string;
  placeholder?: string;
  required?: boolean;
  select?: boolean;
  money?: boolean;
  /** Where the calendar icon sits. */
  date?: 'start' | 'end';
  wide?: boolean;
}) {
  const { label, value, placeholder, required, select, money, date, wide } = props;
  return (
    <div className={`${styles.field} ${wide ? styles.wide : ''}`}>
      <span className={styles.label}>
        {label}
        {required && <span className={styles.required}>*</span>}
      </span>
      <span className={styles.input}>
        {date === 'start' && <Calendar size={16} className={styles.dateIcon} />}
        {money && <span className={styles.dollar}>$</span>}
        <span className={value ? styles.value : styles.placeholder}>{value || placeholder}</span>
        {select && <ChevronDown size={16} className={styles.chevron} />}
        {date === 'end' && <Calendar size={16} className={styles.chevron} />}
      </span>
    </div>
  );
}
