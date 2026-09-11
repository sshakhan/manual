import type { BuiltinLocale } from '../content/builtins';

/**
 * The SPA's own chrome — everything that is not manual content.
 *
 * Kept here rather than in the content JSON: a cashier's manual is the content,
 * and a translator editing chapters should never have to touch a search
 * placeholder to keep the app coherent.
 */
export interface UiStrings {
  languageGroup: string;
  searchPlaceholder: string;
  searchEmpty: string;
  searchHint: string;
  fallbackNotice: string;
  chapterMissing: string;
  onThisPage: string;
  nextChapter: string;
  previousChapter: string;
  openSections: string;
  closeSections: string;
  /** The missing-media placeholder. `{src}` is replaced with the named file. */
  mediaMissing: string;
}

export const UI_STRING_KEYS = [
  'languageGroup', 'searchPlaceholder', 'searchEmpty', 'searchHint',
  'fallbackNotice', 'chapterMissing', 'onThisPage', 'nextChapter',
  'previousChapter', 'openSections', 'closeSections', 'mediaMissing',
] as const satisfies readonly (keyof UiStrings)[];

export const BUILTIN_STRINGS: Record<BuiltinLocale, UiStrings> = {
  ru: {
    languageGroup: 'Язык',
    searchPlaceholder: 'Поиск по руководству',
    searchEmpty: 'Ничего не найдено',
    searchHint: 'Введите хотя бы два символа',
    fallbackNotice: 'Этот раздел ещё не переведён — показан русский текст.',
    chapterMissing: 'Раздел не найден.',
    onThisPage: 'В этом разделе',
    nextChapter: 'Следующий раздел',
    previousChapter: 'Предыдущий раздел',
    openSections: 'Открыть разделы',
    closeSections: 'Закрыть разделы',
    mediaMissing: 'Нет файла: {src}',
  },
  kk: {
    languageGroup: 'Тіл',
    searchPlaceholder: 'Нұсқаулықтан іздеу',
    searchEmpty: 'Ештеңе табылмады',
    searchHint: 'Кемінде екі таңба енгізіңіз',
    fallbackNotice: 'Бұл бөлім әлі аударылмаған — орысша мәтін көрсетілген.',
    chapterMissing: 'Бөлім табылмады.',
    onThisPage: 'Осы бөлімде',
    nextChapter: 'Келесі бөлім',
    previousChapter: 'Алдыңғы бөлім',
    openSections: 'Бөлімдерді ашу',
    closeSections: 'Бөлімдерді жабу',
    mediaMissing: 'Файл жоқ: {src}',
  },
};
