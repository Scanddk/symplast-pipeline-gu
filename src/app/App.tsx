import { useMemo, useRef, useState } from 'react';
import { getPracticeConfig } from '../../engine/index.ts';
import { practices } from '../../content/practices/index.ts';
import { defaultCast } from '../../content/scenarios/index.ts';
import { lessons } from '../../content/lessons/index.ts';
import type { Lesson, LessonDemo } from '../../schema/lesson.ts';
import { GuideProvider, useGuideContext } from './GuideContext.tsx';
import { useUrlOptions } from './hooks/useUrlOptions.ts';
import { useMediaQuery } from './hooks/useMediaQuery.ts';
import { useGuide } from './hooks/useGuide.ts';
import { useEstablishingShot } from './hooks/useEstablishingShot.ts';
import { AppShell } from './components/AppShell.tsx';
import { GhlViewTabs } from './components/GhlViewTabs.tsx';
import { GhlAppFrame } from './components/GhlAppFrame.tsx';
import { Board } from './components/Board.tsx';
import { CaptionBar } from './components/CaptionBar.tsx';
import { EventsPanel } from './components/EventsPanel.tsx';
import { StageDetailPanel } from './components/StageDetailPanel.tsx';
import { StageList } from './components/StageList.tsx';
import { EhrCheckout } from './components/EhrCheckout.tsx';
import { WebFormLead } from './components/WebFormLead.tsx';
import { LessonMenu } from './components/LessonMenu.tsx';
import { StoryLesson } from './components/StoryLesson.tsx';
import { TourGuide } from './components/TourGuide.tsx';
import styles from './App.module.css';

export function App() {
  const [options, setOptions] = useUrlOptions();
  const { config, unknownPractice } = useMemo(() => {
    const requested = getPracticeConfig(options.practice);
    return { config: requested ?? getPracticeConfig('standard')!, unknownPractice: requested === null };
  }, [options.practice]);
  // Unknown or coming-soon lessons fall back to the menu.
  const lesson = lessons.find((l) => l.id === options.lesson && l.status === 'available') ?? null;
  // The opening shot plays only for lessons opened from the menu, never on page load.
  const [openedFromMenu, setOpenedFromMenu] = useState(false);
  const { copy } = config;

  return (
    <GuideProvider config={config} view={options.view} cast={defaultCast}>
      <AppShell
        title={lesson ? lesson.title : copy.menu.title}
        intro={lesson ? lesson.summary : copy.menu.intro}
        compact={!lesson}
        onBackToMenu={lesson ? () => setOptions({ lesson: null }) : undefined}
        practices={practices}
        unknownPractice={unknownPractice}
        onViewChange={(view) => setOptions({ view })}
        onPracticeChange={(practice) => setOptions({ practice })}
      >
        {lesson ? (
          // A new practice or lesson starts fresh.
          <LessonView
            key={`${lesson.id}-${config.practice.id}`}
            lesson={lesson}
            playIntro={openedFromMenu}
            onExit={() => setOptions({ lesson: null })}
          />
        ) : (
          <LessonMenu
            lessons={lessons}
            onOpen={(id) => {
              setOpenedFromMenu(true);
              setOptions({ lesson: id });
            }}
          />
        )}
      </AppShell>
    </GuideProvider>
  );
}

function LessonView({ lesson, playIntro, onExit }: { lesson: Lesson; playIntro: boolean; onExit: () => void }) {
  const wide = useMediaQuery('(min-width: 1024px)');
  switch (lesson.mode) {
    case 'board':
      if (!wide) return <StageList showNarrowNote />;
      return lesson.tour ? <TourGuide tour={lesson.tour} playIntro={playIntro} onExit={onExit} /> : <WideGuide playIntro={playIntro} demos={lesson.demos ?? {}} />;
    case 'story':
      return <StoryLesson lesson={lesson} />;
    case 'reference':
    default:
      return <StageList />;
  }
}

function WideGuide({ playIntro, demos }: { playIntro: boolean; demos: Record<string, LessonDemo> }) {
  const { config } = useGuideContext();
  const guide = useGuide(config, defaultCast);
  const { focused, focusNow } = useEstablishingShot(playIntro);
  const contentRef = useRef<HTMLElement>(null);
  const [panel, setPanel] = useState<{ stageId: string; eventId: string | null } | null>(null);
  /** The event whose guided demo is open (e.g. checking out in Symplast before the card moves). */
  const [demoEvent, setDemoEvent] = useState<string | null>(null);
  const card = guide.engine.card;
  const currentSeriesId = card ? config.stageById[card.stage]?.seriesId : undefined;

  const openStage = (stageId: string) =>
    setPanel({ stageId, eventId: card && card.stage === stageId ? card.arrivedVia : null });

  return (
    <>
      <GhlAppFrame focused={focused} contentRef={contentRef}>
        <GhlViewTabs day={card ? guide.engine.day : null} />
        <Board
          engine={guide.engine}
          currentStep={guide.currentStep}
          animatedStep={guide.animatedStep}
          onOpenStage={openStage}
        />
      </GhlAppFrame>
      {/* Pinned to the bottom of the screen so the caption and next actions are always in view. */}
      <div className={styles.dock} data-dock>
        <CaptionBar step={guide.currentStep} onWhy={(stageId, eventId) => setPanel({ stageId, eventId })} />
        <EventsPanel
          offered={guide.offered}
          seriesId={currentSeriesId}
          closed={card !== null && card.status !== 'open'}
          canGoBack={guide.canGoBack}
          onFire={(eventId) => {
            focusNow();
            if (demos[eventId]) setDemoEvent(eventId);
            else guide.fire(eventId);
          }}
          onBack={guide.goBack}
          onReset={guide.reset}
        />
      </div>
      {panel && (
        <StageDetailPanel
          stage={config.stageById[panel.stageId]}
          highlightEventId={panel.eventId}
          onClose={() => setPanel(null)}
        />
      )}
      {demoEvent && (
        <Demo
          kind={demos[demoEvent]}
          onComplete={() => {
            setDemoEvent(null);
            guide.fire(demoEvent);
          }}
          onCancel={() => setDemoEvent(null)}
        />
      )}
    </>
  );
}

/** A guided demo shown before an event fires; finishing it (or skipping) fires the event. */
function Demo({ kind, onComplete, onCancel }: { kind: LessonDemo; onComplete: () => void; onCancel: () => void }) {
  switch (kind) {
    case 'ehr_checkout':
      return <EhrCheckout onComplete={onComplete} onSkip={onComplete} onCancel={onCancel} />;
    case 'web_form':
      return <WebFormLead onComplete={onComplete} onSkip={onComplete} onCancel={onCancel} />;
  }
}
