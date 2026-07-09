import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReportFormat, ScanResult } from '@mri/core';
import { generateReport } from '@mri/reporter';

const reportPath = join(process.cwd(), '.mri-last-report.json');

interface ExportCommandOptions {
  format: ReportFormat;
  output?: string;
}

export async function runExport(options: ExportCommandOptions): Promise<void> {
  try {
    const content = await readFile(reportPath, 'utf-8');
    const result = JSON.parse(content) as ScanResult;

    const report = generateReport(result, options.format);
    const outputPath = options.output || report.filename;

    await writeFile(outputPath, report.content, 'utf-8');
    process.stdout.write(`Report exported to ${outputPath}\n`);
  } catch {
    process.stdout.write('No previous report found. Run `mri scan` first.\n');
  }
}