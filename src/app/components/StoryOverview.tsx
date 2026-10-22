import type { CSSProperties } from 'react';
import { ArrowRight, Ban, Check, Hourglass, LockOpen, MapPin, MessageCircle, Send } from 'lucide-react';
import type { Scenario } from '../../../schema/scenario.ts';
import { useGuideContext } from '../GuideContext.tsx';
import { RuleIdTag, VerificationBadge } from './Badges.tsx';
import styles from './StoryOverview.module.css';

/**
 * Opening screen of the texts lesson: a hero with an example text and its two checks, where texts happen in the
 * pipeline, each texting stage with its example timeline, the check as a diagram, and the chapters.
 * Everything comes from content: stages, series, the check rule, and the chapter scenarios.
 */
export function StoryOverview({ chapters, onOpen }: { chapters: Scenario[]; onOpen: (chapter: number) => void }) {
  const { config, t, fill } = useGuideContext();
  const { story, markers, lane } = config.copy;
  const { questions } = config.checkpoint;
  const texting = new Set(config.series.map((s) => s.stageId));
  // The hero shows the first text of the set chapter 1 opens with.
  const heroSeries = config.seriesById[chapters[0]?.focusSeries ?? ''] ?? config.series[0];
  const heroStage = config.stageById[heroSeries.stageId];
  const heroText = heroSeries.texts[0];

  return (
    <div className={styles.overview}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          {/* Published research on lead follow-up, with its sources below. */}
          <ul className={styles.stats}>
            {story.heroStats.map((stat) => (
              <li key={stat.value + stat.label} className={styles.stat}>
                <strong>{stat.value}</strong>
                <span>
                  {stat.label}
                  <sup>{stat.source}</sup>
                </span>
              </li>
            ))}
          </ul>
          <h2 className={styles.heroTitle}>{story.heroHeadline}</h2>
          <p className={styles.heroBody}>
            {fill(story.heroTitle.before, { count: config.series.length })}{' '}
            <span className={styles.emphasis}>{story.heroTitle.emphasis}</span> {story.heroTitle.after}
          </p>
          <button type="button" className={styles.heroStart} onClick={() => onOpen(0)}>
            {story.startFirst}
            <ArrowRight size={18} aria-hidden="true" />
          </button>
          <p className={styles.sources}>
            {story.heroSourcesLabel}:{' '}
            {story.heroSources.map((source, i) => (
              <span key={source}>
                <sup>{i + 1}</sup> {source}
                {i < story.heroSources.length - 1 ? '; ' : ''}
              </span>
            ))}
          </p>
        </div>
        <div className={styles.heroArt} aria-hidden="true">
          <div className={styles.stack}>
            {[t(questions.inStage, { vars: { stage: heroStage.name } }), t(questions.open)].map((q) => (
              <span key={q} className={styles.pill}>
                <span className={styles.pillTick}>
                  <Check size={12} strokeWidth={3} />
                </span>
                {q}
                <b>{story.yes}</b>
              </span>
            ))}
            <span className={styles.meta}>{fill(story.textMeta, { sender: story.sender, day: heroText.waitDays })}</span>
            <p className={styles.bubble}>
              {t({ client: heroText.message, internal: heroText.message })}
              {heroSeries.exampleMessages && <span className={styles.exampleTag}>{story.exampleMessage}</span>}
            </p>
            <span className={styles.sent}>
              <Check size={13} strokeWidth={3} />
              {lane.states.sent}
            </span>
          </div>
        </div>
      </section>

      <section className={styles.section} aria-labelledby="texting-stages">
        <div className={styles.sectionHead}>
          <h2 id="texting-stages" className={styles.heading}>
            {story.textingStages}
          </h2>
          <p className={styles.note}>
            <span className={styles.example}>{markers.exampleTiming}</span>
            {story.timingNote}
          </p>
        </div>

        <p className={styles.pipelineLabel}>{story.pipelineLabel}</p>
        <ol className={styles.pipeline}>
          {config.stages.map((stage) => (
            <li
              key={stage.id}
              className={texting.has(stage.id) ? styles.chipTexting : styles.chip}
              style={{ '--dot': `var(--stage-dot-${stage.dot})` } as CSSProperties}
            >
              {texting.has(stage.id) && <MessageCircle size={13} aria-hidden="true" />}
              {stage.name}
            </li>
          ))}
        </ol>

        <ul className={styles.stages}>
          {config.series.map((series) => {
            const stage = config.stageById[series.stageId];
            // Day each text goes out, counted from the card's arrival (each wait follows the text before it).
            let day = 0;
            const days = series.texts.map((text) => (day += text.waitDays));
            const last = days[days.length - 1] || 1;
            return (
              <li key={series.id} className={styles.stage} style={{ '--dot': `var(--stage-dot-${stage.dot})` } as CSSProperties}>
                <span className={styles.stageIcon} aria-hidden="true">
                  <MessageCircle size={18} />
                </span>
                <h3 className={styles.stageName}>{stage.name}</h3>
                <p className={styles.purpose}>{t(series.purpose)}</p>
                <div className={styles.timeline}>
                  <p className={styles.timelineHead}>
                    <strong>{fill(story.textCount, { count: series.texts.length })}</strong>
                    <span>{story.timelineLabel}</span>
                  </p>
                  <ol className={styles.track}>
                    {days.map((d, i) => (
                      <li key={series.texts[i].id} style={{ left: `${(d / last) * 100}%` }}>
                        <span className={styles.trackDot} />
                        {fill(story.dayN, { day: d })}
                      </li>
                    ))}
                  </ol>
                </div>
                <span className={styles.badges}>
                  <RuleIdTag id={series.id} />
                  <VerificationBadge verification={series.verification} />
                </span>
              </li>
            );
          })}
        </ul>
      </section>

      <section className={styles.section} aria-labelledby="the-check">
        <div className={styles.sectionHead}>
          <h2 id="the-check" className={styles.heading}>
            {story.theCheck}
          </h2>
          <span className={styles.badges}>
            <RuleIdTag id={config.checkpoint.id} />
            <VerificationBadge verification={config.checkpoint.verification} />
          </span>
        </div>
        <p className={styles.rule}>{t(config.checkpoint.wording)}</p>
        <ol className={styles.flow}>
          <li className={styles.node}>
            <span className={styles.nodeIcon}>
              <Hourglass size={18} aria-hidden="true" />
            </span>
            {story.flowWait}
          </li>
          {[
            { icon: MapPin, label: t(questions.inStage, { vars: { stage: story.thisStage } }) },
            { icon: LockOpen, label: t(questions.open) },
          ].map(({ icon: Icon, label }, i) => (
            <li key={label} className={`${styles.node} ${styles.question}`}>
              {/* The wait always leads to the first question; only a passed question leads on with "Yes". */}
              {i > 0 && <span className={styles.yes}>{story.yes}</span>}
              <span className={styles.nodeIcon}>
                <Icon size={18} aria-hidden="true" />
              </span>
              {label}
              <span className={styles.no}>{story.no}</span>
            </li>
          ))}
          <li className={`${styles.node} ${styles.sends}`}>
            <span className={styles.yes}>{story.yes}</span>
            <span className={styles.nodeIcon}>
              <Send size={18} aria-hidden="true" />
            </span>
            {story.flowSends}
          </li>
        </ol>
        <p className={styles.skipped}>
          <span className={styles.nodeIcon}>
            <Ban size={18} aria-hidden="true" />
          </span>
          {story.flowSkipped}
        </p>
      </section>

      <section className={styles.section} aria-labelledby="chapters">
        <h2 id="chapters" className={styles.heading}>
          {story.inThisLesson}
        </h2>
        <ol className={styles.chapters}>
          {chapters.map((chapter, i) => (
            <li key={chapter.id}>
              <button type="button" className={styles.chapter} onClick={() => onOpen(i)}>
                <span className={styles.chapterNumber}>{i + 1}</span>
                <span className={styles.chapterText}>
                  <small>{i === 0 ? story.startHere : fill(story.chapterN, { n: i + 1 })}</small>
                  {chapter.title}
                </span>
                <ArrowRight size={18} className={styles.chapterArrow} aria-hidden="true" />
              </button>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
