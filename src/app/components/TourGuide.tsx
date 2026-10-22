import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { useReducedMotion } from 'motion/react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { render } from '../../../engine/index.ts';
import type { Tour, TourBeat } from '../../../schema/tour.ts';
import { defaultCast } from '../../../content/scenarios/index.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { useGuide } from '../hooks/useGuide.ts';
import { useShellFocus } from '../hooks/useShellFocus.ts';
import { demoPatient } from '../demoPatient.ts';
import { GhlAppFrame } from './GhlAppFrame.tsx';
import { GhlViewTabs } from './GhlViewTabs.tsx';
import { Board } from './Board.tsx';
import { CaptionBar } from './CaptionBar.tsx';
import { StageDetailPanel } from './StageDetailPanel.tsx';
import { AssistPointer } from './AssistPointer.tsx';
import { AppDock } from './AppDock.tsx';
import { WebFormLead } from './WebFormLead.tsx';
import { OpportunityModal } from './OpportunityModal.tsx';
import { CrmCall } from './CrmCall.tsx';
import { ChromeMicPrompt } from './ChromeMicPrompt.tsx';
import { ContactPanel } from './ContactPanel.tsx';
import { TimeLapse } from './TimeLapse.tsx';
import { TextThread, type ThreadLine } from './TextThread.tsx';
import { EhrNewAppointment } from './EhrNewAppointment.tsx';
import { EhrCheckout } from './EhrCheckout.tsx';
import styles from './TourGuide.module.css';

/** reveal_card: how long the whole CRM holds while the new card arrives. */
const WIDE_HOLD_MS = 1600;
/** The push-in to the pipeline (GhlAppFrame --zoom-duration), plus a moment to settle. */
const PUSH_MS = 2300;
/** The push-in to (or back out from) the card (GhlAppFrame .content transition), and how close it gets. */
const CARD_ZOOM_MS = 1600;
const CARD_ZOOM = 1.45;
/** Space kept between the zoomed card and the edge of the view. */
const ZOOM_MARGIN = 16;

/**
 * Where to scale the pipeline about so the camera moves in on the card: the card's centre, shifted just enough
 * that the whole card stays in view (above the dock) and no space beyond the pipeline's edges shows.
 * Rects are on-screen; the result is in content coordinates.
 */
function aimAt(card: DOMRect, content: DOMRect, viewBottom: number) {
  const s = CARD_ZOOM;
  const m = ZOOM_MARGIN;
  const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);
  // Content coordinates of the card and of the part of the content that's on screen.
  const left = card.left - content.left;
  const right = card.right - content.left;
  const top = card.top - content.top;
  const bottom = card.bottom - content.top;
  const visTop = Math.max(0, -content.top);
  const visBottom = Math.min(content.height, viewBottom - content.top);
  // Scaling by s about o moves a point p to o + s(p − o); keep the card's edges inside the view.
  const keep = (centre: number, lo: number, hi: number, size: number) =>
    lo <= hi ? clamp(clamp(centre, lo, hi), 0, size) : clamp(centre, 0, size);
  return {
    x: keep((left + right) / 2, (s * right - content.width + m) / (s - 1), (s * left - m) / (s - 1), content.width),
    y: keep((top + bottom) / 2, (s * bottom - visBottom + m) / (s - 1), (s * top - visTop - m) / (s - 1), content.height),
    scale: s,
  };
}

/**
 * Beats that start on the board: the guide points at part of the card (the card itself, its phone button,
 * or its name) and the replica opens when the viewer clicks it.
 */
const BOARD_TARGETS: Partial<Record<TourBeat['demo'], string>> = {
  opportunity_notes: '[data-testid="demo-card"]',
  crm_call: '[data-card-call]',
  contact_panel: '[data-card-name]',
};

/**
 * Replicas of Symplast Practice App screens. The app dock comes first, so it's clear the screen
 * is a different app from Symplast CRM. The value picks the dock's hint.
 */
const PRACTICE_APP: Partial<Record<TourBeat['demo'], 'book' | 'checkout' | 'procedure'>> = {
  ehr_new_appointment: 'book',
  ehr_checkout: 'checkout',
  ehr_book_procedure: 'procedure',
};

/** Text conversations beside the card. Each stays on screen while the viewer opens the Practice App next. */
const THREADS: ReadonlySet<TourBeat['demo']> = new Set(['patient_reply', 'nurture_reply']);

/**
 * Replicas that pop out of the whole CRM screen (the dialer hangs from the top bar), so the camera pulls back
 * to the full app while they're open, and pushes in to the pipeline again before the card moves.
 */
const WIDE_DEMOS: ReadonlySet<TourBeat['demo']> = new Set(['crm_call']);
/** The procedure is booked this many days out (story only). */
const PROCEDURE_IN_DAYS = 14;

/** How far into the pull-back the replica pops out. */
const POP_OUT_MS = 1800;

/**
 * Once a beat has finished, the tour moves on by itself after time to read the caption (Next skips the wait;
 * the Next button fills up meanwhile). Roughly a reading pace per word, within limits.
 */
const readMs = (text: string) => Math.min(8000, Math.max(3000, 1200 + text.split(/\s+/).length * 260));

/**
 * Where a beat is: settling the camera, pointing at the board, waiting on the app dock, playing its replica,
 * revealing the result with a camera move, or finished (Next is available).
 */
type Phase = 'settle' | 'board' | 'launch' | 'demo' | 'reveal' | 'done';

const startPhase = (beat: TourBeat): Phase =>
  BOARD_TARGETS[beat.demo] ? 'board' : PRACTICE_APP[beat.demo] ? 'launch' : 'demo';

/**
 * A guided tour on the board: one story, beat by beat. Each beat plays a replica the viewer clicks through
 * with the assistive pointer, then (if the beat says so) fires a pipeline event so the card moves.
 * No event buttons: the tour tells the story. Back rewinds to the start of the previous beat.
 */
export function TourGuide({ tour, playIntro, onExit }: { tour: Tour; playIntro: boolean; onExit: () => void }) {
  const { config, view, cast, fill } = useGuideContext();
  const copy = config.copy;
  const guide = useGuide(config, defaultCast);
  const reducedMotion = useReducedMotion() ?? false;
  const contentRef = useRef<HTMLElement>(null);
  const beats = tour.beats;
  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<Phase>(() => startPhase(beats[0]));
  /** The camera: the whole CRM (wide), the pipeline, or in on one point of it (the card). */
  const [wide, setWide] = useState(Boolean(beats[0].camera));
  const [zoomTo, setZoomTo] = useState<{ x: number; y: number; scale: number } | null>(null);
  const dockRef = useRef<HTMLDivElement>(null);
  /** How many engine steps existed when each beat began, for Back. */
  const marks = useRef<number[]>([0]);
  const [panel, setPanel] = useState<{ stageId: string; eventId: string | null } | null>(null);
  /** The call beat: Chrome asks for the microphone before the call connects. */
  const [micAllowed, setMicAllowed] = useState(false);
  const finished = index >= beats.length;
  const beat = finished ? null : beats[index];
  // Story-only days (the consultation day) move the clock on screen without a pipeline event.
  const storyDays = beats.slice(0, index).filter((b) => b.demo === 'consult_day').length;
  const shownDay = guide.engine.day + storyDays;
  // While the camera is pulled back for the call, the page header folds away to give the full CRM the room.
  useShellFocus(wide && Boolean(beat && WIDE_DEMOS.has(beat.demo)));
  const patient = demoPatient(cast, copy);

  // Camera moves are timed; starting another beat cancels any still to come.
  const timers = useRef<number[]>([]);
  const later = (ms: number, run: () => void) => timers.current.push(window.setTimeout(run, ms));
  const cancelLater = () => {
    timers.current.forEach((t) => window.clearTimeout(t));
    timers.current = [];
  };
  useEffect(() => cancelLater, []);

  /** Run what a beat fires: one event, or Skip ahead until a step names the id. */
  const fireBeat = (b: TourBeat) => {
    if (!b.fires) return;
    if ('event' in b.fires) guide.fire(b.fires.event);
    else guide.skipUntil(b.fires.skipUntil);
  };

  const begin = (i: number, stepCount: number) => {
    cancelLater();
    marks.current[i] = stepCount;
    setIndex(i);
    setMicAllowed(false);
    // Some beats fire as they begin (a text goes out, then the conversation about it plays).
    if (beats[i].firesAt === 'start') fireBeat(beats[i]);
    const start = () => setPhase(startPhase(beats[i]));
    if (zoomTo && !beats[i].camera) {
      // Ease back out from the card before the next beat points at anything. Scale back about the same point
      // (dropping the point at once would make the view jump), then clear the zoom once it's at rest.
      setZoomTo({ ...zoomTo, scale: 1 });
      setPhase('settle');
      later(reducedMotion ? 0 : CARD_ZOOM_MS, () => {
        setZoomTo(null);
        start();
      });
    } else {
      setZoomTo(null);
      setWide(Boolean(beats[i].camera));
      start();
    }
  };

  /** reveal_card: hold wide on the whole CRM while the card arrives, push in to the pipeline, then in on the card. */
  const revealCard = () => {
    setPhase('reveal');
    const push = reducedMotion ? 0 : PUSH_MS;
    later(WIDE_HOLD_MS, () => setWide(false));
    later(WIDE_HOLD_MS + push, () => {
      const content = contentRef.current;
      const card = content?.querySelector('[data-testid="demo-card"]');
      if (!content || !card) return;
      const viewBottom = dockRef.current?.getBoundingClientRect().top ?? window.innerHeight;
      setZoomTo(aimAt(card.getBoundingClientRect(), content.getBoundingClientRect(), viewBottom));
    });
    later(WIDE_HOLD_MS + push + (reducedMotion ? 0 : CARD_ZOOM_MS), () => setPhase('done'));
  };

  const complete = () => {
    if (!beat) return;
    let count = guide.stepCount;
    if (beat.firesAt !== 'start') {
      fireBeat(beat);
      if (beat.fires && 'event' in beat.fires) count += 1;
    }
    if (beat.camera === 'reveal_card') revealCard();
    else if (beat.autoAdvance && index + 1 < beats.length) begin(index + 1, count);
    else setPhase('done');
  };

  const next = () => {
    if (index + 1 < beats.length) begin(index + 1, guide.stepCount);
    else setIndex(beats.length);
  };

  const back = () => {
    const target = finished ? beats.length - 1 : phase === 'done' ? index : Math.max(0, index - 1);
    guide.rewindTo(marks.current[target] ?? 0);
    begin(target, marks.current[target] ?? 0);
  };

  const restart = () => {
    guide.rewindTo(0);
    begin(0, 0);
  };

  // Caption: the beat's narration while it plays; the pipeline's own caption once its event has fired.
  const ctx = { config, view, cast, vars: { firstName: patient.first, ...copy.slot } };
  const showEngineCaption = (phase === 'reveal' || phase === 'done') && Boolean(beat?.fires);
  const fallback = finished ? render(tour.outro[view], ctx) : beat ? render(beat.caption[view], ctx) : render(tour.intro[view], ctx);
  const caption =
    showEngineCaption && guide.currentStep
      ? view === 'internal'
        ? guide.currentStep.captionInternal
        : guide.currentStep.captionClient
      : fallback;
  const autoMs = phase === 'done' && !finished ? readMs(caption) : null;

  // Move on by itself once the caption has been read. Back, Restart, or Next cancel it (the beat changes).
  useEffect(() => {
    if (autoMs === null) return;
    const timer = window.setTimeout(next, autoMs);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoMs, index]);

  const boardTarget = phase === 'board' && beat ? BOARD_TARGETS[beat.demo] : undefined;
  const boardHint =
    beat?.demo === 'opportunity_notes'
      ? copy.opportunityModal.hints.openCard
      : beat?.demo === 'crm_call'
        ? fill(copy.call.hints.phone, { firstName: patient.first })
        : fill(copy.contactPanel.hints.openName, { firstName: patient.first });
  const openDemo = () => {
    if (beat && WIDE_DEMOS.has(beat.demo)) {
      // Pull back to the whole CRM, then the replica pops out of it.
      setWide(true);
      setPhase('settle');
      later(reducedMotion ? 0 : POP_OUT_MS, () => setPhase('demo'));
    } else {
      setPhase('demo');
    }
  };
  /** A wide replica is done: push back in to the pipeline first, so the card moves where the viewer can follow it. */
  const pushInThenComplete = () => {
    setPhase('settle');
    setWide(false);
    later(reducedMotion ? 0 : PUSH_MS, complete);
  };
  const cardActions =
    phase === 'board' && beat
      ? beat.demo === 'opportunity_notes'
        ? { onOpen: openDemo }
        : beat.demo === 'crm_call'
          ? { onCall: openDemo }
          : { onOpenName: openDemo }
      : undefined;

  const demo = phase === 'demo' && beat ? beat.demo : null;
  const launch = phase === 'launch' && beat ? PRACTICE_APP[beat.demo] : undefined;
  // A text conversation plays in its beat, then stays on screen while the viewer opens the Practice App.
  const threadBeat = demo && THREADS.has(demo) ? beat : launch && beats[index - 1] && THREADS.has(beats[index - 1].demo) ? beats[index - 1] : null;
  const threadLines = (b: TourBeat): ThreadLine[] => {
    // Both threads open with the first text of the card's stage, as the engine just sent it.
    const series = config.series.find((s) => s.stageId === guide.engine.card?.stage);
    const text = series?.texts[0];
    const sent: ThreadLine[] =
      series && text ? [{ from: 'practice', text: render(text.message, ctx), example: series.exampleMessages, automatic: true }] : [];
    if (b.demo === 'patient_reply') {
      return [
        ...sent,
        { from: 'patient', text: copy.reply.message },
        { from: 'practice', text: fill(copy.reply.offer, copy.slot), typed: true },
        { from: 'patient', text: copy.reply.answer },
      ];
    }
    return [...sent, { from: 'patient', text: copy.reply.nurtureAnswer }];
  };
  // A time lapse runs to the day its timer ends (story-only days: to the next day).
  const lapseTimer =
    beat?.fires && 'skipUntil' in beat.fires
      ? Object.entries(guide.engine.timers).find(([id]) => config.timerById[id].firesEvent === (beat.fires as { skipUntil: string }).skipUntil)?.[1]
      : undefined;
  const lapseEnd = lapseTimer ? lapseTimer.expiresOn + storyDays : shownDay + 1;

  return (
    <>
      <GhlAppFrame
        focused={!wide}
        contentRef={contentRef}
        zoomTo={zoomTo}
        browserBar={demo === 'crm_call' ? <ChromeMicPrompt asking={!micAllowed} onAllow={() => setMicAllowed(true)} /> : undefined}
        popover={demo === 'crm_call' ? <CrmCall connected={micAllowed} onComplete={pushInThenComplete} /> : undefined}
      >
        <GhlViewTabs day={guide.engine.card ? shownDay : null} />
        <Board
          engine={guide.engine}
          currentStep={guide.currentStep}
          animatedStep={guide.animatedStep}
          onOpenStage={(stageId) =>
            setPanel({ stageId, eventId: guide.engine.card?.stage === stageId ? guide.engine.card.arrivedVia : null })
          }
          spotlight={phase === 'board'}
          cardActions={cardActions}
          showLanes={false}
        />
        {boardTarget && (
          <AssistPointer
            containerRef={contentRef}
            getTarget={() => contentRef.current?.querySelector(boardTarget)}
            targetKey={`${beat?.id}-${boardTarget}`}
            hint={boardHint}
          />
        )}
        {threadBeat && (
          <TextThread
            key={threadBeat.id}
            lines={threadLines(threadBeat)}
            day={shownDay}
            contentRef={contentRef}
            onComplete={demo === threadBeat.demo ? complete : undefined}
          />
        )}
      </GhlAppFrame>

      {demo === 'web_form' && <WebFormLead fullscreen intro={playIntro} closeLabel={copy.tour.exit} onComplete={complete} onSkip={complete} onCancel={onExit} />}
      {demo === 'opportunity_notes' && (
        <OpportunityModal engine={guide.engine} onComplete={complete} onCancel={() => setPhase('board')} />
      )}
      {demo === 'contact_panel' && <ContactPanel engine={guide.engine} onComplete={complete} onCancel={() => setPhase('board')} />}
      {(demo === 'time_lapse' || demo === 'consult_day') && beat?.lapse && (
        <TimeLapse
          fromDay={shownDay}
          toDay={lapseEnd}
          text={{
            title: render(beat.lapse.title[view], ctx),
            body: render(beat.lapse.body[view], ctx),
            // After days that move the card, "See what happens"; story-only days move on by themselves.
            continue: beat.fires ? copy.timeLapse.continue : undefined,
            hint: beat.fires ? copy.timeLapse.hint : undefined,
          }}
          sunFaces={beat.lapse.sunFaces}
          onComplete={complete}
        />
      )}
      {(demo === 'ehr_new_appointment' || demo === 'ehr_book_procedure') && (
        // The consultation is the slot offered for tomorrow; the procedure is a couple of weeks out.
        <EhrNewAppointment
          kind={demo === 'ehr_book_procedure' ? 'procedure' : 'consult'}
          day={shownDay + (demo === 'ehr_book_procedure' ? PROCEDURE_IN_DAYS : 1)}
          onComplete={complete}
          onSkip={complete}
          onCancel={() => {}}
        />
      )}
      {demo === 'ehr_checkout' && <EhrCheckout onComplete={complete} onSkip={complete} onCancel={() => {}} />}

      <div ref={dockRef} className={styles.dock} data-dock>
        {launch && (
          <AppDock
            hint={fill(copy.appDock.hints[launch], { firstName: patient.first })}
            avoid={threadBeat ? '[role="log"]' : undefined}
            onOpen={() => setPhase('demo')}
          />
        )}
        <CaptionBar
          step={showEngineCaption ? guide.currentStep : null}
          fallback={fallback}
          onWhy={(stageId, eventId) => setPanel({ stageId, eventId })}
        />
        <div className={styles.controls}>
          <span className={styles.progress}>
            {finished ? (
              copy.tour.finished
            ) : beat ? (
              <>
                {fill(copy.tour.stepOf, { n: index + 1, total: beats.length })}
                <span className={styles.beatTitle}>{beat.title}</span>
              </>
            ) : null}
          </span>
          <ol className={styles.dots} aria-hidden="true">
            {beats.map((b, i) => (
              <li key={b.id} className={i < index || finished ? styles.dotDone : i === index ? styles.dotNow : styles.dot} />
            ))}
          </ol>
          <button type="button" className={styles.secondary} onClick={back} disabled={index === 0 && phase !== 'done'}>
            <ArrowLeft size={16} aria-hidden="true" />
            {copy.tour.back}
          </button>
          <button type="button" className={styles.secondary} onClick={restart}>
            <RotateCcw size={16} aria-hidden="true" />
            {copy.tour.restart}
          </button>
          {!finished && (
            <button
              key={`${index}-${phase}`}
              type="button"
              className={`${styles.primary} ${autoMs !== null ? styles.auto : ''}`}
              style={autoMs !== null ? ({ '--auto-ms': `${autoMs}ms` } as CSSProperties) : undefined}
              onClick={next}
              disabled={phase !== 'done'}
            >
              {index + 1 < beats.length ? copy.tour.next : copy.tour.finish}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {panel && (
        <StageDetailPanel stage={config.stageById[panel.stageId]} highlightEventId={panel.eventId} onClose={() => setPanel(null)} />
      )}
    </>
  );
}
