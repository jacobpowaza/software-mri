import type { CheckRegistration, CheckContext } from '../types.js';
import type { Issue } from '@software-mri/core';
import { readFile } from 'node:fs/promises';

export const comprehensiveChecks: CheckRegistration[] = [

  // Check 1: TODO/FIXME/HACK density
  {
    id: 'todo-density',
    name: 'TODO/FIXME Density',
    category: 'maintainability',
    description: 'Counts TODO, FIXME, HACK, XXX comments per source file to flag technical debt hotspots',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const sourceFiles = ctx.scan.files.filter(f =>
        /\.(ts|tsx|js|jsx|py|rb|go|rs|java)$/.test(f.relativePath)
      );
      const pattern = /\b(TODO|FIXME|HACK|XXX)\b/g;
      const fileCounts: { file: string; count: number }[] = [];

      for (const file of sourceFiles.slice(0, 100)) {
        try {
          const content = await readFile(file.path, 'utf-8');
          const matches = content.match(pattern);
          if (matches && matches.length > 5) {
            fileCounts.push({ file: file.relativePath, count: matches.length });
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      if (fileCounts.length > 0) {
        fileCounts.sort((a, b) => b.count - a.count);
        const total = fileCounts.reduce((s, f) => s + f.count, 0);
        issues.push({
          id: 'MRI-TODO-DENSITY',
          title: `High TODO/FIXME density (${total} markers across ${fileCounts.length} files)`,
          description: `${fileCounts.length} source files have more than 5 TODO/FIXME/HACK/XXX comments each. This indicates accumulating technical debt that should be reviewed.`,
          severity: fileCounts.length > 10 ? 'high' : 'medium',
          category: 'maintainability',
          confidence: 'high',
          files: fileCounts.slice(0, 10).map(f => f.file),
          scoreImpact: fileCounts.length > 10 ? 8 : 4,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Schedule a sprint to resolve outstanding TODO/FIXME items',
            'Track unresolved TODOs as issues in your project tracker',
            'Consider adding a CI lint rule to warn on new TODO markers',
          ],
        });
      }

      return issues;
    },
  },

  // Check 2: Circular dependency detection (heuristic)
  {
    id: 'circular-deps',
    name: 'Circular Dependencies',
    category: 'architecture',
    description: 'Heuristic detection of circular dependencies between source directories',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const dirs = new Set<string>();
      const importGraph = new Map<string, Set<string>>();

      const sourceFiles = ctx.scan.files.filter(f =>
        /\.(ts|tsx|js|jsx)$/.test(f.relativePath) &&
        f.relativePath.startsWith('src/')
      );

      for (const file of sourceFiles.slice(0, 150)) {
        try {
          const content = await readFile(file.path, 'utf-8');
          const importRegex = /from\s+['"](\.\.?\/(.+?))['"]/g;
          let match;
          const fileDir = file.relativePath.split('/').slice(0, -1).join('/');
          dirs.add(fileDir);
          while ((match = importRegex.exec(content)) !== null) {
            const target = match[2] || '';
            const targetDir = target.split('/').slice(0, -1).join('/') || '.';
            if (!importGraph.has(fileDir)) importGraph.set(fileDir, new Set());
            importGraph.get(fileDir)!.add(targetDir);
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      const visited = new Set<string>();
      const stack = new Set<string>();

      function findCycle(start: string): string[] {
        if (stack.has(start)) return [start];
        if (visited.has(start)) return [];
        visited.add(start);
        stack.add(start);
        const neighbors = importGraph.get(start);
        if (neighbors) {
          for (const n of neighbors) {
            const result = findCycle(n);
            if (result.length > 0) {
              if (result[0] === start) return [start];
              if (result.includes(start)) return result;
              if (result[0] && stack.has(result[0])) return [start, ...result];
            }
          }
        }
        stack.delete(start);
        return [];
      }

      const allDirs = Array.from(dirs).slice(0, 50);
      for (const dir of allDirs) {
        const cycle = findCycle(dir);
        if (cycle.length > 1) {
          issues.push({
            id: `MRI-CIRC-DEPS-${Buffer.from(dir).toString('base64url').slice(0, 12)}`,
            title: `Potential circular dependency involving ${dir}`,
            description: `The import graph suggests a potential circular dependency cycle: ${cycle.join(' -> ')}. Circular dependencies can cause runtime errors and make code harder to reason about.`,
            severity: 'medium',
            category: 'architecture',
            confidence: 'medium',
            files: cycle.map(d => '(' + d + ')'),
            scoreImpact: 5,
            canAutoFix: false,
            status: 'open',
            tips: [
              'Extract shared logic into a separate module both directories can import',
              'Use dependency injection to break the cycle',
              'Consider restructuring to enforce a unidirectional data flow',
            ],
          });
        }
      }

      return issues;
    },
  },

  // Check 3: Package.json engines check
  {
    id: 'engine-check',
    name: 'Engine Version Requirement',
    category: 'configHealth',
    description: 'Checks if package.json specifies required Node and package manager engine versions',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const pkgFile = ctx.scan.files.find(f => f.relativePath === 'package.json');
      if (!pkgFile) return issues;

      try {
        const content = await readFile(pkgFile.path, 'utf-8');
        const pkg = JSON.parse(content);
        if (!pkg.engines) {
          issues.push({
            id: 'MRI-ENGINE-MISSING',
            title: 'No engine requirements specified',
            description: 'package.json does not specify `engines` to pin Node.js and package manager versions.',
            severity: 'low',
            category: 'configHealth',
            confidence: 'high',
            files: ['package.json'],
            scoreImpact: 2,
            canAutoFix: true,
            status: 'open',
            tips: [
              'Add `"engines": { "node": ">=18.0.0", "pnpm": ">=8.0.0" }` to package.json',
              'Use .nvmrc or .node-version for local tooling',
            ],
          });
        } else if (!pkg.engines.node && !pkg.engines.pnpm && !pkg.engines.yarn && !pkg.engines.npm) {
          issues.push({
            id: 'MRI-ENGINE-EMPTY',
            title: 'Engine field is empty',
            description: 'The engines field in package.json exists but does not specify any version requirements.',
            severity: 'info',
            category: 'configHealth',
            confidence: 'high',
            files: ['package.json'],
            scoreImpact: 1,
            canAutoFix: true,
            status: 'open',
            tips: ['Populate the engines field with `node`, `pnpm`/`npm`, or both'],
          });
        }
      } catch {
        /* expected - silent fail is intentional */
      }

      return issues;
    },
  },

  // Check 4: Duplicate CSS/class definitions
  {
    id: 'css-duplicate',
    name: 'Duplicate CSS Classes',
    category: 'duplicates',
    description: 'Detects CSS class names used in more than one CSS file (potential style conflicts)',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const cssFiles = ctx.scan.files.filter(f =>
        /\.css$/.test(f.relativePath)
      ).slice(0, 50);

      const classMap = new Map<string, string[]>();
      const classRegex = /\.([a-zA-Z_-][\w-]*)\s*\{/g;

      for (const file of cssFiles) {
        try {
          const content = await readFile(file.path, 'utf-8');
          let match;
          while ((match = classRegex.exec(content)) !== null) {
            const cls = match[1]!;
            if (!classMap.has(cls)) classMap.set(cls, []);
            classMap.get(cls)!.push(file.relativePath);
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      const conflicts = Array.from(classMap.entries())
        .filter(([_, files]) => files.length > 1)
        .slice(0, 5);

      for (const [cls, files] of conflicts) {
        issues.push({
          id: `MRI-CSS-DUP-${Buffer.from(cls).toString('base64url').slice(0, 12)}`,
          title: `CSS class ".${cls}" defined in ${files.length} files`,
          description: `The CSS class "${cls}" is defined in ${files.length} different CSS files. This can cause style conflicts at runtime.`,
          severity: 'medium',
          category: 'duplicates',
          confidence: 'high',
          files,
          scoreImpact: 4,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Use CSS Modules or CSS-in-JS to scope styles to components',
            'Rename conflicting classes or extract shared ones to a single file',
          ],
        });
      }

      return issues;
    },
  },

  // Check 5: Hardcoded credentials detection
  {
    id: 'sec-hardcoded-credentials',
    name: 'Hardcoded Credentials',
    category: 'securityHygiene',
    description: 'Detects potential hardcoded API keys, passwords, and tokens in source files',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const sourceFiles = ctx.scan.files.filter(f =>
        /\.(ts|tsx|js|jsx|py|rb|env)$/.test(f.relativePath) &&
        !/node_modules|\.next|dist|build/.test(f.relativePath)
      );

      const patterns: { regex: RegExp; label: string }[] = [
        { regex: /['"]?(?:api[_-]?key|apikey)['"]?\s*[:=]\s*['"]([A-Za-z0-9_-]{16,})['"]/i, label: 'API key' },
        { regex: /['"]?(?:secret|password|passwd|pwd)['"]?\s*[:=]\s*['"]([^'"]{8,})['"]/i, label: 'secret/password' },
        { regex: /['"]?(?:token|jwt|auth[_-]?token)['"]?\s*[:=]\s*['"]([A-Za-z0-9._-]{16,})['"]/i, label: 'token' },
        { regex: /['"]?(?:private[_-]?key|secret[_-]?key)['"]?\s*[:=]\s*['"]-----BEGIN/i, label: 'private key (PEM)' },
      ];

      for (const file of sourceFiles.slice(0, 100)) {
        try {
          const content = await readFile(file.path, 'utf-8');
          for (const { regex, label } of patterns) {
            if (regex.test(content)) {
              issues.push({
                id: `MRI-HARDCODED-${Buffer.from(label).toString('base64url').slice(0, 12)}`,
                title: `Possible hardcoded ${label} in ${file.relativePath}`,
                description: `A potential ${label} value was detected in source code. This could expose credentials if committed.`,
                severity: 'high',
                category: 'securityHygiene',
                confidence: 'medium',
                files: [file.relativePath],
                scoreImpact: 8,
                canAutoFix: false,
                status: 'open',
                tips: [
                  'Move secrets to environment variables (process.env) or a secrets manager',
                  'Check .gitignore to ensure .env files are not tracked by git',
                  'Consider using a pre-commit hook like git-secrets to block accidental commits',
                ],
              });
              break;
            }
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      return issues;
    },
  },

  // Check 6: Missing TypeScript definitions for dependencies
  {
    id: 'ts-missing-types',
    name: 'Missing Type Definitions',
    category: 'typeSafety',
    description: 'Checks if packages without @types/* counterparts have corresponding type packages available',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const pkgFile = ctx.scan.files.find(f => f.relativePath === 'package.json');
      if (!pkgFile) return issues;

      try {
        const content = await readFile(pkgFile.path, 'utf-8');
        const pkg = JSON.parse(content);
        const deps = { ...pkg.dependencies, ...pkg.devDependencies };
        const depNames = Object.keys(deps || {});

        const typeCandidates = depNames
          .filter(d => !d.startsWith('@types/') && !d.startsWith('@') && !d.startsWith('node:'))
          .slice(0, 30);

        const hasBuiltInTypes = new Set([
          'react', 'react-dom', 'next', 'express', 'vue', 'svelte', 'typescript',
          'chalk', 'ink', 'prettier', 'eslint', 'vitest', 'jest', 'prisma',
        ]);

        const missing = typeCandidates.filter(d => {
          if (hasBuiltInTypes.has(d)) return false;
          const typeName = `@types/${d}`;
          return !depNames.some(n => n === typeName);
        });

        if (missing.length > 3) {
          issues.push({
            id: 'MRI-MISSING-TYPES',
            title: `Missing @types/ packages for ${missing.length} dependencies`,
            description: `${missing.length} dependencies (e.g., ${missing.slice(0, 5).join(', ')}) lack corresponding @types/ definitions in package.json.`,
            severity: missing.length > 10 ? 'high' : 'medium',
            category: 'typeSafety',
            confidence: 'medium',
            files: ['package.json'],
            scoreImpact: Math.min(missing.length, 10),
            canAutoFix: true,
            status: 'open',
            tips: [
              `Run: npm install --save-dev ${missing.slice(0, 5).map(d => `@types/${d}`).join(' ')}`,
              'Check each package documentation for bundled TypeScript types',
              'For packages without types, create a .d.ts file in your project',
            ],
          });
        }
      } catch {
        /* expected - silent fail is intentional */
      }

      return issues;
    },
  },

  // Check 7: Unnecessary try-catch wrapping (empty catch blocks)
  {
    id: 'empty-catch',
    name: 'Empty Catch Blocks',
    category: 'maintainability',
    description: 'Detects empty or bare catch blocks that swallow errors silently',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const sourceFiles = ctx.scan.files.filter(f =>
        /\.(ts|tsx|js|jsx)$/.test(f.relativePath)
      ).slice(0, 80);

      for (const file of sourceFiles) {
        try {
          const content = await readFile(file.path, 'utf-8');
          const emptyCatchRegex = /catch\s*(\([^)]*\))?\s*\{\s*(\/\/[^\n]*\n|\s)*\s*\}/g;
          const matches = content.match(emptyCatchRegex);
          if (matches && matches.length > 0) {
            issues.push({
              id: `MRI-EMPTY-CATCH-${Buffer.from(file.relativePath).toString('base64url').slice(0, 12)}`,
              title: `Empty catch block(s) in ${file.relativePath} (${matches.length} found)`,
              description: `Source file has ${matches.length} empty catch block(s) that silently swallow exceptions. This can make debugging very difficult.`,
              severity: 'medium',
              category: 'maintainability',
              confidence: 'high',
              files: [file.relativePath],
              scoreImpact: 3,
              canAutoFix: false,
              status: 'open',
              tips: [
                'Log the error: `catch (err) { console.error("failed to X:", err); }`',
                'Rethrow or handle the error appropriately instead of swallowing it',
                'Add a meaningful comment explaining why the catch is empty if intentional',
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

  // Check 8: Async function without await
  {
    id: 'async-no-await',
    name: 'Unnecessary async',
    category: 'maintainability',
    description: 'Detects async functions that do not contain any await expressions',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const sourceFiles = ctx.scan.files.filter(f =>
        /\.(ts|tsx|js|jsx)$/.test(f.relativePath)
      ).slice(0, 80);

      for (const file of sourceFiles) {
        try {
          const content = await readFile(file.path, 'utf-8');
          const asyncRegex = /async\s+(?:function\s+\w*\s*)?\(/g;
          if (!asyncRegex.test(content)) continue;
          if (content.includes('await ')) continue;

          issues.push({
            id: `MRI-ASYNC-NO-AWAIT-${Buffer.from(file.relativePath).toString('base64url').slice(0, 12)}`,
            title: `Async function in ${file.relativePath} never awaits`,
            description: 'An async function was found without any `await` expressions. This adds unnecessary overhead and may indicate a bug.',
            severity: 'low',
            category: 'maintainability',
            confidence: 'medium',
            files: [file.relativePath],
            scoreImpact: 1,
            canAutoFix: false,
            status: 'open',
            tips: [
              'Remove the async keyword if no asynchronous operations are performed',
              'Ensure you are not forgetting to await a Promise-returning function',
            ],
          });
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      return issues;
    },
  },

  // Check 9: Direct DOM manipulation in React/Next.js files
  {
    id: 'direct-dom-mutation',
    name: 'Direct DOM Manipulation',
    category: 'architecture',
    description: 'Detects direct DOM manipulation (document.getElementById, innerHTML) in React/Next.js files',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      if (!ctx.project.frameworks.includes('react') && !ctx.project.frameworks.includes('nextjs')) return issues;

      const reactFiles = ctx.scan.files.filter(f =>
        /\.(tsx|jsx)$/.test(f.relativePath)
      ).slice(0, 80);

      const domPatterns: RegExp[] = [
        /document\.getElementById/,
        /document\.querySelector/,
        /\.innerHTML\s*=/,
        /document\.createElement/,
        /\.appendChild\(/,
      ];

      for (const file of reactFiles) {
        try {
          const content = await readFile(file.path, 'utf-8');
          for (const pat of domPatterns) {
            if (pat.test(content)) {
              issues.push({
                id: `MRI-DIRECT-DOM-${Buffer.from(file.relativePath).toString('base64url').slice(0, 12)}`,
                title: `Direct DOM manipulation in React component (${file.relativePath})`,
                description: `${file.relativePath} uses direct DOM APIs (detected: ${pat.source}). In React, use refs or declarative rendering instead.`,
                severity: 'medium',
                category: 'architecture',
                confidence: 'high',
                files: [file.relativePath],
                scoreImpact: 4,
                canAutoFix: false,
                status: 'open',
                tips: [
                  'Use React.createRef() or useRef() hooks for DOM access',
                  'Use state-driven rendering instead of direct DOM mutations',
                  'For animations, prefer CSS transitions or libraries like Framer Motion',
                ],
              });
              break;
            }
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      return issues;
    },
  },

  // Check 10: Environment-specific code without guards
  {
    id: 'env-specific-guards',
    name: 'Missing Environment Guards',
    category: 'configHealth',
    description: 'Detects environment-specific code (process.env) used without fallbacks or validation',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const sourceFiles = ctx.scan.files.filter(f =>
        /\.(ts|tsx|js|jsx)$/.test(f.relativePath) &&
        !f.relativePath.includes('node_modules')
      ).slice(0, 60);

      for (const file of sourceFiles) {
        try {
          const content = await readFile(file.path, 'utf-8');
          const envAccessRegex = /process\.env\.(\w+)/g;
          const matches = Array.from(content.matchAll(envAccessRegex));
          if (matches.length > 0) {
            const bareAccesses = matches.filter(m => {
              const varName = m[1]!;
              const idx = m.index || 0;
              const contextBefore = content.slice(Math.max(0, idx - 30), idx);
              const contextAfter = content.slice(idx, idx + 60);
              return !contextBefore.includes('??') && !contextAfter.includes('??') &&
                     !contextBefore.includes('||') && !contextAfter.includes('||') &&
                     !contextBefore.includes('!') && !contextAfter.includes('!');
            });

            if (bareAccesses.length > 0) {
              const vars = bareAccesses.map(m => m[1]!).filter(Boolean);
              issues.push({
                id: `MRI-ENV-GUARD-${Buffer.from(file.relativePath).toString('base64url').slice(0, 12)}`,
                title: `Unguarded process.env access in ${file.relativePath} (${vars.slice(0, 4).join(', ')}${vars.length > 4 ? '...' : ''})`,
                description: `Found ${bareAccesses.length} environment accesses without fallback defaults. Missing variables will be undefined at runtime.`,
                severity: 'low',
                category: 'configHealth',
                confidence: 'medium',
                files: [file.relativePath],
                scoreImpact: 2,
                canAutoFix: false,
                status: 'open',
                tips: [
                  'Use `process.env.VAR ?? "default"` to provide a fallback value',
                  'Consider a validation library like zod or envalid to validate env vars at startup',
                  'Group all env reads into a central config module',
                ],
              });
            }
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      return issues;
    },
  },

  // Check 11: Mixed import styles
  {
    id: 'mixed-import-styles',
    name: 'Mixed Import Styles',
    category: 'maintainability',
    description: 'Detects files that mix CommonJS (require) and ESM (import) syntax',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const sourceFiles = ctx.scan.files.filter(f =>
        /\.(ts|tsx)$/.test(f.relativePath)
      ).slice(0, 60);

      for (const file of sourceFiles) {
        try {
          const content = await readFile(file.path, 'utf-8');
          // Skip lines where require appears inside regex literals or comments
          const lines = content.split('\n');
          const cjsLines = lines.filter(l => /\brequire\s*\(/.test(l) && !/\/\/.*require/.test(l) && !/regex|RegExp/.test(l));
          const esmLines = lines.filter(l => /^import\s/.test(l) && !/\/\/.*import/.test(l));
          const hasESM = esmLines.length > 0;
          const hasCJS = cjsLines.length > 0;
          if (hasESM && hasCJS) {
            issues.push({
              id: `MRI-MIXED-IMPORT-${Buffer.from(file.relativePath).toString('base64url').slice(0, 12)}`,
              title: `Mixed import styles in ${file.relativePath} (${esmLines.length} ESM, ${cjsLines.length} CJS)`,
              description: 'This file uses both `import/export` (ESM) and `require/module.exports` (CommonJS). Modern TypeScript projects should prefer ESM.',
              severity: 'low',
              category: 'maintainability',
              confidence: 'high',
              files: [file.relativePath],
              scoreImpact: 1,
              canAutoFix: true,
              status: 'open',
              tips: [
                'Convert `require()` calls to `import` statements',
                'Set `"type": "module"` in package.json for ESM mode',
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

  // Check 12: Large CSS bundles
  {
    id: 'large-css-bundle',
    name: 'Large CSS Files',
    category: 'performanceRisk',
    description: 'Flags CSS files over 50 KB that may cause render-blocking',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const cssFiles = ctx.scan.files.filter(f =>
        /\.css$/.test(f.relativePath)
      );

      for (const file of cssFiles) {
        if (file.size > 50000) {
          issues.push({
            id: `MRI-LARGE-CSS-${Buffer.from(file.relativePath).toString('base64url').slice(0, 12)}`,
            title: `Large CSS file: ${file.relativePath} (${(file.size / 1024).toFixed(0)} KB)`,
            description: 'CSS files over 50 KB can cause render-blocking delays. Consider code-splitting or using CSS modules.',
            severity: 'medium',
            category: 'performanceRisk',
            confidence: 'high',
            files: [file.relativePath],
            scoreImpact: 3,
            canAutoFix: false,
            status: 'open',
            tips: [
              'Split into component-level CSS files (CSS Modules)',
              'Remove unused CSS rules with PurgeCSS',
              'Consider using utility-first CSS (Tailwind) to eliminate dead styles',
            ],
          });
        }
      }

      return issues;
    },
  },

  // Check 13: Deprecated API usage
  {
    id: 'deprecated-apis',
    name: 'Deprecated API Usage',
    category: 'maintainability',
    description: 'Scans for usage of deprecated or removed Node.js and browser APIs',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const sourceFiles = ctx.scan.files.filter(f =>
        /\.(ts|tsx|js|jsx)$/.test(f.relativePath)
      ).slice(0, 80);

      const deprecatedApis: { regex: RegExp; api: string; fix: string }[] = [
        { regex: /\.substr\(/g, api: '.substr()', fix: 'Use .slice() or .substring() instead - .substr() is deprecated' },
        { regex: /url\.parse\(/g, api: 'url.parse()', fix: 'Use the URL constructor: new URL()' },
        { regex: /fs\.exists\b/g, api: 'fs.exists()', fix: 'Use fs.stat() or fs.access() instead' },
        { regex: /child_process\.exec\(/g, api: 'child_process.exec()', fix: 'Use execFile() or spawn() for better security' },
        { regex: /request\(/g, api: 'request library', fix: 'Use fetch(), got, or axios instead (request is deprecated)' },
      ];

      for (const file of sourceFiles) {
        try {
          const content = await readFile(file.path, 'utf-8');
          for (const entry of deprecatedApis) {
            entry.regex.lastIndex = 0;
            if (entry.regex.test(content)) {
              issues.push({
                id: `MRI-DEP-${file.relativePath.replace(/[^a-zA-Z0-9]/g, '-')}-${entry.api.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 10)}`,
                title: `${entry.api} deprecated - used in ${file.relativePath}`,
                description: entry.fix,
                severity: 'low',
                category: 'maintainability',
                confidence: 'high',
                files: [file.relativePath],
                scoreImpact: 1,
                canAutoFix: false,
                status: 'open',
                tips: [entry.fix],
              });
              break;
            }
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      return issues;
    },
  },

  // Check 14: Missing JSDoc on exported functions
  {
    id: 'missing-documentation',
    name: 'Missing JSDoc on Exports',
    category: 'maintainability',
    description: 'Flags exported functions/classes without JSDoc comments in utility modules',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const utilFiles = ctx.scan.files.filter(f =>
        /\.(ts|tsx)$/.test(f.relativePath) &&
        (f.relativePath.includes('/utils/') || f.relativePath.includes('/helpers/') || f.relativePath.includes('/lib/'))
      ).slice(0, 50);

      for (const file of utilFiles) {
        try {
          const content = await readFile(file.path, 'utf-8');
          const exportRegex = /export\s+(?:default\s+)?(?:async\s+)?function\s+(\w+)/g;
          const exports = Array.from(content.matchAll(exportRegex))
            .map(m => m[1]!).filter(Boolean);

          const undocumented = exports.filter(name => {
            const idx = content.indexOf(`function ${name}`);
            const before = content.slice(Math.max(0, idx - 60), idx);
            return !before.includes('/**');
          });

          if (undocumented.length > 0) {
            issues.push({
              id: `MRI-MISSING-DOCS-${Buffer.from(file.relativePath).toString('base64url').slice(0, 12)}`,
              title: `Exports in ${file.relativePath} without JSDoc (${undocumented.length})`,
              description: `Utils/lib files should document exported functions. Missing: ${undocumented.slice(0, 5).join(', ')}`,
              severity: 'info',
              category: 'maintainability',
              confidence: 'medium',
              files: [file.relativePath],
              scoreImpact: 0,
              canAutoFix: true,
              status: 'open',
              tips: [
                'Add JSDoc comments to exported functions',
                'Consider enabling the JSDoc ESLint plugin',
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

  // Check 15: JSON.parse/stringify in hot code paths
  {
    id: 'json-serialization-hotpath',
    name: 'JSON.parse in Hot Path',
    category: 'performanceRisk',
    description: 'Detects JSON.parse or JSON.stringify in loops or heavily-used functions',
    enabled: true,
    async run(ctx: CheckContext): Promise<Issue[]> {
      const issues: Issue[] = [];
      const sourceFiles = ctx.scan.files.filter(f =>
        /\.(ts|tsx|js|jsx)$/.test(f.relativePath)
      ).slice(0, 60);

      for (const file of sourceFiles) {
        try {
          const content = await readFile(file.path, 'utf-8');
          const lines = content.split('\n');
          let loopDepth = 0;
          for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i]!.trim();
            if (/for\s*\(|while\s*\(|\.forEach\s*\(|\.map\s*\(/.test(trimmed) && !trimmed.startsWith('//')) {
              loopDepth++;
            } else if (trimmed === '}' && loopDepth > 0) {
              loopDepth--;
            }

            if (loopDepth > 0 && (trimmed.includes('JSON.parse(') || trimmed.includes('JSON.stringify('))) {
              issues.push({
                id: `MRI-JSON-HOTPATH-${Buffer.from(file.relativePath).toString('base64url').slice(0, 12)}-L${i + 1}`,
                title: `JSON serialization inside loop in ${file.relativePath}:${i + 1}`,
                description: 'JSON.parse/JSON.stringify inside loops can cause significant performance degradation.',
                severity: 'low',
                category: 'performanceRisk',
                confidence: 'medium',
                files: [file.relativePath],
                scoreImpact: 2,
                canAutoFix: false,
                status: 'open',
                tips: [
                  'Move JSON operations outside the loop when possible',
                  'Cache parsed results to avoid repeated parsing',
                  'Consider using structuredClone() or Object.assign() instead of parse/stringify for deep copies',
                ],
              });
              break;
            }
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      return issues;
    },
  },
];
