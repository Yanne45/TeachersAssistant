import { describe, it, expect } from 'vitest';
import { computeVirtualScroll } from './virtualScroll';

describe('computeVirtualScroll', () => {
  const defaults = {
    scrollTop: 0,
    viewportHeight: 500,
    rowHeight: 44,
    overscan: 6,
    threshold: 50,
  };

  it('ne virtualise pas si totalCount <= threshold', () => {
    const result = computeVirtualScroll({ ...defaults, totalCount: 30 });
    expect(result.useVirtual).toBe(false);
    expect(result.rowStart).toBe(0);
    expect(result.rowEnd).toBe(30);
    expect(result.topSpacer).toBe(0);
    expect(result.bottomSpacer).toBe(0);
  });

  it('ne virtualise pas à exactement threshold', () => {
    const result = computeVirtualScroll({ ...defaults, totalCount: 50 });
    expect(result.useVirtual).toBe(false);
  });

  it('virtualise au-dessus du threshold', () => {
    const result = computeVirtualScroll({ ...defaults, totalCount: 200 });
    expect(result.useVirtual).toBe(true);
    expect(result.rowStart).toBe(0); // scrollTop=0
    expect(result.rowEnd).toBeLessThan(200);
    expect(result.topSpacer).toBe(0);
    expect(result.bottomSpacer).toBeGreaterThan(0);
  });

  it('calcule correctement après un scroll', () => {
    const result = computeVirtualScroll({
      ...defaults,
      totalCount: 200,
      scrollTop: 44 * 50, // scrollé de 50 lignes
    });
    expect(result.useVirtual).toBe(true);
    // rowStart = max(0, floor(2200/44) - 6) = max(0, 50-6) = 44
    expect(result.rowStart).toBe(44);
    expect(result.topSpacer).toBe(44 * 44);
    expect(result.rowEnd).toBeLessThanOrEqual(200);
  });

  it('borne rowEnd à totalCount', () => {
    const result = computeVirtualScroll({
      ...defaults,
      totalCount: 60,
      scrollTop: 44 * 55, // scroll au-delà de la fin
    });
    expect(result.rowEnd).toBe(60);
  });

  it('topSpacer + bottomSpacer + visible = totalHeight', () => {
    const result = computeVirtualScroll({
      ...defaults,
      totalCount: 200,
      scrollTop: 44 * 80,
    });
    const visibleCount = result.rowEnd - result.rowStart;
    const totalHeight = result.topSpacer + visibleCount * defaults.rowHeight + result.bottomSpacer;
    expect(totalHeight).toBe(200 * defaults.rowHeight);
  });

  it('fonctionne avec rowHeight différent (TableauNotesPage = 32)', () => {
    const result = computeVirtualScroll({
      totalCount: 100,
      scrollTop: 0,
      viewportHeight: 400,
      rowHeight: 32,
      overscan: 8,
      threshold: 50,
    });
    expect(result.useVirtual).toBe(true);
    // rowCount = ceil(400/32) + 8*2 = 13 + 16 = 29
    expect(result.rowEnd).toBe(29);
  });
});
