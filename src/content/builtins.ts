/**
 * The two locales both existing manuals are written in.
 *
 * They live here, apart from the generic machinery, because they are a
 * *convenience* rather than a constraint: a consumer that declares
 * `['ru', 'kk']` gets labels and chrome for free, and a consumer that declares
 * anything else supplies its own. Nothing in the library branches on these
 * values.
 */
export const BUILTIN_LOCALES = ['ru', 'kk'] as const;

export type BuiltinLocale = (typeof BUILTIN_LOCALES)[number];

/**
 * A language's own name is never translated. The Kazakh one is spelled the way
 * the apps themselves spell it (`profileLanguageKazakh` in the delivery app's
 * `l10n`), so a reader meets one name for the language rather than two.
 */
export const BUILTIN_LOCALE_LABELS: Record<BuiltinLocale, string> = {
  ru: 'Русский',
  kk: 'Қазақ тілі',
};
