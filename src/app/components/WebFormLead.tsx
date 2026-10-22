import { useEffect, useRef, useState } from 'react';
import { useReducedMotion } from 'motion/react';
import { CircleCheck, Lock, Phone, X } from 'lucide-react';
import { useGuideContext } from '../GuideContext.tsx';
import { demoPatient } from '../demoPatient.ts';
import { AssistPointer } from './AssistPointer.tsx';
import styles from './WebFormLead.module.css';

/** Sending, then the thank-you, then the window fades before the card appears. */
const SENDING_MS = 900;
const THANKS_MS = 1300;
const CLOSE_MS = 600;

/**
 * Opening (`intro`): a browser window rises in, the address types itself, the page loads and the window grows to
 * fill the screen, then the site's consultation popup comes up. How long each part takes, in ms.
 */
const TYPE_START_MS = 500;
const CHAR_MS = 24;
const LOAD_MS = 700;
const GROW_MS = 900;
const POPUP_AFTER_MS = 700;

type WebFormLeadProps = {
  /** Fill the whole screen (the tour opens on the practice's website). */
  fullscreen?: boolean;
  /** Play the opening: the window rises in, the address types itself, the site loads, then the popup appears. */
  intro?: boolean;
  /** What the close buttons say they do (they call onCancel). */
  closeLabel?: string;
  onComplete: () => void;
  onCancel: () => void;
  onSkip: () => void;
};

/**
 * The patient's side of a new lead: a fictional plastic surgery practice's website in a browser window,
 * with the site's consultation form open on top, already filled in with the fictional patient's details.
 * The viewer submits it (the guide shows where), then the card appears in New Lead.
 */
export function WebFormLead({ fullscreen = false, intro = false, closeLabel, onComplete, onCancel, onSkip }: WebFormLeadProps) {
  const { config, cast, fill } = useGuideContext();
  const { webForm } = config.copy;
  const reducedMotion = useReducedMotion() ?? false;
  const playIntro = intro && !reducedMotion;
  // Opening: typing the address, loading, the window growing, then the popup (open).
  const [opening, setOpening] = useState<'typing' | 'loading' | 'growing' | 'open'>(playIntro ? 'typing' : 'open');
  const [typed, setTyped] = useState(playIntro ? 0 : webForm.url.length);
  const [phase, setPhase] = useState<'ready' | 'sending' | 'sent' | 'closing'>('ready');
  const windowRef = useRef<HTMLDivElement>(null);
  const submitRef = useRef<HTMLButtonElement>(null);
  const { first, last, email, phone } = demoPatient(cast, config.copy);
  const monogram = webForm.siteName.charAt(0);
  const close = closeLabel ?? webForm.close;
  const cancel = () => phase === 'ready' && onCancel();

  useEffect(() => {
    if (opening === 'open') return;
    let timer: number;
    if (opening === 'typing') {
      timer =
        typed < webForm.url.length
          ? window.setTimeout(() => setTyped(typed + 1), typed === 0 ? TYPE_START_MS : CHAR_MS)
          : window.setTimeout(() => setOpening('loading'), 250);
    } else if (opening === 'loading') {
      timer = window.setTimeout(() => setOpening('growing'), LOAD_MS);
    } else {
      timer = window.setTimeout(() => setOpening('open'), GROW_MS + POPUP_AFTER_MS);
    }
    return () => window.clearTimeout(timer);
  }, [opening, typed, webForm.url.length]);

  useEffect(() => {
    if (opening === 'open') submitRef.current?.focus({ preventScroll: true });
  }, [opening]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && phase === 'ready' && onCancel();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onCancel, phase]);

  const submit = () => {
    if (phase !== 'ready') return;
    setPhase('sending');
    window.setTimeout(() => setPhase('sent'), SENDING_MS);
    window.setTimeout(() => setPhase('closing'), SENDING_MS + THANKS_MS);
    window.setTimeout(onComplete, SENDING_MS + THANKS_MS + CLOSE_MS);
  };

  const field = (label: string, value: string, wide = false) => (
    <label className={`${styles.field} ${wide ? styles.wide : ''}`}>
      <span>{label}</span>
      <input value={value} readOnly tabIndex={-1} />
    </label>
  );

  return (
    <div
      className={`${styles.backdrop} ${fullscreen ? styles.fullscreen : ''} ${playIntro ? styles.intro : ''} ${
        opening === 'typing' || opening === 'loading' ? styles.small : ''
      } ${opening === 'typing' ? styles.blank : ''} ${phase === 'closing' ? styles.closing : ''}`}
    >
      <div ref={windowRef} className={styles.window} role="dialog" aria-modal="true" aria-label={webForm.dialogLabel}>
        <div className={styles.chrome}>
          <span className={styles.lights}>
            {/* The window's red close light works too; the popup's X is the keyboard route. */}
            <button type="button" className={styles.closeLight} onClick={cancel} title={close} tabIndex={-1} aria-hidden="true">
              <X size={8} strokeWidth={3} />
            </button>
            <i aria-hidden="true" />
            <i aria-hidden="true" />
          </span>
          <span className={styles.url} aria-hidden="true">
            <Lock size={12} />
            {webForm.url.slice(0, typed)}
            {opening === 'typing' && <span className={styles.caret} />}
          </span>
        </div>

        {/* The practice's website, behind its consultation popup. */}
        <div className={styles.site} aria-hidden="true">
          <header className={styles.siteHeader}>
            <span className={styles.brand}>
              <span className={styles.monogram}>{monogram}</span>
              <span>
                <strong>{webForm.siteName}</strong>
                <small>{webForm.siteTagline}</small>
              </span>
            </span>
            <nav className={styles.siteNav}>
              {webForm.nav.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </nav>
            <span className={styles.sitePhone}>
              <Phone size={14} />
              {webForm.sitePhone}
            </span>
            <span className={styles.siteCta}>{webForm.siteCta}</span>
          </header>
          <section className={styles.hero}>
            <div className={styles.heroText}>
              <p className={styles.eyebrow}>{webForm.hero.eyebrow}</p>
              <h3 className={styles.heroTitle}>{webForm.hero.title}</h3>
              <p className={styles.heroBody}>{webForm.hero.body}</p>
              <span className={styles.heroButtons}>
                <span className={styles.heroPrimary}>{webForm.hero.primary}</span>
                <span className={styles.heroSecondary}>{webForm.hero.secondary}</span>
              </span>
            </div>
            <div className={styles.heroArt}>
              <span />
              <span />
              <span />
            </div>
          </section>
          <section className={styles.procedures}>
            {webForm.procedures.map((p) => (
              <div key={p.title} className={styles.procedure}>
                <strong>{p.title}</strong>
                <span>{p.body}</span>
              </div>
            ))}
          </section>
        </div>

        {/* The page loading: a bar sweeps under the address bar. */}
        {opening === 'loading' && <span className={styles.loading} aria-hidden="true" />}

        {/* The site's own consultation popup. */}
        {opening === 'open' && (
          <div className={styles.popupLayer}>
            <section className={styles.popup}>
              <button type="button" className={styles.popupClose} onClick={cancel} aria-label={close} title={close}>
                <X size={16} aria-hidden="true" />
              </button>
              <p className={styles.popupBrand}>{webForm.siteName}</p>
              <h2 className={styles.title}>{webForm.title}</h2>
              <p className={styles.intro}>{webForm.intro}</p>

              {phase === 'sent' || phase === 'closing' ? (
                <p className={styles.thanks} role="status">
                  <CircleCheck size={22} aria-hidden="true" />
                  {webForm.sent}
                </p>
              ) : (
                <form
                  className={styles.form}
                  onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                  }}
                >
                  {field(webForm.fields.firstName, first)}
                  {field(webForm.fields.lastName, last)}
                  {field(webForm.fields.email, email)}
                  {field(webForm.fields.phone, phone)}
                  {field(webForm.fields.interest, webForm.interest, true)}
                  <label className={`${styles.field} ${styles.wide}`}>
                    <span>{webForm.fields.message}</span>
                    <textarea value={webForm.message} readOnly tabIndex={-1} rows={2} />
                  </label>
                  <button ref={submitRef} type="submit" className={styles.submit} disabled={phase !== 'ready'}>
                    {phase === 'sending' && <span className={styles.spinner} aria-hidden="true" />}
                    {phase === 'sending' ? webForm.sending : webForm.submit}
                  </button>
                </form>
              )}
            </section>
          </div>
        )}

        <footer className={styles.footer}>
          <button type="button" className={styles.skip} onClick={onSkip} disabled={phase !== 'ready'}>
            {webForm.skip}
          </button>
        </footer>

        {phase === 'ready' && opening === 'open' && (
          <AssistPointer containerRef={windowRef} getTarget={() => submitRef.current} targetKey="submit" hint={fill(webForm.hint)} />
        )}
      </div>
    </div>
  );
}
