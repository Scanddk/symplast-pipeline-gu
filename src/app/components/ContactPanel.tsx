import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useReducedMotion } from 'motion/react';
import {
  Calendar,
  Check,
  ChevronDown,
  CircleCheck,
  CircleUserRound,
  EllipsisVertical,
  ClipboardCheck,
  ExternalLink,
  Eye,
  FileText,
  Flag,
  FolderOpen,
  History,
  Mail,
  Maximize2,
  MessageSquareMore,
  MessagesSquare,
  Minus,
  MessageCircle,
  Network,
  PanelRight,
  Paperclip,
  PencilLine,
  PhoneCall,
  Pin,
  Plus,
  Send,
  Settings,
  RemoveFormatting,
  Smile,
  Tag,
  UserRound,
  X,
  Zap,
  DollarSign,
  type LucideIcon,
} from 'lucide-react';
import type { EngineState } from '../../../engine/index.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { demoPatient, formNoteLines, toE164 } from '../demoPatient.ts';
import { AssistPointer } from './AssistPointer.tsx';
import { SenderAvatar } from './SenderAvatar.tsx';
import styles from './ContactPanel.module.css';

/**
 * Where the guide points next: the message type menu, SMS in it, (your team types the text), Send, then
 * Notes, Tasks, Add task, Save, and Close.
 */
type Step = 'channel' | 'sms' | 'typing' | 'send' | 'notes' | 'tasks' | 'addTask' | 'save' | 'close';

const CHANNEL_ICONS: Record<'sms' | 'whatsapp' | 'email' | 'messenger' | 'internal', LucideIcon> = {
  sms: MessageSquareMore,
  whatsapp: MessageCircle,
  email: Mail,
  messenger: MessagesSquare,
  internal: Eye,
};

/** Your team's text, typed out letter by letter with a beat after spaces and punctuation. */
const CHAR_MS = 28;
const SPACE_MS = 30;
const PUNCTUATION_MS = 220;

/**
 * Replica of the CRM's contact slide-out, opened from the opportunity name. The guide walks through
 * what staff can do from here: text the patient (pick SMS, the text types itself, send), read notes,
 * and add a prefilled call-back task.
 */
export function ContactPanel({ engine, onComplete, onCancel }: { engine: EngineState; onComplete: () => void; onCancel: () => void }) {
  const { config, cast, fill } = useGuideContext();
  const { contactPanel: c, task, opportunityModal: m, ghl } = config.copy;
  const patient = demoPatient(cast, config.copy);
  const reducedMotion = useReducedMotion() ?? false;
  const [step, setStep] = useState<Step>('channel');
  const smsText = fill(c.composer.text);
  const [typed, setTyped] = useState(0);
  const composing = step === 'typing' || step === 'send';
  const sent = !['channel', 'sms', 'typing', 'send'].includes(step);
  const typedText = smsText.slice(0, typed);
  const [side, setSide] = useState<'contact' | 'notes' | 'tasks'>('contact');
  const taskSaved = step === 'close';
  const panelRef = useRef<HTMLDivElement>(null);
  const refs = {
    channel: useRef<HTMLButtonElement>(null),
    sms: useRef<HTMLButtonElement>(null),
    typing: useRef<HTMLButtonElement>(null),
    send: useRef<HTMLButtonElement>(null),
    notes: useRef<HTMLButtonElement>(null),
    tasks: useRef<HTMLButtonElement>(null),
    addTask: useRef<HTMLButtonElement>(null),
    save: useRef<HTMLButtonElement>(null),
    close: useRef<HTMLButtonElement>(null),
  };
  const called = engine.card?.stage === 'contacted';
  const dueDay = engine.day + 7;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel]);

  // Your team types the text, then the guide points at Send.
  useEffect(() => {
    if (step !== 'typing') return;
    if (typed >= smsText.length) {
      setStep('send');
      return;
    }
    const next = smsText[typed];
    const pause = /[.,?!]/.test(next) ? PUNCTUATION_MS : next === ' ' ? SPACE_MS : 0;
    const timer = window.setTimeout(() => setTyped(reducedMotion ? smsText.length : typed + 1), CHAR_MS + pause);
    return () => window.clearTimeout(timer);
  }, [step, typed, smsText, reducedMotion]);

  const pickSms = () => step === 'sms' && setStep('typing');
  const sendText = () => step === 'send' && setStep('notes');

  const target = refs[step];
  const hint = {
    channel: fill(c.hints.channel),
    sms: c.hints.sms,
    typing: '',
    send: c.hints.send,
    notes: c.hints.notes,
    tasks: c.hints.tasks,
    addTask: c.hints.addTask,
    save: c.hints.save,
    close: c.hints.close,
  }[step];

  useEffect(() => {
    target.current?.focus({ preventScroll: true });
  }, [target]);

  return (
    <div className={styles.backdrop}>
      <div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-label={cast.name}>
        <header className={styles.top}>
          <span className={styles.avatar}>{patient.initials}</span>
          <strong className={styles.name}>{cast.name}</strong>
          <span className={styles.topIcons} aria-hidden="true">
            <PanelRight size={18} />
            <ExternalLink size={18} />
          </span>
          <button
            ref={refs.close}
            type="button"
            className={styles.close}
            aria-label={c.close}
            onClick={() => (taskSaved ? onComplete() : onCancel())}
          >
            <X size={20} />
          </button>
        </header>

        <div className={styles.body}>
          {/* Conversations column */}
          <section className={styles.main}>
            <div className={styles.tabs}>
              <span className={styles.tabActive}>
                <MessageCircle size={16} aria-hidden="true" />
                {c.conversations}
              </span>
              <span className={styles.customize} aria-hidden="true">
                <Settings size={16} />
                {c.customize}
              </span>
            </div>
            <div className={styles.toolbar} aria-hidden="true">
              <MessageCircle size={20} />
              <ChevronDown size={14} />
              <PhoneCall size={20} />
              <ChevronDown size={14} />
              <FolderOpen size={20} />
              <Mail size={20} />
            </div>
            <div className={styles.timeline}>
              <p className={styles.dateChip}>
                <Calendar size={14} aria-hidden="true" />
                {fill(config.copy.board.day, { day: 0 })}
              </p>
              <p className={styles.event}>
                <Network size={16} aria-hidden="true" />
                <span>{fill(c.created, { pipeline: ghl.pipelineName, stage: config.stageById.new_lead.name })}</span>
              </p>
              {called && (
                <p className={styles.event}>
                  <PhoneCall size={16} aria-hidden="true" />
                  <span>{fill(c.called)}</span>
                </p>
              )}
              {sent && (
                <div className={styles.sentWrap}>
                  <div className={styles.sentRow}>
                    <p className={styles.sentBubble}>{smsText}</p>
                    {/* Who sent it: the team member's avatar, with a badge for the channel (SMS). */}
                    <SenderAvatar kind="staff" title={config.copy.senders.team} />
                  </div>
                  <p className={styles.sentMeta}>
                    {fill(c.composer.sent, { day: engine.day })}
                    <EllipsisVertical size={13} aria-hidden="true" />
                  </p>
                </div>
              )}
            </div>
            {composing ? (
              <div className={styles.composer}>
                <div className={styles.composerTabs}>
                  <span className={styles.composerTab}>
                    <MessageSquareMore size={15} aria-hidden="true" />
                    {c.composer.sms}
                    <ChevronDown size={13} aria-hidden="true" />
                  </span>
                  <span className={styles.composerInternal} aria-hidden="true">
                    <Eye size={15} />
                    {c.composer.internal}
                  </span>
                  <span className={styles.composerSize} aria-hidden="true">
                    <Minus size={16} />
                    <Maximize2 size={15} />
                  </span>
                </div>
                <div className={styles.numbers}>
                  <span>
                    <b>{c.composer.from}</b>
                    {toE164(config.copy.webForm.sitePhone)}
                    <ChevronDown size={14} aria-hidden="true" />
                  </span>
                  <span>
                    <b>{c.composer.to}</b>
                    {toE164(patient.phone)}
                  </span>
                </div>
                <p className={styles.messageBox} aria-hidden={step === 'typing' || undefined}>
                  {typedText || <span className={styles.placeholder}>{c.composer.message}</span>}
                  {step === 'typing' && <span className={styles.caret} />}
                </p>
                <div className={styles.composerTools}>
                  <span className={styles.toolIcons} aria-hidden="true">
                    <Smile size={18} />
                    <Paperclip size={18} />
                    <FileText size={18} />
                    <Zap size={18} />
                    <Tag size={18} />
                    <DollarSign size={18} />
                    <RemoveFormatting size={18} />
                  </span>
                  {/* Send, with the CRM's split arrow beside it (the pointer aims at Send itself). */}
                  <span className={styles.sendGroup}>
                    <button
                      ref={refs.send}
                      type="button"
                      className={styles.send}
                      onClick={sendText}
                      disabled={step !== 'send'}
                      aria-label={c.composer.send}
                    >
                      <Send size={15} aria-hidden="true" />
                    </button>
                    <span className={styles.sendSplit} aria-hidden="true">
                      <ChevronDown size={13} />
                    </span>
                  </span>
                </div>
                <p className={styles.counter} aria-hidden="true">
                  {fill(c.composer.counter, { chars: typedText.length, segs: Math.ceil(typedText.length / 160) })}
                </p>
              </div>
            ) : (
              <div className={styles.composerBar}>
                <button
                  ref={refs.channel}
                  type="button"
                  className={styles.channel}
                  aria-haspopup="menu"
                  aria-expanded={step === 'sms'}
                  aria-label={c.composer.sms}
                  onClick={() => step === 'channel' && setStep('sms')}
                >
                  <MessageSquareMore size={17} aria-hidden="true" />
                  <ChevronDown size={13} aria-hidden="true" />
                </button>
                <span className={styles.placeholder}>{c.composer.message}</span>
                <span className={styles.sendIdle} aria-hidden="true">
                  <Send size={15} />
                  <ChevronDown size={13} />
                </span>
                {step === 'sms' && (
                  <ul className={styles.channelMenu} role="menu">
                    {c.composer.channels.map((channel) => {
                      const Icon = CHANNEL_ICONS[channel.id];
                      return (
                        <li key={channel.id} role="none">
                          {channel.id === 'sms' ? (
                            <button ref={refs.sms} type="button" role="menuitem" className={styles.channelPicked} onClick={pickSms}>
                              <Icon size={18} aria-hidden="true" />
                              {channel.label}
                              <Check size={16} className={styles.channelCheck} aria-hidden="true" />
                            </button>
                          ) : (
                            <span className={styles.channelItem} aria-hidden="true">
                              <Icon size={18} />
                              {channel.label}
                            </span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            )}
          </section>

          {/* Side panel: contact details, notes, or tasks */}
          <aside className={styles.side}>
            {side === 'contact' && (
              <>
                <h3 className={styles.sideTitle}>{c.panels.contact}</h3>
                <div className={styles.contactCard}>
                  <span className={styles.avatar}>{patient.initials}</span>
                  <strong>{cast.name}</strong>
                </div>
                <Detail label={c.firstName} value={patient.first} />
                <Detail label={c.lastName} value={patient.last} />
                <Detail label={c.email} value={patient.email} />
                <Detail label={c.phone} value={patient.phone} />
              </>
            )}
            {side === 'notes' && (
              <>
                <h3 className={styles.sideTitle}>
                  {c.panels.notes}
                  <span className={styles.addLink} aria-hidden="true">
                    <Plus size={14} />
                    {c.add}
                  </span>
                </h3>
                <article className={styles.stickyNote}>
                  <Pin size={14} className={styles.pin} aria-hidden="true" />
                  <p>
                    <b>{m.formNote.heading}</b>
                  </p>
                  {formNoteLines(cast, config.copy).map((line) => (
                    <p key={line.label} className={line.gap ? styles.noteGap : undefined}>
                      <b>{line.label}</b> {line.value}
                    </p>
                  ))}
                </article>
              </>
            )}
            {side === 'tasks' && (
              <>
                <h3 className={styles.sideTitle}>
                  {c.panels.tasks}
                  <span className={styles.addLink} aria-hidden="true">
                    <Plus size={14} />
                    {c.add}
                  </span>
                </h3>
                {taskSaved ? (
                  <article className={styles.taskRow}>
                    <CircleCheck size={18} className={styles.taskIcon} aria-hidden="true" />
                    <span>
                      <strong>{fill(task.name)}</strong>
                      <small>
                        {fill(task.dueValue, { day: dueDay })} · {task.statusValue}
                      </small>
                    </span>
                  </article>
                ) : (
                  <div className={styles.empty}>
                    <ClipboardCheck size={28} aria-hidden="true" />
                    <strong>{c.noTasks}</strong>
                    <span>{c.noTasksBody}</span>
                    <button ref={refs.addTask} type="button" className={styles.addTask} onClick={() => setStep('save')}>
                      {c.addTask}
                    </button>
                  </div>
                )}
              </>
            )}
          </aside>

          {/* Icon rail */}
          <nav className={styles.rail}>
            <RailButton active={side === 'contact'} label={c.panels.contact}>
              <CircleUserRound size={20} />
            </RailButton>
            <RailButton label="">
              <History size={20} />
            </RailButton>
            <RailButton label="">
              <Calendar size={20} />
            </RailButton>
            <RailButton label="">
              <Network size={20} />
            </RailButton>
            <RailButton
              refProp={refs.tasks}
              active={side === 'tasks'}
              label={c.panels.tasks}
              onClick={
                step === 'tasks'
                  ? () => {
                      setSide('tasks');
                      setStep('addTask');
                    }
                  : undefined
              }
            >
              <ClipboardCheck size={20} />
            </RailButton>
            <RailButton
              refProp={refs.notes}
              active={side === 'notes'}
              label={c.panels.notes}
              onClick={
                step === 'notes'
                  ? () => {
                      setSide('notes');
                      setStep('tasks');
                    }
                  : undefined
              }
            >
              <PencilLine size={20} />
            </RailButton>
            <RailButton label="">
              <FileText size={20} />
            </RailButton>
          </nav>
        </div>

        {/* Task details pane, prefilled as a reminder to call back next week. */}
        {step === 'save' && (
          <section className={styles.taskPane} aria-label={task.title}>
            <header className={styles.taskHeader}>
              <strong>{task.title}</strong>
            </header>
            <p className={styles.taskName}>{fill(task.name)}</p>
            <dl className={styles.taskFields}>
              <TaskField icon={<span className={styles.todoDot} />} label={task.status} value={task.statusValue} />
              <TaskField icon={<UserRound size={16} />} label={task.assignee} value={task.assigneeValue} />
              <TaskField icon={<Calendar size={16} />} label={task.due} value={fill(task.dueValue, { day: dueDay })} />
              <TaskField icon={<Flag size={16} />} label={task.priority} value={task.priorityValue} />
            </dl>
            <p className={styles.taskDescription}>{fill(task.description)}</p>
            <p className={styles.taskAssociated}>
              <span>{task.associated}</span>
              <span className={styles.chip}>{cast.name}</span>
            </p>
            <footer className={styles.taskFooter}>
              <span className={styles.cancel} aria-hidden="true">
                {task.cancel}
              </span>
              <button
                ref={refs.save}
                type="button"
                className={styles.save}
                onClick={() => setStep('close')}
              >
                {task.save}
              </button>
            </footer>
          </section>
        )}

        {taskSaved && (
          <p className={styles.toast} role="status">
            <CircleCheck size={16} aria-hidden="true" />
            {task.saved}
          </p>
        )}

        {/* While your team types, the pointer steps aside. */}
        {step !== 'typing' && (
          <AssistPointer containerRef={panelRef} getTarget={() => target.current} targetKey={step} hint={hint} />
        )}
      </div>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className={styles.detail}>
      <span>{label}</span>
      <strong>{value}</strong>
    </p>
  );
}

function TaskField({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className={styles.taskField}>
      <dt>
        <span aria-hidden="true">{icon}</span>
        {label}
      </dt>
      <dd>{value}</dd>
    </div>
  );
}

function RailButton(props: {
  children: ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
  refProp?: React.RefObject<HTMLButtonElement | null>;
}) {
  const { children, label, active, onClick, refProp } = props;
  if (!onClick)
    return (
      <span className={active ? styles.railActive : styles.railItem} aria-hidden="true">
        {children}
      </span>
    );
  return (
    <button ref={refProp} type="button" className={active ? styles.railActive : styles.railItem} onClick={onClick} aria-label={label}>
      {children}
    </button>
  );
}
