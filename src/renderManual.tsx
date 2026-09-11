import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import type { AnyBlock } from './content/types';
import { resolveConfig, type ManualConfig } from './config';
import { Manual } from './Manual';

/**
 * Mounts a manual. The one call a consumer's `main.tsx` makes.
 *
 * `resolveConfig` runs before `createRoot`, so a config error is a thrown
 * exception at startup rather than a React error boundary swallowing it into a
 * blank page.
 */
export function renderManual<L extends string, B extends AnyBlock>(
  config: ManualConfig<L, B>,
): { unmount(): void } {
  const resolved = resolveConfig(config);
  const root = createRoot(resolved.root);

  root.render(
    <StrictMode>
      <Manual config={resolved} />
    </StrictMode>,
  );

  return { unmount: () => root.unmount() };
}
