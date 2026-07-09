import type { Issue, CategoryId, CategoryScore, MriConfig, ScanResult, ProjectInfo } from '@mri/core';
import { CATEGORIES } from '@mri/core';
import { calculateCategoryStatus } from '@mri/core';

export interface ScoreInput {
  issues: Issue[];
  project: ProjectInfo;
  config: MriConfig;
  scannedFiles: number;
  scanDurationMs: number;
}

export function calculateScores(input: ScoreInput): ScanResult {
  const { issues, project, config, scannedFiles, scanDurationMs } = input;

  const categories = calculateCategoryScores(issues, config);

  const totalScore = calculateTotalScore(categories, config);

  return {
    project,
    categories,
    totalScore,
    totalIssues: issues.length,
    scanDurationMs,
    scannedFiles,
    config,
  };
}

function calculateCategoryScores(issues: Issue[], config: MriConfig): CategoryScore[] {
  return CATEGORIES.map(cat => {
    const catIssues = issues.filter(i => i.category === cat.id);
    const baseScore = 100;
    const deductions = catIssues.reduce((total, issue) => {
      return total + calculateIssueDeduction(issue, config);
    }, 0);

    const score = Math.max(0, Math.min(100, baseScore - deductions));

    return {
      category: cat.id,
      score: Math.round(score),
      status: calculateCategoryStatus(score),
      issues: catIssues,
      summary: generateCategorySummary(cat.id, score, catIssues.length),
      tips: generateCategoryTips(catIssues),
    };
  });
}

function calculateIssueDeduction(issue: Issue, config: MriConfig): number {
  const severityMultiplier: Record<string, number> = {
    critical: 15,
    high: 8,
    medium: 4,
    low: 2,
    info: 0,
  };

  const confidenceMultiplier: Record<string, number> = {
    high: 1.0,
    medium: 0.7,
    low: 0.4,
  };

  const fileCountMultiplier = Math.min(1 + (issue.files.length - 1) * 0.1, 2.0);
  const base = severityMultiplier[issue.severity] || 0;
  const confidence = confidenceMultiplier[issue.confidence] || 0.5;

  return base * confidence * fileCountMultiplier;
}

function calculateTotalScore(categories: CategoryScore[], config: MriConfig): number {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const cat of categories) {
    const meta = CATEGORIES.find(m => m.id === cat.category);
    if (!meta) continue;

    const weight = config.scoreWeights[cat.category] ?? meta.weight;
    weightedSum += cat.score * weight;
    totalWeight += weight;
  }

  if (totalWeight === 0) return 0;
  return Math.round(weightedSum / totalWeight);
}

function generateCategorySummary(category: CategoryId, score: number, issueCount: number): string {
  const summaries: Record<CategoryId, (score: number, count: number) => string> = {
    architecture: (s) => s >= 80 ? 'Well-structured codebase' : s >= 50 ? 'Some structural issues found' : 'Significant architectural concerns',
    dependencies: (s) => s >= 80 ? 'Dependencies look healthy' : s >= 50 ? 'Some dependency issues found' : 'Dependencies need attention',
    deadCode: (s) => s >= 80 ? 'No significant dead code found' : s >= 50 ? 'Some dead code detected' : 'Significant dead code present',
    duplicates: (s) => s >= 80 ? 'No significant duplication' : s >= 50 ? 'Some duplication found' : 'Significant code duplication',
    typeSafety: (s) => s >= 80 ? 'Good TypeScript configuration' : s >= 50 ? 'TypeScript config needs improvement' : 'Type safety is weak',
    testCoverage: (s, c) => c === 0 ? 'No tests detected' : s >= 80 ? 'Good test coverage' : s >= 50 ? 'Tests need improvement' : 'Test coverage is weak',
    configHealth: (s) => s >= 80 ? 'Configuration looks good' : s >= 50 ? 'Some config issues found' : 'Configuration needs attention',
    securityHygiene: (s) => s >= 80 ? 'Good security hygiene' : s >= 50 ? 'Some security concerns' : 'Security issues found',
    performanceRisk: (s) => s >= 80 ? 'Good performance profile' : s >= 50 ? 'Some performance risks' : 'Performance concerns found',
    maintainability: (s) => s >= 80 ? 'Highly maintainable' : s >= 50 ? 'Some maintainability concerns' : 'Maintainability needs work',
  };

  return (summaries[category] || (() => 'Analysis complete'))(score, issueCount);
}

function generateCategoryTips(issues: Issue[]): string[] {
  return issues.slice(0, 3).flatMap(i => i.tips.slice(0, 2));
}

// Re-export ScanResult for convenience
export type { ScanResult } from '@mri/core';