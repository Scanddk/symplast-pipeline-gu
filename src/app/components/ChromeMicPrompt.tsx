import { useEffect, useRef } from 'react';
import { ArrowLeft, ArrowRight, ChevronDown, Mic, RotateCw, Star, UserRound, X } from 'lucide-react';
import { useGuideContext } from '../GuideContext.tsx';
import { AssistPointer } from './AssistPointer.tsx';
import styles from './ChromeMicPrompt.module.css';

/**
 * Chrome's toolbar (dark theme) over Symplast CRM, with its microphone prompt, from the content owner's
 * screenshots. Shown before the first call connects. The "Use microphone?" chip and the prompt go away once
 * the viewer allows; only "Allow while visiting the site" works.
 */
export function ChromeMicPrompt({ asking, onAllow }: { asking: boolean; onAllow: () => void }) {
  const { config, fill } = useGuideContext();
  const { mic } = config.copy.call;
  const promptRef = useRef<HTMLDivElement>(null);
  const allowRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (asking) allowRef.current?.focus({ preventScroll: true });
  }, [asking]);

  return (
    <div className={styles.bar}>
      <span className={styles.nav} aria-hidden="true">
        <ArrowLeft size={18} />
        <ArrowRight size={18} />
        <RotateCw size={16} />
      </span>
      <span className={styles.omnibox}>
        {asking && (
          <span className={styles.chip} aria-hidden="true">
            <Mic size={13} />
            {mic.chip}
          </span>
        )}
        <span className={styles.url} aria-hidden="true">
          {mic.url}
        </span>
        <Star size={16} className={styles.star} aria-hidden="true" />
      </span>
      <span className={styles.profile} aria-hidden="true">
        <UserRound size={15} />
      </span>

      {asking && (
        <div ref={promptRef} className={styles.prompt} role="dialog" aria-label={fill(mic.wantsTo, { site: mic.site })}>
          <p className={styles.title}>
            {fill(mic.wantsTo, { site: mic.site })}
            <X size={18} aria-hidden="true" />
          </p>
          <p className={styles.use}>
            <Mic size={16} aria-hidden="true" />
            {mic.use}
          </p>
          <div className={styles.device} aria-hidden="true">
            <span className={styles.level}>
              <Mic size={16} />
              <span className={styles.meter}>
                <i />
              </span>
            </span>
            <span className={styles.select}>
              {mic.device}
              <ChevronDown size={16} />
            </span>
          </div>
          <button ref={allowRef} type="button" className={styles.allow} onClick={onAllow}>
            {mic.allowSite}
          </button>
          <span className={styles.choice} aria-hidden="true">
            {mic.allowOnce}
          </span>
          <span className={styles.choice} aria-hidden="true">
            {mic.never}
          </span>
          <AssistPointer containerRef={promptRef} getTarget={() => allowRef.current} targetKey="allow" hint={config.copy.call.hints.allow} />
        </div>
      )}
    </div>
  );
}
