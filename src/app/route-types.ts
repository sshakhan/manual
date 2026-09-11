/** Where the reader is. Defined apart from `route.ts` so `config.ts` can name
 *  it without importing the hash-routing machinery. */
export interface RouteContext<L extends string = string> {
  locale: L;
  chapterId: string;
  sectionId?: string;
}
