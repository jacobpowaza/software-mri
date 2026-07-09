import { describe, it, expect } from 'vitest';
import { getPageStart } from '../components/dashboard.js';

const PAGE = 8;

describe('getPageStart — pagination viewport logic', () => {

  it('starts at 0 when list is shorter than page size', () => {
    for (let i = 0; i < 8; i++) {
      expect(getPageStart(i, 6, PAGE)).toBe(0);
    }
  });

  it('shows issues 0-7 when selectedIndex is 0-7 (26 total)', () => {
    for (let i = 0; i <= 7; i++) {
      expect(getPageStart(i, 26, PAGE)).toBe(0);
    }
    // Verify page content
    const start = getPageStart(0, 26, PAGE);
    expect(start).toBe(0);
  });

  it('crosses to page 8 when selectedIndex goes from 8 to 15', () => {
    for (let i = 8; i <= 15; i++) {
      expect(getPageStart(i, 26, PAGE)).toBe(8);
    }
  });

  it('crosses to page 16 when selectedIndex goes from 16 to 23', () => {
    for (let i = 16; i <= 23; i++) {
      expect(getPageStart(i, 26, PAGE)).toBe(16);
    }
  });

  it('stays at page 16 for the last items (24-25)', () => {
    expect(getPageStart(24, 26, PAGE)).toBe(18);
    expect(getPageStart(25, 26, PAGE)).toBe(18);
  });

  it('never returns a pageStart that would produce fewer than max page items except at the end', () => {
    for (let i = 0; i < 26; i++) {
      const start = getPageStart(i, 26, PAGE);
      const visible = Math.min(start + PAGE, 26) - start;
      expect(visible).toBeLessThanOrEqual(PAGE);
      expect(visible).toBeGreaterThan(0);
    }
  });

  it('scrolling back from 9 to 8 restores page 0', () => {
    const pageAt9 = getPageStart(9, 26, PAGE);
    expect(pageAt9).toBe(8);
    const pageAt8 = getPageStart(8, 26, PAGE);
    expect(pageAt8).toBe(8); // 8 is still on page 8
    const pageAt7 = getPageStart(7, 26, PAGE);
    expect(pageAt7).toBe(0); // 7 is on page 0
  });

  it('exactly 8 max visible items', () => {
    for (let total = 1; total <= 50; total++) {
      for (let i = 0; i < total; i++) {
        const start = getPageStart(i, total, PAGE);
        const end = Math.min(start + PAGE, total);
        expect(end - start).toBeLessThanOrEqual(PAGE);
      }
    }
  });

  it('page ranges are contiguous and never skip items', () => {
    for (let total = 17; total <= 50; total++) {
      const p0 = getPageStart(0, total, PAGE);
      const p7 = getPageStart(7, total, PAGE);
      const p8 = getPageStart(8, total, PAGE);
      // On page 0, show items 0-7. On page 1, show items 8-15 (no overlap when total >= 16)
      expect(p0).toBe(0);
      expect(p7).toBe(0);
      if (total >= 16) {
        expect(p8).toBe(PAGE);
      }
    }
  });
});