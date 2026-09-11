/**
 * The stylesheet's build entry. Importing CSS from here is what makes Vite
 * emit `dist/styles.css`; nothing imports this module at runtime, which is
 * why it exports a marker rather than nothing at all (an empty module is
 * tree-shaken away, and the CSS with it).
 */
import './manual.css';

export const STYLES_INCLUDED = true;
