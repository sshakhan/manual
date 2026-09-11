import { describe, expect, it } from 'vitest';
import { VERSION } from './index';

describe('package scaffold', () => {
  it('exports its version', () => {
    expect(VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it('runs in a DOM environment', () => {
    expect(typeof document).toBe('object');
    expect(document.createElement('div')).toBeInstanceOf(HTMLElement);
  });
});
