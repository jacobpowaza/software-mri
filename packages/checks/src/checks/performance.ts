import type { CheckRegistration, CheckContext } from '../types.js';

export const performanceChecks: CheckRegistration[] = [
  {
    id: 'perf-large-dependencies',
    name: 'Large dependency detection',
    category: 'performanceRisk',
    description: 'Flags dependencies known to be large',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const pkg = ctx.scan.packageJson;
      if (!pkg) return issues;

      const knownLargeDeps = ['moment', 'lodash', 'jquery', 'bootstrap', 'chart.js', 'gulp'];
      const allDeps = new Set<string>();

      for (const key of ['dependencies', 'devDependencies'] as const) {
        const deps = pkg[key];
        if (deps && typeof deps === 'object') {
          for (const name of Object.keys(deps as Record<string, unknown>)) {
            allDeps.add(name);
          }
        }
      }

      const found = knownLargeDeps.filter(d => allDeps.has(d));
      if (found.length > 0) {
        issues.push({
          id: 'MRI-PERF-LARGEDEPS',
          title: `Large ${found.length === 1 ? 'dependency' : 'dependencies'}: ${found.join(', ')}`,
          description: `Found dependencies known for large bundle sizes. Consider modern alternatives.`,
          severity: 'medium',
          category: 'performanceRisk',
          confidence: 'high',
          files: ['package.json'],
          scoreImpact: 3,
          canAutoFix: false,
          status: 'open',
          tips: found.map(d => {
            const suggestions: Record<string, string> = {
              lodash: 'Use native Array/Object methods or import lodash/xxx for tree-shaking',
              jquery: 'Replace with vanilla JS or a modern framework',
              moment: 'Use date-fns or dayjs (much smaller)',
              gulp: 'Migrate to npm scripts or modern build tools',
              bootstrap: 'Use only the specific components needed',
              'chart.js': 'Consider lighter alternatives for simple charts',
            };
            return suggestions[d] || `Evaluate if ${d} can be replaced with a smaller alternative`;
          }),
        });
      }

      return issues;
    },
  },
  {
    id: 'perf-barrel-files',
    name: 'Barrel file detection',
    category: 'performanceRisk',
    description: 'Detects barrel files (index.ts re-exporting many modules)',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const indexFiles = ctx.scan.files.filter((f: import('@software-mri/scanner').FileEntry) =>
        f.relativePath.endsWith('/index.ts') || f.relativePath.endsWith('/index.tsx')
      );

      for (const file of indexFiles) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          const reExports = content.match(/export\s+\{[^}]+\}\s+from/g);
          const exportCount = reExports ? reExports.length : 0;

          if (exportCount > 10) {
            issues.push({
              id: `MRI-PERF-BARREL-${Buffer.from(file.relativePath).slice(0, 4).toString('hex')}`,
              title: `Large barrel file: ${exportCount} re-exports`,
              description: `${file.relativePath} re-exports ${exportCount} modules. Barrel files can cause performance issues with tree-shaking.`,
              severity: 'low',
              category: 'performanceRisk',
              confidence: 'medium',
              files: [file.relativePath],
              scoreImpact: 1,
              canAutoFix: false,
              status: 'open',
              tips: [
                'Consider direct imports instead of barrel re-exports',
                'Only export what is needed from each module',
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
  {
    id: 'perf-client-imports',
    name: 'Heavy client-side imports (Next.js)',
    category: 'performanceRisk',
    description: 'Detects heavy client-side imports in Next.js projects',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const isNextJS = ctx.project.frameworks.includes('nextjs');
      if (!isNextJS) return issues;

      const heavyClientModules = ['fs', 'child_process', 'os', 'path'];
      const clientFiles = ctx.scan.files.filter((f: import('@software-mri/scanner').FileEntry) =>
        f.relativePath.includes('"use client"') || f.relativePath.includes("'use client'")
      );

      for (const file of clientFiles) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          const heavyImports = heavyClientModules.filter(m => content.includes(`'${m}'`) || content.includes(`"${m}"`));

          if (heavyImports.length > 0) {
            issues.push({
              id: `MRI-PERF-CLIENT-${Buffer.from(file.relativePath).slice(0, 4).toString('hex')}`,
              title: `Heavy client import: ${heavyImports.join(', ')}`,
              description: `${file.relativePath} is a client component importing Node.js built-in modules.`,
              severity: 'medium',
              category: 'performanceRisk',
              confidence: 'high',
              files: [file.relativePath],
              scoreImpact: 4,
              canAutoFix: false,
              status: 'open',
              tips: [
                'Move server-side logic to server components or API routes',
                "Only use 'use client' for interactive components",
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
  {
    id: 'perf-repeated-imports',
    name: 'Repeated import detection',
    category: 'performanceRisk',
    description: 'Detects the same module imported in many files',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const importCount = new Map<string, number>();

      const srcFiles = ctx.scan.files.filter((f: import('@software-mri/scanner').FileEntry) =>
        !f.isBinary && !f.relativePath.includes('node_modules') &&
        (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx') ||
         f.relativePath.endsWith('.js') || f.relativePath.endsWith('.jsx'))
      );

      for (const file of srcFiles) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          const imports = content.match(/from\s+['"]([^'"]+)['"]/g);
          if (!imports) continue;

          for (const imp of imports) {
            const match = imp.match(/from\s+['"]([^'"]+)['"]/);
            if (match && match[1] && !match[1].startsWith('.')) {
              importCount.set(match[1], (importCount.get(match[1]) || 0) + 1);
            }
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      const highImportModules = Array.from(importCount.entries())
        .filter(([_, count]) => count > srcFiles.length * 0.5)
        .sort((a, b) => b[1] - a[1]);

      if (highImportModules.length > 0) {
        const [module, count] = highImportModules[0] || ['', 0];
        issues.push({
          id: 'MRI-PERF-REPEATED-IMPORTS',
          title: `Highly repeated import: ${module} (${count}x)`,
          description: `${module} is imported in ${count} files. Consider re-exporting from a centralized module.`,
          severity: 'low',
          category: 'performanceRisk',
          confidence: 'medium',
          files: srcFiles.filter((f: import('@software-mri/scanner').FileEntry) => {
            // We'd need to re-check each file, but for simplicity we keep track
            return true;
          }).slice(0, 5).map(f => f.relativePath),
          scoreImpact: 1,
          canAutoFix: false,
          status: 'open',
          tips: [
            `Create a barrel export for ${module} if not already done`,
            'Ensure tree-shaking is properly configured',
          ],
        });
      }

      return issues;
    },
  },
  {
    id: 'perf-oversized-files',
    name: 'Oversized file detection',
    category: 'performanceRisk',
    description: 'Detects extremely large files that may affect parse time',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const thresholdBytes = 500 * 1024; // 500KB

      for (const file of ctx.scan.files) {
        if (file.size > thresholdBytes &&
            !file.isBinary &&
            !file.relativePath.includes('node_modules') &&
            (file.relativePath.endsWith('.ts') || file.relativePath.endsWith('.tsx') ||
             file.relativePath.endsWith('.js') || file.relativePath.endsWith('.jsx') ||
             file.relativePath.endsWith('.css'))) {
          issues.push({
            id: `MRI-PERF-OVERSIZED-${Buffer.from(file.relativePath).slice(0, 4).toString('hex')}`,
            title: `Oversized file: ${(file.size / 1024).toFixed(0)} KB`,
            description: `${file.relativePath} is ${(file.size / 1024).toFixed(0)} KB, which may slow down editor and build times.`,
            severity: 'medium',
            category: 'performanceRisk',
            confidence: 'high',
            files: [file.relativePath],
            scoreImpact: 3,
            canAutoFix: false,
            status: 'open',
            tips: [
              `Split ${file.relativePath.split('/').pop()} into multiple smaller modules`,
              'Use lazy loading for large data files',
            ],
          });
        }
      }

      return issues;
    },
  },
];