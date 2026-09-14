/**
 * Every validator message, in one place.
 *
 * The reference implementation (`evrika-cashier-desktop/manual/scripts/
 * validate-content.ts`) writes these inline, in Russian — the people who run
 * `npm run validate` are the ones writing the content, and they already know
 * these strings. Centralising them as functions keeps the wording exact while
 * keeping it out of the checking logic.
 */

export function missingFile(locale: string, file: string): string {
  return `${locale}/${file}: файла нет, а он объявлен в manifest.json`;
}

export function schemaError(
  locale: string,
  file: string,
  instancePath: string,
  message: string,
): string {
  return `${locale}/${file}${instancePath}: ${message}`;
}

export function idMismatch(locale: string, file: string, actualId: string, expectedId: string): string {
  return `${locale}/${file}: id «${actualId}» не совпадает с manifest («${expectedId}»)`;
}

export function duplicateAnchor(locale: string, file: string, anchor: string): string {
  return `${locale}/${file}: якорь «${anchor}» повторяется`;
}

export function mediaMissing(chapterId: string, ref: string): string {
  return `${chapterId}: файла «${ref}» нет в content/media`;
}

export function mediaOrphan(file: string): string {
  return `media/${file}: файл есть, но его никто не показывает — удалите или используйте`;
}

export function linkMissingChapter(locale: string, chapterId: string, targetChapter: string): string {
  return `${locale}/${chapterId}: ссылка на несуществующую главу «${targetChapter}»`;
}

export function linkMissingAnchor(
  locale: string,
  chapterId: string,
  target: string,
  targetChapter: string,
  targetSection: string,
): string {
  return `${locale}/${chapterId}: ссылка «${target}» — в главе «${targetChapter}» нет якоря «${targetSection}»`;
}

export function blockCountMismatch(
  locale: string,
  file: string,
  otherCount: number,
  baseLocale: string,
  baseCount: number,
): string {
  return `${locale}/${file}: блоков ${otherCount}, в ${baseLocale} — ${baseCount}`;
}

export function blockTypeMismatch(
  locale: string,
  file: string,
  index: number,
  mirrorType: string,
  baseLocale: string,
  baseType: string,
): string {
  return `${locale}/${file}: блок #${index} — «${mirrorType}», в ${baseLocale} — «${baseType}»`;
}

export function blockAnchorMismatch(
  locale: string,
  file: string,
  index: number,
  mirrorId: string | undefined,
  baseLocale: string,
  baseId: string | undefined,
): string {
  return `${locale}/${file}: блок #${index} — якорь «${mirrorId ?? '—'}», в ${baseLocale} — «${baseId ?? '—'}»`;
}

/**
 * Replaces the `never`-exhaustiveness guard the closed union used to give
 * for free: an open registry cannot reject an unknown type at compile time,
 * so this is the run-time check that catches it instead.
 */
export function unknownBlockType(locale: string, file: string, type: string): string {
  return `${locale}/${file}: неизвестный тип блока «${type}» — его не рисует ни один spec`;
}

/**
 * `createContentSource` keys modules by their trailing `<locale>/<file>`, so a
 * `file` naming a subdirectory loses its locale segment and the chapter reads
 * as untranslated in *every* locale — a deceptive failure that belongs here,
 * where the message can name the cause.
 */
export function badFilename(file: string): string {
  return `${file}: имя файла главы не должно содержать «/» — путь ломает сопоставление локалей`;
}
