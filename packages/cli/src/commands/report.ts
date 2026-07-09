import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ScanResult } from '@mri/core';

export async function runReport(): Promise<void> {
  const reportPath = join(process.cwd(), '.mri-last-report.json');

  try {
    const content = await readFile(reportPath, 'utf-8');
    const result = JSON.parse(content) as ScanResult;
    process.stdout.write(formatReport(result));
  } catch {
    process.stdout.write('No previous report found. Run `mri scan` first.\n');
  }
}

function formatReport(result: ScanResult): string {
  const lines: string[] = [];
  lines.push(`\n  Software MRI Report: ${result.project.name}`);
  lines.push(`  ${'─'.repeat(50)}`);
  lines.push(`  Score: ${result.totalScore}%`);
  lines.push(`  Files: ${result.scannedFiles}`);
  lines.push(`  Issues: ${result.totalIssues}`);
  lines.push(`  Duration: ${result.scanDurationMs}ms`);
  lines.push('');

  for (const cat of result.categories) {
    const icon = cat.status === 'pass' ? '✓' : cat.status === 'warn' ? '⚠' : '✗';
    lines.push(`  ${icon} ${cat.score}% ${cat.summary}`);
  }

  return lines.join('\n') + '\n';
}