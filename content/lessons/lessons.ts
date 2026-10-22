import type { LessonInput } from '../../schema/lesson.ts';
import { howCardsMoveTour } from './how-cards-move-tour.ts';

/**
 * Main-menu lessons, in menu order. All wording here is client-facing:
 * avoid workflow, trigger, enrollment, eligibility, sequence, automation.
 * To add a lesson, add an entry; set status 'available' once its mode exists.
 */
export const lessons: LessonInput[] = [
  {
    id: 'how-cards-move',
    title: 'The Patient Journey',
    summary: 'Follow one patient from a website inquiry to a booked procedure, step by step.',
    learn: [
      'How a website inquiry becomes a card',
      'Where to call, message, and add tasks in Symplast CRM',
      'What moves the card on its own, and what your team moves',
    ],
    icon: 'board',
    status: 'available',
    mode: 'board',
    // A guided tour tells the story; there are no free-play event buttons in this lesson.
    tour: howCardsMoveTour,
  },
  {
    id: 'when-texts-send',
    title: 'Nurture Sequences',
    summary: 'See which stages send texts, the check before each text, and how your team can stop them.',
    learn: [
      'Which stages send texts',
      'Why a text gets skipped',
      'How DND Nurture stops a set of texts',
    ],
    icon: 'texts',
    status: 'available',
    mode: 'story',
    chapters: ['texts_start', 'texts_check', 'texts_closed', 'texts_dnd'],
  },
  {
    id: 'stage-reference',
    title: 'Quick Start Cheat Sheet',
    summary: 'Look up any stage: what it means, how a card gets there, and your part.',
    learn: ['What each stage means', 'Everything that moves a card into it', 'What your team does there'],
    icon: 'reference',
    status: 'available',
    mode: 'reference',
  },
];
