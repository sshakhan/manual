import { describe, expect, it } from 'vitest';
import { anchorResolver, parseHash, routeHref } from './route';

const options = { locales: ['ru', 'kk'] as const, fallback: 'ru' as const, defaultChapterId: 'start' };

describe('routeHref', () => {
  it('writes locale and chapter', () => {
    expect(routeHref({ locale: 'ru', chapterId: 'payment' })).toBe('#/ru/payment');
  });

  it('appends a section when there is one', () => {
    expect(routeHref({ locale: 'kk', chapterId: 'payment', sectionId: 'qr' }))
      .toBe('#/kk/payment/qr');
  });
});

describe('parseHash', () => {
  it('reads a full hash', () => {
    expect(parseHash('#/kk/payment/qr', options))
      .toEqual({ locale: 'kk', chapterId: 'payment', sectionId: 'qr' });
  });

  it('defaults an empty hash to the fallback locale and first chapter', () => {
    expect(parseHash('', options))
      .toEqual({ locale: 'ru', chapterId: 'start', sectionId: undefined });
  });

  it('falls back on an undeclared locale rather than routing to nothing', () => {
    expect(parseHash('#/de/payment', options).locale).toBe('ru');
  });

  it('tolerates a missing leading slash and doubled slashes', () => {
    expect(parseHash('#kk//payment', options))
      .toEqual({ locale: 'kk', chapterId: 'payment', sectionId: undefined });
  });

  it('uses the locale list it is given, not a library constant', () => {
    const en = { locales: ['en', 'fr'] as const, fallback: 'en' as const, defaultChapterId: 'intro' };
    expect(parseHash('#/fr/setup', en).locale).toBe('fr');
    expect(parseHash('#/ru/setup', en).locale).toBe('en');
  });
});

describe('anchorResolver', () => {
  const resolve = anchorResolver({ locale: 'ru', chapterId: 'payment' });

  it('keeps a bare section in the current chapter', () => {
    expect(resolve('qr')).toBe('#/ru/payment/qr');
  });

  it('crosses to another chapter when the target names one', () => {
    expect(resolve('refunds/partial')).toBe('#/ru/refunds/partial');
  });

  it('keeps the current locale when crossing chapters', () => {
    expect(anchorResolver({ locale: 'kk', chapterId: 'a' })('b/c')).toBe('#/kk/b/c');
  });
});
