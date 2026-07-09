import type { ScanResult, ReportFormat, ReportOutput } from '@software-mri/core';
import { generateJsonReport } from './json.js';
import { generateMarkdownReport } from './markdown.js';
import { generateHtmlReport } from './html.js';

export function generateReport(result: ScanResult, format: ReportFormat): ReportOutput {
  switch (format) {
    case 'json':
      return {
        format: 'json',
        content: generateJsonReport(result),
        filename: `mri-report-${Date.now()}.json`,
      };
    case 'markdown':
      return {
        format: 'markdown',
        content: generateMarkdownReport(result),
        filename: `mri-report-${Date.now()}.md`,
      };
    case 'html':
      return {
        format: 'html',
        content: generateHtmlReport(result),
        filename: `mri-report-${Date.now()}.html`,
      };
  }
}

export { generateJsonReport } from './json.js';
export { generateMarkdownReport } from './markdown.js';
export { generateHtmlReport } from './html.js';