import { describe, it, expect } from 'vitest';
import { calculateScores } from '../index.js';
import type { Issue, MriConfig, ProjectInfo } from '@software-mri/core';

const mockConfig: MriConfig = {
  ignoredFolders: [],
  scoreWeights: {},
  fileSizeThreshold: 500,
  enabledChecks: [],
  outputFormat: 'terminal',
  strictness: 'medium',
  scoreThreshold: 70,
};

const mockProject: ProjectInfo = {
  name: 'test-project',
  rootDir: '/test',
  frameworks: ['node'],
  packageManager: 'npm',
  hasTypeScript: true,
  hasConfigFiles: [],
};

describe('calculateScores', () => {
  it('returns 100 when no issues', () => {
    const result = calculateScores({
      issues: [],
      project: mockProject,
      config: mockConfig,
      scannedFiles: 10,
      scanDurationMs: 100,
    });

    expect(result.totalScore).toBe(100);
    expect(result.totalIssues).toBe(0);
    expect(result.scannedFiles).toBe(10);
  });

  it('reduces score for high severity issues', () => {
    const issues: Issue[] = [{
      id: 'TEST-001',
      title: 'Test issue',
      description: 'A test issue',
      severity: 'high',
      category: 'typeSafety',
      confidence: 'high',
      files: ['test.ts'],
      scoreImpact: 8,
      canAutoFix: false,
      status: 'open',
      tips: ['Fix it'],
    }];

    const result = calculateScores({
      issues,
      project: mockProject,
      config: mockConfig,
      scannedFiles: 10,
      scanDurationMs: 100,
    });

    expect(result.totalScore).toBeLessThan(100);
    expect(result.totalIssues).toBe(1);
    expect(result.categories.find(c => c.category === 'typeSafety')?.score).toBeLessThan(100);
  });

  it('categories have correct status based on score', () => {
    const result = calculateScores({
      issues: [],
      project: mockProject,
      config: mockConfig,
      scannedFiles: 1,
      scanDurationMs: 50,
    });

    for (const cat of result.categories) {
      expect(cat.status).toBe('pass');
      expect(cat.score).toBe(100);
    }
  });

  it('handles multiple issues across categories', () => {
    const issues: Issue[] = [
      {
        id: 'T1', title: 'Strict mode off', description: '', severity: 'high',
        category: 'typeSafety', confidence: 'high', files: ['tsconfig.json'],
        scoreImpact: 8, canAutoFix: true, status: 'open', tips: [],
      },
      {
        id: 'T2', title: 'No tests', description: '', severity: 'high',
        category: 'testCoverage', confidence: 'high', files: [],
        scoreImpact: 10, canAutoFix: false, status: 'open', tips: [],
      },
      {
        id: 'T3', title: 'Large file', description: '', severity: 'medium',
        category: 'architecture', confidence: 'high', files: ['big.ts'],
        scoreImpact: 3, canAutoFix: false, status: 'open', tips: [],
      },
    ];

    const result = calculateScores({
      issues,
      project: mockProject,
      config: mockConfig,
      scannedFiles: 50,
      scanDurationMs: 200,
    });

    expect(result.totalIssues).toBe(3);
    expect(result.categories.find(c => c.category === 'typeSafety')?.issues.length).toBe(1);
    expect(result.categories.find(c => c.category === 'testCoverage')?.issues.length).toBe(1);
    expect(result.categories.find(c => c.category === 'architecture')?.issues.length).toBe(1);
  });
});