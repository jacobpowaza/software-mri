import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Issue, ScanResult } from '@software-mri/core';

const reportPath = join(process.cwd(), '.mri-last-report.json');

export async function runExplain(issueId: string): Promise<void> {
  try {
    const content = await readFile(reportPath, 'utf-8');
    const result = JSON.parse(content) as ScanResult;

    const allIssues = result.categories.flatMap(c => c.issues);
    const issue = allIssues.find(i => i.id === issueId);

    if (!issue) {
      process.stdout.write(`Issue "${issueId}" not found in the last report.\n`);
      return;
    }

    printIssueExplanation(issue);
  } catch {
    process.stdout.write('No previous report found. Run `mri scan` first.\n');
  }
}

function printIssueExplanation(issue: Issue): void {
  const lines: string[] = [];
  const hr = '\u2500'.repeat(50);

  lines.push(`\n  ! Issue: ${issue.title}`);
  lines.push(`  ${hr}`);
  lines.push(`  ID: ${issue.id}`);
  lines.push(`  Severity: ${issue.severity.toUpperCase()}`);
  lines.push(`  Category: ${issue.category}`);
  lines.push(`  Score impact: -${issue.scoreImpact}%`);
  lines.push(`  Confidence: ${issue.confidence}`);
  lines.push(`  ${hr}`);

  lines.push('  What was found:');
  lines.push(`  ${issue.description}`);
  lines.push('');

  if (issue.files.length > 0) {
    lines.push('  Affected files:');
    for (const file of issue.files) {
      lines.push(`    \u2022 ${file}`);
    }
    lines.push('');
  }

  lines.push('  Why it matters:');
  lines.push('  ' + getWhyItMatters(issue));
  lines.push('');

  lines.push('  How to fix:');
  for (let i = 0; i < issue.tips.length; i++) {
    const tip = issue.tips[i];
    if (tip) lines.push(`  ${i + 1}. ${tip}`);
  }
  lines.push('');

  lines.push('  How to verify:');
  lines.push('  1. Apply the suggested fixes');
  lines.push('  2. Run `mri scan` again');
  lines.push('  3. Check if the score improved');
  lines.push('');

  process.stdout.write(lines.join('\n') + '\n');
}

function getWhyItMatters(issue: Issue): string {
  const explanations: Record<string, string> = {
    'architecture-large-files': 'Large files are harder to understand, test, and maintain. They often violate the Single Responsibility Principle and make code reviews more difficult.',
    'architecture-deep-nesting': 'Deep directory structures make it hard to understand the project layout and increase the cognitive load on developers.',
    'deps-unused': 'Unused dependencies increase install time, build time, and the attack surface of your application.',
    'deps-missing': 'Missing dependencies cause runtime errors when the application tries to import them.',
    'ts-strict-mode': 'Without strict mode, TypeScript misses many type errors that could lead to runtime bugs in production.',
    'test-missing-framework': 'Without a test framework, there is no automated way to verify that your code works correctly.',
    'sec-eval': 'eval() can execute arbitrary code, leading to code injection vulnerabilities.',
  };

  return explanations[issue.id] || 'This issue affects the overall health and maintainability of the codebase.';
}