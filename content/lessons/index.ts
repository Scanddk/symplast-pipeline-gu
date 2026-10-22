import { Lesson } from '../../schema/lesson.ts';
import { lessons as rawLessons } from './lessons.ts';

/** Main-menu lessons, validated. */
export const lessons = rawLessons.map((l) => Lesson.parse(l));
