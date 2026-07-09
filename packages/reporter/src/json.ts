import type { ScanResult, CategoryScore, Issue, ReportOutput } from '@software-mri/core';

export function generateJsonReport(result: ScanResult): string {
  return JSON.stringify(serializeResult(result), null, 2);
}

function serializeResult(result: ScanResult) {
  return {
    meta: {
      tool: 'Software MRI',
      version: '0.1.0',
      generatedAt: new Date().toISOString(),
    },
    project: {
      name: result.project.name,
      frameworks: result.project.frameworks,
      packageManager: result.project.packageManager,
      hasTypeScript: result.project.hasTypeScript,
    },
    scan: {
      durationMs: result.scanDurationMs,
      scannedFiles: result.scannedFiles,
      totalIssues: result.totalIssues,
    },
    scores: {
      total: result.totalScore,
      categories: result.categories.map(c => ({
        id: c.category,
        label: getCategoryLabel(c.category),
        score: c.score,
        status: c.status,
        summary: c.summary,
        issues: c.issues.length,
      })),
    },
    issues: result.categories.flatMap(c => c.issues.map(i => serializeIssue(i))),
  };
}

function serializeIssue(issue: Issue) {
  return {
    id: issue.id,
    title: issue.title,
    severity: issue.severity,
    category: issue.category,
    categoryLabel: getCategoryLabel(issue.category),
    confidence: issue.confidence,
    files: issue.files,
    scoreImpact: issue.scoreImpact,
    canAutoFix: issue.canAutoFix,
    description: issue.description,
    tips: issue.tips,
  };
}

function getCategoryLabel(id: string): string {
  const labels: Record<string, string> = {
    architecture: 'Architecture',
    dependencies: 'Dependencies',
    deadCode: 'Dead Code',
    duplicates: 'Duplicates',
    typeSafety: 'Type Safety',
    testCoverage: 'Test Coverage',
    configHealth: 'Config Health',
    securityHygiene: 'Security',
    performanceRisk: 'Performance',
    maintainability: 'Maintainability',
  };
  return labels[id] || id;
}