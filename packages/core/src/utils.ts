import type { Severity, CategoryId, CategoryScore, Issue, ScanResult } from './types.js';

export function severityToNumber(severity: Severity): number {
  const map: Record<Severity, number> = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1,
    info: 0,
  };
  return map[severity];
}

export function severityFromScore(score: number): Severity {
  if (score >= 4) return 'critical';
  if (score >= 3) return 'high';
  if (score >= 2) return 'medium';
  if (score >= 1) return 'low';
  return 'info';
}

export function calculateCategoryStatus(score: number): 'pass' | 'warn' | 'fail' {
  if (score >= 80) return 'pass';
  if (score >= 50) return 'warn';
  return 'fail';
}

export function generateIssueId(): string {
  const prefix = 'MRI';
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const m = Math.floor(ms / 60000);
  const s = Math.round((ms % 60000) / 1000);
  return `${m}m ${s}s`;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function getCategoryById(
  categories: CategoryScore[],
  id: CategoryId,
): CategoryScore | undefined {
  return categories.find(c => c.category === id);
}

export function countBySeverity(issues: Issue[]): Record<Severity, number> {
  const counts: Record<Severity, number> = {
    critical: 0,
    high: 0,
    medium: 0,
    low: 0,
    info: 0,
  };
  for (const issue of issues) {
    counts[issue.severity]++;
  }
  return counts;
}

export function getTopIssues(issues: Issue[], limit = 10): Issue[] {
  return [...issues]
    .sort((a, b) => severityToNumber(b.severity) - severityToNumber(a.severity))
    .slice(0, limit);
}

export function extractErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return 'An unknown error occurred';
}

export function maskSecrets(value: string): string {
  if (value.length <= 4) return '****';
  return value.slice(0, 2) + '****' + value.slice(-2);
}

export function isBinaryFile(path: string): boolean {
  const binaryExtensions = [
    '.png', '.jpg', '.jpeg', '.gif', '.ico', '.svg',
    '.woff', '.woff2', '.ttf', '.eot',
    '.pdf', '.zip', '.gz', '.tar', '.rar',
    '.mp3', '.mp4', '.avi', '.mov',
    '.ico', '.cur',
  ];
  return binaryExtensions.some(ext => path.endsWith(ext));
}

export function generateGoalId(): string {
  return 'GOAL-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export function mapScoreToGoalStatus(current: number, target: number): 'far' | 'close' | 'reached' {
  if (current >= target) return 'reached';
  if (current >= target * 0.75) return 'close';
  return 'far';
}

export function isConfigFile(path: string): boolean {
  const configFiles = [
    'package.json',
    'tsconfig.json',
    '.env',
    '.env.example',
    '.env.local.example',
    '.gitignore',
    '.eslintrc',
    '.eslintrc.json',
    '.eslintrc.js',
    '.prettierrc',
    '.prettierrc.json',
    'jest.config.js',
    'jest.config.ts',
    'vitest.config.ts',
    'vitest.config.js',
    'next.config.js',
    'next.config.mjs',
    'tailwind.config.js',
    'tailwind.config.ts',
  ];
  return configFiles.some(f => path.endsWith(f));
}
