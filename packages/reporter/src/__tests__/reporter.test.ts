import { describe, it, expect } from 'vitest';
import { generateJsonReport, generateMarkdownReport, generateHtmlReport } from '../index.js';
import type { ScanResult, CategoryScore } from '@software-mri/core';

function createMockResult(): ScanResult {
  const categoryScore: CategoryScore = {
    category: 'typeSafety',
    score: 75,
    status: 'warn',
    issues: [
      {
        id: 'MRI-TEST-001',
        title: 'Test issue',
        description: 'A test issue description',
        severity: 'high',
        category: 'typeSafety',
        confidence: 'high',
        files: ['src/test.ts'],
        scoreImpact: 8,
        canAutoFix: true,
        status: 'open',
        tips: ['Fix this issue by enabling strict mode'],
      },
    ],
    summary: 'Test summary',
    tips: ['Enable strict mode'],
  };

  return {
    project: {
      name: 'test-project',
      rootDir: '/test',
      frameworks: ['node', 'react'],
      packageManager: 'pnpm',
      hasTypeScript: true,
      hasConfigFiles: ['tsconfig.json'],
    },
    categories: [categoryScore],
    totalScore: 75,
    totalIssues: 1,
    scanDurationMs: 1500,
    scannedFiles: 42,
    config: {
      ignoredFolders: ['node_modules'],
      scoreWeights: {},
      fileSizeThreshold: 500,
      enabledChecks: [],
      outputFormat: 'terminal',
      strictness: 'medium',
      scoreThreshold: 70,
    },
  };
}

describe('JsonReport', () => {
  it('produces valid JSON with all required fields', () => {
    const result = createMockResult();
    const json = generateJsonReport(result);
    const parsed = JSON.parse(json);

    expect(parsed.meta.tool).toBe('Software MRI');
    expect(parsed.project.name).toBe('test-project');
    expect(parsed.scores.total).toBe(75);
    expect(parsed.issues).toHaveLength(1);
    expect(parsed.issues[0]?.id).toBe('MRI-TEST-001');
  });
});

describe('MarkdownReport', () => {
  it('generates markdown with correct sections', () => {
    const result = createMockResult();
    const md = generateMarkdownReport(result);

    expect(md).toContain('# Software MRI Report');
    expect(md).toContain('test-project');
    expect(md).toContain('75%');
    expect(md).toContain('MRI-TEST-001');
    expect(md).toContain('Fix this issue by enabling strict mode');
  });
});

describe('HtmlReport', () => {
  it('generates HTML with correct structure', () => {
    const result = createMockResult();
    const html = generateHtmlReport(result);

    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('Software MRI Report');
    expect(html).toContain('75');
    expect(html).toContain('Test issue');
  });
});