import { describe, expect, it } from 'vitest';
import { nextExplicitTheme } from './theme';

describe('nextExplicitTheme', () => {
  it('flips an explicit choice to the other mode', () => {
    expect(nextExplicitTheme('light', false)).toBe('dark');
    expect(nextExplicitTheme('light', true)).toBe('dark');
    expect(nextExplicitTheme('dark', false)).toBe('light');
    expect(nextExplicitTheme('dark', true)).toBe('light');
  });

  it('leaves system mode for whatever the OS is not showing', () => {
    // A dark OS means the visible mode is dark, so the first click must go
    // light — not "to dark", which would look broken.
    expect(nextExplicitTheme('system', true)).toBe('light');
    expect(nextExplicitTheme('system', false)).toBe('dark');
  });
});
