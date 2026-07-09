import { describe, it, expect } from 'vitest';
import {
  severityToNumber,
  calculateCategoryStatus,
  formatBytes,
  formatDuration,
  clamp,
  maskSecrets,
  countBySeverity,
  severityFromScore,
} from '../utils.js';
import type { Issue, Severity } from '../types.js';

describe('severityToNumber', () => {
  it('returns correct numbers for each severity', () => {
    expect(severityToNumber('critical')).toBe(4);
    expect(severityToNumber('high')).toBe(3);
    expect(severityToNumber('medium')).toBe(2);
    expect(severityToNumber('low')).toBe(1);
    expect(severityToNumber('info')).toBe(0);
  });
});

describe('severityFromScore', () => {
  it('maps scores to severity', () => {
    expect(severityFromScore(4)).toBe('critical');
    expect(severityFromScore(3)).toBe('high');
    expect(severityFromScore(2)).toBe('medium');
    expect(severityFromScore(1)).toBe('low');
    expect(severityFromScore(0)).toBe('info');
  });
});

describe('calculateCategoryStatus', () => {
  it('returns pass for scores >= 80', () => {
    expect(calculateCategoryStatus(80)).toBe('pass');
    expect(calculateCategoryStatus(100)).toBe('pass');
  });

  it('returns warn for scores between 50 and 79', () => {
    expect(calculateCategoryStatus(50)).toBe('warn');
    expect(calculateCategoryStatus(79)).toBe('warn');
  });

  it('returns fail for scores < 50', () => {
    expect(calculateCategoryStatus(0)).toBe('fail');
    expect(calculateCategoryStatus(49)).toBe('fail');
  });
});

describe('formatBytes', () => {
  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500 B');
    expect(formatBytes(2048)).toBe('2.0 KB');
    expect(formatBytes(1048576)).toBe('1.0 MB');
  });
});

describe('formatDuration', () => {
  it('formats duration', () => {
    expect(formatDuration(500)).toBe('500ms');
    expect(formatDuration(2500)).toBe('2.5s');
    expect(formatDuration(65000)).toBe('1m 5s');
  });
});

describe('clamp', () => {
  it('clamps values within range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-5, 0, 10)).toBe(0);
    expect(clamp(15, 0, 10)).toBe(10);
  });
});

describe('maskSecrets', () => {
  it('masks secret values', () => {
    expect(maskSecrets('abc12345')).toBe('ab****45');
    expect(maskSecrets('ab')).toBe('****');
  });
});

describe('countBySeverity', () => {
  it('counts issues by severity', () => {
    const issues = [
      { severity: 'high' } as Issue,
      { severity: 'high' } as Issue,
      { severity: 'low' } as Issue,
      { severity: 'info' } as Issue,
    ];
    const counts = countBySeverity(issues);
    expect(counts.high).toBe(2);
    expect(counts.low).toBe(1);
    expect(counts.info).toBe(1);
    expect(counts.critical).toBe(0);
    expect(counts.medium).toBe(0);
  });
});