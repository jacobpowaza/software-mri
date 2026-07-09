import { join } from 'node:path';
import { writeFile } from 'node:fs/promises';
import { createScanContext, detectProject } from '@mri/scanner';
import { createCheckRegistry } from '@mri/checks';
import { calculateScores } from '@mri/scoring';
import { generateReport } from '@mri/reporter';
import { loadConfig } from '@mri/config';
import type { ReportFormat, ScanResult, ScanPhase, MriConfig } from '@mri/core';

interface ScanOptions {
  ci: boolean;
  format?: ReportFormat;
  output?: string;
  config?: string;
  strictness?: string;
  scoreThreshold?: number;
}

export async function runScan(options: ScanOptions): Promise<number> {
  if (!options.ci && !options.format) {
    const { runInteractiveScan } = await import('./scan-interactive.js');
    await runInteractiveScan();
    return 0;
  }

  const rootDir = process.cwd();
  const config = await loadConfig(rootDir, {
    strictness: options.strictness,
    scoreThreshold: options.scoreThreshold,
    format: options.format,
  });

  const progress = (phase: ScanPhase, message: string) => {
    if (options.ci) {
      process.stderr.write(`[${phase}] ${message}\n`);
    }
  };

  progress('detecting', 'Detecting project...');
  const scanContext = await createScanContext(rootDir, config);
  const project = detectProject(rootDir, scanContext.packageJson);

  progress('scanning', `Scanning ${scanContext.files.length} files...`);

  progress('analyzing', 'Running checks...');
  const registry = createCheckRegistry();
  const issues = await registry.runAll({
    scan: scanContext,
    project,
    config,
  });

  progress('scoring', 'Calculating scores...');
  const startTime = Date.now();
  const result = calculateScores({
    issues,
    project,
    config,
    scannedFiles: scanContext.files.length,
    scanDurationMs: Date.now() - startTime,
  });

  if (options.ci) {
    printCiOutput(result);
    const threshold = result.config.scoreThreshold;
    if (result.totalScore >= threshold) return 0;
    process.stderr.write(`Score ${result.totalScore}% is below threshold ${threshold}%\n`);
    return 1;
  }

  if (options.output && options.format) {
    const report = generateReport(result, options.format);
    await writeFile(options.output, report.content, 'utf-8');
    process.stdout.write(`Report written to ${options.output}\n`);
    return result.totalScore >= config.scoreThreshold ? 0 : 1;
  }

  printTerminalSummary(result);
  return 0;
}

function printTerminalSummary(result: ScanResult): void {
  const lines: string[] = [];
  const hr = '─'.repeat(50);

  lines.push('');
  lines.push(`  Software MRI  ›  ${result.project.name}`);
  lines.push(`  ${result.project.frameworks.join(', ')}  ·  ${result.project.packageManager}`);
  lines.push(`  ${hr}`);
  lines.push(`  Production Readiness: ${result.totalScore}%`);
  lines.push(`  ${hr}`);

  for (const cat of result.categories) {
    const icon = cat.status === 'pass' ? '✓' : cat.status === 'warn' ? '!' : '✗';
    const color = cat.status === 'pass' ? '' : cat.status === 'warn' ? '' : ''; // no color codes for terminal
    lines.push(`  ${icon} ${padEnd(getCategoryLabel(cat.category), 16)} ${cat.score}%  ${cat.summary}`);
  }

  lines.push(`  ${hr}`);
  lines.push(`  ${result.totalIssues} issues found in ${result.scannedFiles} files`);
  lines.push('');

  if (result.totalIssues > 0) {
    const topIssues = result.categories
      .flatMap(c => c.issues)
      .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
      .slice(0, 5);

    for (const issue of topIssues) {
      const label = issue.severity.toUpperCase().padEnd(8);
      lines.push(`  ${label} ${issue.title}`);
    }
    lines.push('');
  }

  process.stdout.write(lines.join('\n'));
}

function printCiOutput(result: ScanResult): void {
  process.stdout.write(JSON.stringify({
    score: result.totalScore,
    categories: Object.fromEntries(
      result.categories.map(c => [c.category, { score: c.score, status: c.status, issues: c.issues.length }])
    ),
    issues: result.totalIssues,
    files: result.scannedFiles,
    durationMs: result.scanDurationMs,
  }, null, 2));
  process.stdout.write('\n');
}

function getCategoryLabel(id: string): string {
  const labels: Record<string, string> = {
    architecture: 'Architecture', dependencies: 'Dependencies', deadCode: 'Dead Code',
    duplicates: 'Duplicates', typeSafety: 'Type Safety', testCoverage: 'Tests',
    configHealth: 'Config', securityHygiene: 'Security', performanceRisk: 'Performance',
    maintainability: 'Maintainability',
  };
  return labels[id] || id;
}

function severityRank(s: string): number {
  const ranks: Record<string, number> = { critical: 5, high: 4, medium: 3, low: 2, info: 1 };
  return ranks[s] || 0;
}

function padEnd(str: string, len: number): string {
  return str + ' '.repeat(Math.max(0, len - str.length));
}