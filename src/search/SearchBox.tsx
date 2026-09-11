import { useMemo, useState } from 'react';
import type { AnyBlock } from '../content/types';
import type { ResolvedConfig } from '../config';
import type { Route } from '../app/route';
import { useManual } from '../app/context';
import { createSearchIndex, search, type SearchHit } from './index';

export function SearchBox<L extends string, B extends AnyBlock>({
  config,
  route,
  onNavigate,
}: {
  config: ResolvedConfig<L, B>;
  route: Route<L>;
  onNavigate: (next: Route<L>) => void;
}) {
  const { strings } = useManual();
  const [query, setQuery] = useState('');

  const searchIndex = useMemo(() => createSearchIndex(config.content, config.registry), [config]);
  // Skips building (and caching) this locale's entries entirely when search is
  // disabled, rather than discarding the work after an early return below —
  // an early return here would change how many hooks run and break the rules
  // of hooks.
  const entries = useMemo(
    () => (config.search.enabled ? searchIndex.entriesFor(route.locale) : []),
    [searchIndex, route.locale, config.search.enabled],
  );
  const hits = useMemo(
    () => search(entries, query, config.search),
    [entries, query, config.search],
  );

  if (!config.search.enabled) return null;

  const trimmed = query.trim();
  const showResults = trimmed.length > 0;

  const onHitClick = (hit: SearchHit) => {
    onNavigate({
      locale: route.locale,
      chapterId: hit.chapterId,
      sectionId: hit.sectionId,
    });
    setQuery('');
  };

  return (
    <div className="search">
      <input
        className="search-input"
        type="search"
        value={query}
        placeholder={strings.searchPlaceholder}
        aria-label={strings.searchPlaceholder}
        onChange={(event) => setQuery(event.target.value)}
      />

      {showResults && (
        <div className="search-results">
          {trimmed.length < config.search.minQueryLength && (
            <p className="search-note">{strings.searchHint}</p>
          )}

          {trimmed.length >= config.search.minQueryLength && hits.length === 0 && (
            config.slots.renderSearchEmpty
              ? config.slots.renderSearchEmpty({ ...route, query: trimmed })
              : <p className="search-note">{strings.searchEmpty}</p>
          )}

          {hits.map((hit, index) => (
            <button
              key={`${hit.chapterId}-${hit.sectionId ?? ''}-${index}`}
              type="button"
              className="search-hit"
              onClick={() => onHitClick(hit)}
            >
              <span className="search-hit-where">
                {hit.chapterTitle}
                {hit.sectionTitle ? ` · ${hit.sectionTitle}` : ''}
              </span>
              <span className="search-hit-snippet">{hit.snippet}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
