import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CheckRegistration, CheckContext } from '../types.js';

export const typescriptChecks: CheckRegistration[] = [
  {
    id: 'ts-strict-mode',
    name: 'TypeScript strict mode check',
    category: 'typeSafety',
    description: 'Checks if TypeScript strict mode is enabled',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      try {
        const tsconfigRaw = await readFile(join(ctx.project.rootDir, 'tsconfig.json'), 'utf-8');
        const tsconfig = JSON.parse(tsconfigRaw);
        const compilerOptions = tsconfig.compilerOptions || {};

        if (!compilerOptions.strict) {
          issues.push({
            id: 'MRI-TS-STRICT',
            title: 'TypeScript strict mode is disabled',
            description: 'Strict mode is not enabled in tsconfig.json. This allows unsafe type practices.',
            severity: 'high',
            category: 'typeSafety',
            confidence: 'high',
            files: ['tsconfig.json'],
            scoreImpact: 8,
            canAutoFix: true,
            status: 'open',
            tips: [
              'Set "strict": true in tsconfig.json',
              'Run the TypeScript compiler to find type errors',
              'Fix surfaced type errors gradually using // @ts-expect-error',
            ],
          });
        }

        if (!compilerOptions.noUncheckedIndexedAccess) {
          issues.push({
            id: 'MRI-TS-NOUNCHECKED',
            title: 'noUncheckedIndexedAccess is disabled',
            description: 'This flag catches potential undefined access on array/object indexing.',
            severity: 'medium',
            category: 'typeSafety',
            confidence: 'high',
            files: ['tsconfig.json'],
            scoreImpact: 3,
            canAutoFix: true,
            status: 'open',
            tips: [
              'Set "noUncheckedIndexedAccess": true in tsconfig.json',
            ],
          });
        }

        if (!compilerOptions.noUnusedLocals) {
          issues.push({
            id: 'MRI-TS-NOUNUSEDLOCALS',
            title: 'noUnusedLocals is disabled',
            description: 'This flag catches unused variables at compile time.',
            severity: 'low',
            category: 'typeSafety',
            confidence: 'high',
            files: ['tsconfig.json'],
            scoreImpact: 1,
            canAutoFix: true,
            status: 'open',
            tips: [
              'Set "noUnusedLocals": true in tsconfig.json',
            ],
          });
        }

        if (!compilerOptions.noUnusedParameters) {
          issues.push({
            id: 'MRI-TS-NOUNUSEDPARAMS',
            title: 'noUnusedParameters is disabled',
            description: 'This flag catches unused function parameters.',
            severity: 'low',
            category: 'typeSafety',
            confidence: 'high',
            files: ['tsconfig.json'],
            scoreImpact: 1,
            canAutoFix: true,
            status: 'open',
            tips: [
              'Set "noUnusedParameters": true in tsconfig.json',
            ],
          });
        }
      } catch {
        if (ctx.project.hasTypeScript) {
          issues.push({
            id: 'MRI-TS-NOCONFIG',
            title: 'Could not parse tsconfig.json',
            description: 'The tsconfig.json file is missing or invalid.',
            severity: 'high',
            category: 'typeSafety',
            confidence: 'high',
            files: ['tsconfig.json'],
            scoreImpact: 5,
            canAutoFix: false,
            status: 'open',
            tips: [
              'Create a valid tsconfig.json file',
              'Run tsc --init to generate a default config',
            ],
          });
        }
      }

      return issues;
    },
  },
  {
    id: 'ts-skipLibCheck',
    name: 'skipLibCheck usage',
    category: 'typeSafety',
    description: 'Checks if skipLibCheck is enabled (masks real type errors)',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      try {
        const tsconfigRaw = await readFile(join(ctx.project.rootDir, 'tsconfig.json'), 'utf-8');
        const tsconfig = JSON.parse(tsconfigRaw);
        const compilerOptions = tsconfig.compilerOptions || {};

        if (compilerOptions.skipLibCheck) {
          issues.push({
            id: 'MRI-TS-SKIPLIB',
            title: 'skipLibCheck is enabled',
            description: 'skipLibCheck: true skips type checking of declaration files (.d.ts). This can hide type errors from dependencies.',
            severity: 'medium',
            category: 'typeSafety',
            confidence: 'medium',
            files: ['tsconfig.json'],
            scoreImpact: 3,
            canAutoFix: true,
            status: 'open',
            tips: [
              'Set "skipLibCheck": false in tsconfig.json',
              'Fix any type errors in dependencies or use skipLibCheck only temporarily',
            ],
          });
        }
      } catch {
        /* expected - handled separately */
      }

      return issues;
    },
  },
  {
    id: 'ts-noImplicitAny',
    name: 'noImplicitAny check',
    category: 'typeSafety',
    description: 'Checks if noImplicitAny is enabled even when strict is off',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      try {
        const tsconfigRaw = await readFile(join(ctx.project.rootDir, 'tsconfig.json'), 'utf-8');
        const tsconfig = JSON.parse(tsconfigRaw);
        const compilerOptions = tsconfig.compilerOptions || {};

        if (!compilerOptions.strict && compilerOptions.noImplicitAny === undefined) {
          issues.push({
            id: 'MRI-TS-IMPLICITANY',
            title: 'noImplicitAny is not explicitly set',
            description: 'Without noImplicitAny, TypeScript falls back to implicit any types.',
            severity: 'high',
            category: 'typeSafety',
            confidence: 'high',
            files: ['tsconfig.json'],
            scoreImpact: 5,
            canAutoFix: true,
            status: 'open',
            tips: [
              'Set "noImplicitAny": true in tsconfig.json',
              'This is automatically on when strict mode is enabled',
            ],
          });
        }
      } catch {
        /* expected - file may not be relevant */
      }

      return issues;
    },
  },
  {
    id: 'ts-no-exports',
    name: 'Files without exports check',
    category: 'typeSafety',
    description: 'Detects source files that export nothing',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const srcFiles = ctx.scan.files.filter((f: import('@mri/scanner').FileEntry) =>
        f.relativePath.startsWith('src/') && !f.relativePath.endsWith('.test.ts') &&
        !f.relativePath.endsWith('.spec.ts') && !f.relativePath.endsWith('.d.ts') &&
        (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx'))
      );

      for (const file of srcFiles) {
        try {
          const content = await readFile(file.path, 'utf-8');
          const hasExport = content.includes('export ') || content.includes('module.exports');
          const hasSideEffect = content.includes('import ') || content.includes('require(');

          if (!hasExport && hasSideEffect) {
            issues.push({
              id: `MRI-TS-NOEXPORT-${Buffer.from(file.relativePath).slice(0, 4).toString('hex')}`,
              title: 'Module with imports but no exports',
              description: `${file.relativePath} imports modules but exports nothing. May be a side-effect import or unfinished code.`,
              severity: 'low',
              category: 'typeSafety',
              confidence: 'low',
              files: [file.relativePath],
              scoreImpact: 1,
              canAutoFix: false,
              status: 'open',
              tips: [
                `Check if ${file.relativePath} should export something`,
                'Consider if this should be a side-effect import',
              ],
            });
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      return issues;
    },
  },
];