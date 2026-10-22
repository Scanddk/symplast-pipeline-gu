import { ArrowRight, BookOpen, Check, Clock, KanbanSquare, MessageSquareText, type LucideIcon } from 'lucide-react';
import type { Lesson } from '../../../schema/lesson.ts';
import logoUrl from '../assets/symplast-logomark.svg';
import { useGuideContext } from '../GuideContext.tsx';
import styles from './LessonMenu.module.css';

const ICONS: Record<Lesson['icon'], LucideIcon> = {
  board: KanbanSquare,
  texts: MessageSquareText,
  reference: BookOpen,
};

/** The main menu: a branded hero, then one card per lesson. Coming-soon lessons show but can't be opened. */
export function LessonMenu({ lessons, onOpen }: { lessons: Lesson[]; onOpen: (lessonId: string) => void }) {
  const { config, fill } = useGuideContext();
  const { menu } = config.copy;

  /** A short count for each lesson, taken from its content. */
  const meta = (lesson: Lesson) =>
    lesson.tour
      ? fill(menu.steps, { count: lesson.tour.beats.length })
      : lesson.chapters
        ? fill(menu.chapters, { count: lesson.chapters.length })
        : fill(menu.stages, { count: config.stages.length });

  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>{menu.title}</h1>
          <p className={styles.heroIntro}>{menu.intro}</p>
        </div>
        <img className={styles.heroLogo} src={logoUrl} alt="" aria-hidden="true" />
        <div className={styles.heroBoard} aria-hidden="true">
          {[0, 1, 2, 3].map((i) => (
            <span key={i} className={styles.heroColumn}>
              <i />
              <i />
              {i === 1 && <b className={styles.heroCard} />}
            </span>
          ))}
        </div>
      </section>

      <ul className={styles.grid}>
        {lessons.map((lesson, i) => {
          const Icon = ICONS[lesson.icon];
          const available = lesson.status === 'available';
          const titleId = `lesson-${lesson.id}`;
          return (
            <li key={lesson.id} className={`${styles.card} ${styles[lesson.icon]} ${available ? '' : styles.soon}`} aria-labelledby={titleId}>
              <div className={styles.top} aria-hidden="true">
                <div className={styles.art}>
                  <Art kind={lesson.icon} />
                </div>
                <span className={styles.badge}>
                  <Icon size={18} strokeWidth={2} />
                </span>
              </div>
              <div className={styles.cardBody}>
                <p className={styles.number}>
                  {fill(menu.lessonNumber, { n: i + 1 })}
                  <span className={styles.dot} />
                  {available ? (
                    meta(lesson)
                  ) : (
                    <span className={styles.soonLabel}>
                      <Clock size={12} aria-hidden="true" />
                      {menu.comingSoon}
                    </span>
                  )}
                </p>
                <h2 id={titleId} className={styles.title}>
                  {lesson.title}
                </h2>
                <p className={styles.summary}>{lesson.summary}</p>
                <h3 className={styles.learnHeading}>{menu.learnHeading}</h3>
                <ul className={styles.learn}>
                  {lesson.learn.map((item) => (
                    <li key={item}>
                      <Check size={14} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                {available && (
                  <button type="button" className={styles.start} onClick={() => onOpen(lesson.id)} aria-describedby={titleId}>
                    {menu.start}
                    <ArrowRight size={16} aria-hidden="true" />
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Small illustration for each lesson card, drawn with CSS. */
function Art({ kind }: { kind: Lesson['icon'] }) {
  if (kind === 'board')
    return (
      <div className={styles.artBoard}>
        {[0, 1, 2].map((i) => (
          <span key={i} className={styles.artColumn}>
            <i />
            {i === 0 && <b />}
            <i />
          </span>
        ))}
        <span className={styles.artPath} />
      </div>
    );
  if (kind === 'texts')
    return (
      <div className={styles.artTexts}>
        <span className={styles.artCheck}>
          <Check size={12} />
        </span>
        <span className={styles.artBubble} />
        <span className={styles.artBubbleSmall} />
        <span className={styles.artBubbleReply} />
      </div>
    );
  return (
    <div className={styles.artList}>
      {[0, 1, 2, 3].map((i) => (
        <span key={i} className={styles.artRow}>
          <b />
          <i />
        </span>
      ))}
    </div>
  );
}
