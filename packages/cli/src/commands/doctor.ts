import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ScanResult } from '@mri/core';

const reportPath = join(process.cwd(), '.mri-last-report.json');

export async function runDoctor(): Promise<void> {
  try {
    const content = await readFile(reportPath, 'utf-8');
    const result = JSON.parse(content) as ScanResult;
    const autoFixable = result.categories.flatMap(c => c.issues).filter(i => i.canAutoFix);

    if (autoFixable.length === 0) {
      process.stdout.write('No auto-fixable issues found.\n');
      return;
    }

    process.stdout.write(`Found ${autoFixable.length} auto-fixable issues:\n\n`);
    for (const issue of autoFixable) {
      process.stdout.write(`  ${issue.title}\n`);
      for (const tip of issue.tips) {
        process.stdout.write(`    \u2192 ${tip}\n`);
      }
      process.stdout.write('\n');
    }

    process.stdout.write('Run `mri scan` after applying fixes.\n');
  } catch {
    process.stdout.write('No previous report found. Run `mri scan` first.\n');
  }
}