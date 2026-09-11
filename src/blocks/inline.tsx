import { Fragment, type ReactNode } from 'react';
import type { AnchorResolver } from './registry';

/**
 * The one inline convention the content is allowed to use: `**bold**` and
 * `[label](#anchor)`.
 *
 * Deliberately not Markdown and deliberately not HTML — content is data, and a
 * renderer that accepts arbitrary HTML is a renderer that has to be trusted.
 * Anything richer than these two forms becomes a new block type instead.
 *
 * `#anchor` in the source is a *section id*, never a raw href: routing here is
 * hash-based, so emitting `href="#open-shift"` would overwrite the route rather
 * than scroll within it. [resolveAnchor] turns the id into a full route hash —
 * see `routeHref` in `src/app/route.ts`.
 *
 * Two forms of target, and the second one is not optional sugar:
 *
 * - `#section-id` — a section of the **current** chapter.
 * - `#chapter-id/section-id` — a section of **another** chapter.
 *
 * Without the second form a cross-chapter link is not an error, it is a
 * *wrong* link: it resolves against whatever chapter the reader is in and
 * lands them on a section that does not exist there. `npm run validate`
 * checks every target resolves, which is what stops that shipping again.
 */
const PATTERN = /(\*\*[^*]+\*\*|\[[^\]]+\]\(#[a-z0-9-]+(?:\/[a-z0-9-]+)?\))/g;

export function inline(text: string, resolveAnchor: AnchorResolver): ReactNode {
  const parts = text.split(PATTERN).filter((part) => part !== '');

  return parts.map((part, index) => {
    const bold = /^\*\*([^*]+)\*\*$/.exec(part);
    if (bold?.[1]) return <strong key={index}>{bold[1]}</strong>;

    const link = /^\[([^\]]+)\]\(#([a-z0-9-]+(?:\/[a-z0-9-]+)?)\)$/.exec(part);
    if (link?.[1] && link[2]) {
      return (
        <a key={index} className="inline-link" href={resolveAnchor(link[2])}>
          {link[1]}
        </a>
      );
    }

    return <Fragment key={index}>{part}</Fragment>;
  });
}
