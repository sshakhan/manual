import { useEffect, useState } from 'react';

/**
 * Which section the reader is currently looking at, for highlighting in the
 * rail.
 *
 * **It reports, it does not route.** Writing the hash from here would scroll
 * the page — `useSectionScroll` reacts to every route change — and that scroll
 * would move the observer onto the next heading, which would write the hash
 * again. The rail highlights; a click is what navigates.
 *
 * [routedId] is the section the route names, and it is the starting answer
 * rather than a hint. The observer cannot supply one at that moment: a clicked
 * heading is scrolled to `scroll-margin-top`, which is above the band below,
 * so it is not intersecting anything and the link the reader just pressed
 * stayed unmarked until they scrolled it back into view.
 *
 * `IntersectionObserver` is absent in jsdom and in older webviews, so its
 * absence is a supported state: the rail then shows exactly the routed section
 * and never moves.
 */
export function useActiveSection(
  ids: string[],
  routedId?: string,
): string | undefined {
  const [activeId, setActiveId] = useState<string | undefined>(routedId);

  // The ids are rebuilt on every render (a fresh array each time), so the
  // effect keys on their contents rather than on the array's identity.
  const key = ids.join('|');

  useEffect(() => {
    // Every navigation lands here — a new chapter, or a new section of this
    // one — and the route is the truth until the reader scrolls away from it.
    setActiveId(routedId);

    if (typeof IntersectionObserver === 'undefined') return;

    const headings = ids
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return;

    // Everything currently on screen, in document order — `entries` only
    // carries what changed, so the set has to be kept across callbacks.
    const visible = new Set<string>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }

        // The topmost visible heading, so a section stays marked while its
        // body is read — the heading itself has long since scrolled past.
        const first = headings.find((heading) => visible.has(heading.id));
        if (first) setActiveId(first.id);
      },
      {
        // A band across the upper third of the viewport: a heading counts as
        // "being read" once it reaches it, not when it grazes the bottom edge.
        //
        // **The band has to start at the very top.** It used to start 80px
        // down, below the 24px `scroll-margin-top` a clicked heading lands on
        // — so the section the reader had just navigated to was outside the
        // band. On a short section the *next* heading was inside it instead,
        // and the observer would fire immediately and move the highlight off
        // the section that was actually on screen.
        rootMargin: '0px 0px -66% 0px',
        threshold: 0,
      },
    );

    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, routedId]);

  return activeId;
}
