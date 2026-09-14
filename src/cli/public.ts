/**
 * A build-time-validation entry, separate from the main barrel (`index.ts`)
 * and separate from the `manual-kit` CLI itself.
 *
 * `validateContent` pulls in `ajv` and `node:fs`/`node:path`; the main barrel
 * feeds the browser bundle, and neither belongs there. The CLI
 * (`cli/index.ts`) only ever validates with the default registry — a
 * consumer with custom blocks needs the function itself, which is what this
 * module, published as `@evrika/manual-kit/validate`, is for.
 */
export { validateContent } from './validate';
export type { ValidationResult } from './validate';
export { buildSchema } from './schema';
