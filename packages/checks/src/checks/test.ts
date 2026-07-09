import { join } from 'node:path';
import type { CheckRegistration, CheckContext } from '../types.js';

export const testChecks: CheckRegistration[] = [
  {
    id: 'test-missing-framework',
    name: 'Test framework detection',
    category: 'testCoverage',
    description: 'Detects if a test framework is configured',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const pkg = ctx.scan.packageJson;
      const hasTestFramework = pkg && (
        (pkg.devDependencies as Record<string, string>)?.['vitest'] ||
        (pkg.devDependencies as Record<string, string>)?.['jest'] ||
        (pkg.devDependencies as Record<string, string>)?.['mocha'] ||
        (pkg.devDependencies as Record<string, string>)?.['ava'] ||
        (pkg.devDependencies as Record<string, string>)?.['tap'] ||
        (pkg.devDependencies as Record<string, string>)?.['uvu']
      );

      if (!hasTestFramework) {
        issues.push({
          id: 'MRI-TEST-NOFRAMEWORK',
          title: 'No test framework detected',
          description: 'No test framework (vitest, jest, mocha, etc.) found in devDependencies.',
          severity: 'high',
          category: 'testCoverage',
          confidence: 'high',
          files: ['package.json'],
          scoreImpact: 10,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Install a test framework: npm install -D vitest',
            'Add a test script to package.json',
            'Create your first test file',
          ],
        });
      }

      return issues;
    },
  },
  {
    id: 'test-missing-script',
    name: 'Test script check',
    category: 'testCoverage',
    description: 'Checks if package.json has a test script',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const pkg = ctx.scan.packageJson;
      if (!pkg) return issues;

      const scripts = pkg.scripts as Record<string, string> | undefined;
      if (!scripts || !scripts.test) {
        issues.push({
          id: 'MRI-TEST-NOSCRIPT',
          title: 'No test script defined in package.json',
          description: 'package.json is missing a "test" script entry.',
          severity: 'medium',
          category: 'testCoverage',
          confidence: 'high',
          files: ['package.json'],
          scoreImpact: 5,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Add "test": "vitest run" or "test": "jest" to package.json scripts',
          ],
        });
      }

      return issues;
    },
  },
  {
    id: 'test-untested-files',
    name: 'Untested source file detection',
    category: 'testCoverage',
    description: 'Detects source files that lack corresponding test files',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const testFiles = new Set<string>();

      for (const file of ctx.scan.files) {
        if (file.relativePath.includes('.test.') || file.relativePath.includes('.spec.') ||
            file.relativePath.includes('__tests__') || file.relativePath.includes('__test__')) {
          testFiles.add(file.relativePath);
        }
      }

      const knownTestPatterns = ['coverage', 'nyc_output', '__snapshots__'];

      if (testFiles.size === 0) {
        return issues; // handled by missing framework check
      }

      const sourceFiles = ctx.scan.files.filter((f: import('@mri/scanner').FileEntry) =>
        f.relativePath.startsWith('src/') &&
        (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx')) &&
        !f.relativePath.endsWith('.test.ts') && !f.relativePath.endsWith('.spec.ts') &&
        !f.relativePath.endsWith('.d.ts') &&
        !knownTestPatterns.some(p => f.relativePath.includes(p))
      );

      const untestedPaths: string[] = [];
      for (const srcFile of sourceFiles) {
        const baseName = srcFile.relativePath.replace(/\.(ts|tsx)$/, '');
        const hasTest = Array.from(testFiles).some(t =>
          t.includes(baseName.replace('src/', '')) ||
          t.includes(baseName.split('/').pop() || '')
        );

        if (!hasTest) {
          untestedPaths.push(srcFile.relativePath);
        }
      }

      const checkThreshold = 0.3;
      const untestedRatio = sourceFiles.length > 0 ? untestedPaths.length / sourceFiles.length : 0;

      if (untestedRatio > checkThreshold && untestedPaths.length > 3) {
        issues.push({
          id: 'MRI-TEST-UNTESTED',
          title: `High ratio of untested files: ${untestedPaths.length}/${sourceFiles.length}`,
          description: `${untestedPaths.length} source files (${Math.round(untestedRatio * 100)}%) have no corresponding test file.`,
          severity: untestedRatio > 0.7 ? 'high' : 'medium',
          category: 'testCoverage',
          confidence: 'medium',
          files: untestedPaths.slice(0, 10),
          scoreImpact: Math.min(Math.round(untestedRatio * 20), 15),
          canAutoFix: false,
          status: 'open',
          tips: [
            'Add tests for files with high import centrality',
            'Focus on testing files with business logic first',
            'Use code coverage tools to identify untested critical paths',
          ],
        });
      }

      return issues;
    },
  },
  {
    id: 'test-coverage-config',
    name: 'Coverage configuration check',
    category: 'testCoverage',
    description: 'Checks if code coverage is configured',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const testFilesExist = ctx.scan.files.some(f =>
        f.relativePath.includes('.test.') || f.relativePath.includes('.spec.')
      );
      const hasCoverageConfig = ctx.scan.files.some(f =>
        f.relativePath === 'vitest.config.ts' || f.relativePath === 'vitest.config.js' ||
        f.relativePath === 'jest.config.ts' || f.relativePath === 'jest.config.js'
      );

      if (testFilesExist && !hasCoverageConfig) {
        issues.push({
          id: 'MRI-TEST-NOCOVERAGE',
          title: 'No coverage configuration detected',
          description: 'Test files exist but no coverage configuration is set up.',
          severity: 'low',
          category: 'testCoverage',
          confidence: 'medium',
          files: [],
          scoreImpact: 1,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Add coverage configuration to vitest.config.ts or jest.config.js',
            'Set coverage thresholds to prevent regressions',
          ],
        });
      }

      return issues;
    },
  },
];