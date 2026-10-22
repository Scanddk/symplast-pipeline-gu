import { useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, RotateCcw } from 'lucide-react';
import { playScenario, render } from '../../../engine/index.ts';
import type { Lesson } from '../../../schema/lesson.ts';
import type { Scenario } from '../../../schema/scenario.ts';
import { scenarios } from '../../../content/scenarios/index.ts';
import { GuideProvider, useGuideContext } from '../GuideContext.tsx';
import { useEstablishingShot } from '../hooks/useEstablishingShot.ts';
import { GhlAppFrame } from './GhlAppFrame.tsx';
import { GhlViewTabs } from './GhlViewTabs.tsx';
import { Board } from './Board.tsx';
import { TextOverlay } from './TextOverlay.tsx';
import { CaptionBar } from './CaptionBar.tsx';
import { StoryOverview } from './StoryOverview.tsx';
import { StageDetailPanel } from './StageDetailPanel.tsx';
import styles from './StoryLesson.module.css';

const OVERVIEW = -1;

/**
 * A guided lesson: an overview, then chapters played on the same GHL-style board as the free-play lesson.
 * Each chapter is a scenario run through the engine; Next and Back move one step at a time, never on a timer.
 */
export function StoryLesson({ lesson }: { lesson: Lesson }) {
  const { config } = useGuideContext();
  const { story } = config.copy;
  const chapters = useMemo(
    () => (lesson.chapters ?? []).map((id) => scenarios.find((s) => s.id === id)!),
    [lesson.chapters],
  );
  const [chapter, setChapter] = useState(OVERVIEW);
  const [panel, setPanel] = useState<{ stageId: string; eventId: string | null } | null>(null);

  return (
    <div className={styles.lesson}>
      {/* The overview has its own chapter cards, so the chapter pills only show inside the chapters. */}
      {chapter !== OVERVIEW && (
        <nav className={styles.nav} aria-label={story.chaptersLabel}>
          <ol>
            <li>
              <button type="button" className={styles.tab} aria-current={chapter === OVERVIEW ? 'step' : undefined} onClick={() => setChapter(OVERVIEW)}>
                {story.overview}
              </button>
            </li>
            {chapters.map((c, i) => (
              <li key={c.id}>
                <button type="button" className={styles.tab} aria-current={chapter === i ? 'step' : undefined} onClick={() => setChapter(i)}>
                  <span className={styles.tabNumber}>{i + 1}</span>
                  {c.title}
                </button>
              </li>
            ))}
          </ol>
        </nav>
      )}

      {chapter === OVERVIEW ? (
        <StoryOverview chapters={chapters} onOpen={setChapter} />
      ) : (
        // Mounted once when leaving the overview, so the opening shot plays then and not on every chapter switch.
        <ChapterStage
          scenario={chapters[chapter]}
          chapterIndex={chapter}
          chapterCount={chapters.length}
          onNextChapter={() => setChapter(chapter + 1)}
          onWhy={(stageId, eventId) => setPanel({ stageId, eventId })}
        />
      )}

      {panel && (
        <StageDetailPanel stage={config.stageById[panel.stageId]} highlightEventId={panel.eventId} onClose={() => setPanel(null)} />
      )}
    </div>
  );
}

type ChapterStageProps = {
  scenario: Scenario;
  chapterIndex: number;
  chapterCount: number;
  onNextChapter: () => void;
  onWhy: (stageId: string, eventId: string | null) => void;
};

/** One chapter on the board: opens on the full GHL app, pushes in to the pipeline, then steps with Next/Back. */
function ChapterStage({ scenario, chapterIndex, chapterCount, onNextChapter, onWhy }: ChapterStageProps) {
  const { config, view, fill } = useGuideContext();
  const { story } = config.copy;
  const { focused, focusNow } = useEstablishingShot(true);
  const contentRef = useRef<HTMLElement>(null);
  const [position, setPosition] = useState({ scenarioId: scenario.id, frame: 0, forward: false });

  // A different chapter starts at its opening frame.
  const current = position.scenarioId === scenario.id ? position : { scenarioId: scenario.id, frame: 0, forward: false };
  const frames = useMemo(() => playScenario(scenario, config), [scenario, config]);
  const frame = frames[current.frame];
  const lastFrame = current.frame === frames.length - 1;
  const lastChapter = chapterIndex === chapterCount - 1;
  const showsText = frame.step?.cues.some((c) => c.type === 'text') ?? false;
  const goTo = (index: number, forward: boolean) => {
    focusNow();
    setPosition({ scenarioId: scenario.id, frame: index, forward });
  };

  return (
    // The chapter's fictional patient appears on the card, in captions, and in the messages.
    <GuideProvider config={config} view={view} cast={scenario.cast}>
      <GhlAppFrame focused={focused} contentRef={contentRef}>
        <GhlViewTabs day={frame.state.day} />
        <Board
          key={scenario.id}
          engine={frame.state}
          currentStep={frame.step}
          animatedStep={current.forward ? frame.step : null}
          onOpenStage={(stageId) => onWhy(stageId, frame.state.card?.stage === stageId ? frame.state.card.arrivedVia : null)}
          showLanes={false}
          spotlight={showsText}
        />
        <TextOverlay step={frame.step} engine={frame.state} frameRef={contentRef} animate={current.forward} />
      </GhlAppFrame>

      <div className={styles.dock} data-dock>
        <CaptionBar
          step={frame.step}
          fallback={scenario.intro ? render(scenario.intro[view], { config, view, cast: scenario.cast }) : undefined}
          onWhy={onWhy}
        />
        <div className={styles.controls}>
          <span className={styles.progress}>{fill(story.chapterOf, { n: chapterIndex + 1, total: chapterCount })}</span>
          <button type="button" className={styles.secondary} onClick={() => goTo(current.frame - 1, false)} disabled={current.frame === 0}>
            <ArrowLeft size={16} aria-hidden="true" />
            {story.back}
          </button>
          <button type="button" className={styles.secondary} onClick={() => goTo(0, false)} disabled={current.frame === 0}>
            <RotateCcw size={16} aria-hidden="true" />
            {story.restart}
          </button>
          {!lastFrame ? (
            <button type="button" className={styles.primary} onClick={() => goTo(current.frame + 1, true)}>
              {story.next}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : !lastChapter ? (
            <button
              type="button"
              className={styles.primary}
              onClick={() => {
                focusNow();
                onNextChapter();
              }}
            >
              {story.nextChapter}
              <ArrowRight size={16} aria-hidden="true" />
            </button>
          ) : (
            <span className={styles.finished}>{story.finished}</span>
          )}
        </div>
      </div>
    </GuideProvider>
  );
}
