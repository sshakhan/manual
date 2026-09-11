import { beforeEach, describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { useRoute } from './useRoute';
import { resolveConfig } from '../config';
import type { Chapter, Manifest } from '../content/types';
import type { BuiltinBlock } from '../content/types';

type L = 'ru' | 'kk';

const manifest: Manifest<L> = {
  version: 1,
  locales: ['ru', 'kk'],
  chapters: [
    { id: 'start', file: '01-start.json' },
    { id: 'payment', file: '02-payment.json' },
  ],
};

const chapters = {
  '../content/ru/01-start.json': { default: { id: 'start', title: 'Н', blocks: [] } as Chapter<BuiltinBlock> },
  '../content/ru/02-payment.json': { default: { id: 'payment', title: 'О', blocks: [] } as Chapter<BuiltinBlock> },
};

const config = (routing: 'hash' | 'memory') =>
  resolveConfig({ root: document.createElement('div'), brand: 'T', manifest, chapters, routing });

beforeEach(() => {
  window.location.hash = '';
  window.localStorage.clear();
});

describe('useRoute in memory mode', () => {
  it('starts at the fallback locale and the first chapter', () => {
    const { result } = renderHook(() => useRoute(config('memory')));
    expect(result.current.route).toEqual({ locale: 'ru', chapterId: 'start', sectionId: undefined });
  });

  it('navigates without touching the URL', () => {
    const { result } = renderHook(() => useRoute(config('memory')));
    act(() => result.current.navigate({ locale: 'ru', chapterId: 'payment' }));
    expect(result.current.route.chapterId).toBe('payment');
    expect(window.location.hash).toBe('');
  });

  it('switches locale and keeps the chapter', () => {
    const { result } = renderHook(() => useRoute(config('memory')));
    act(() => result.current.navigate({ locale: 'ru', chapterId: 'payment' }));
    act(() => result.current.setLocale('kk'));
    expect(result.current.route).toMatchObject({ locale: 'kk', chapterId: 'payment' });
  });
});

describe('useRoute in hash mode', () => {
  it('normalises an empty hash into a shareable one', () => {
    renderHook(() => useRoute(config('hash')));
    expect(window.location.hash).toBe('#/ru/start');
  });

  it('reads an existing hash rather than overwriting it', () => {
    window.location.hash = '#/kk/payment/qr';
    const { result } = renderHook(() => useRoute(config('hash')));
    expect(result.current.route).toEqual({ locale: 'kk', chapterId: 'payment', sectionId: 'qr' });
  });

  it('follows a hashchange the reader caused', () => {
    const { result } = renderHook(() => useRoute(config('hash')));
    act(() => {
      window.location.hash = '#/kk/payment';
      window.dispatchEvent(new HashChangeEvent('hashchange'));
    });
    expect(result.current.route).toMatchObject({ locale: 'kk', chapterId: 'payment' });
  });

  it('remembers the chosen locale per manual, not globally', () => {
    const { result } = renderHook(() => useRoute(config('hash')));
    act(() => result.current.setLocale('kk'));
    expect(window.localStorage.getItem('manual-kit:locale:t')).toBe('kk');
  });

  it('survives localStorage throwing, just without memory', () => {
    const getItem = window.localStorage.getItem;
    window.localStorage.getItem = () => { throw new Error('denied'); };
    try {
      const { result } = renderHook(() => useRoute(config('hash')));
      expect(result.current.route.locale).toBe('ru');
    } finally {
      window.localStorage.getItem = getItem;
    }
  });
});
