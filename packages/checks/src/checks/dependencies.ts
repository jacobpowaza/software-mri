import type { CheckRegistration, CheckContext } from '../types.js';

export const dependencyChecks: CheckRegistration[] = [
  {
    id: 'deps-unused',
    name: 'Unused dependency detection',
    category: 'dependencies',
    description: 'Detects dependencies in package.json not imported in the codebase',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const pkg = ctx.scan.packageJson;
      if (!pkg) return issues;

      const allDeps: Record<string, string> = {};
      for (const key of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
        const deps = pkg[key];
        if (deps && typeof deps === 'object') {
          Object.assign(allDeps, deps);
        }
      }

      const srcFiles = ctx.scan.files.filter((f: import('@mri/scanner').FileEntry) =>
        (f.relativePath.startsWith('src/') || f.relativePath === 'index.ts') &&
        (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx') ||
         f.relativePath.endsWith('.js') || f.relativePath.endsWith('.jsx'))
      );

      const usedDeps = new Set<string>();
      for (const file of srcFiles) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          for (const depName of Object.keys(allDeps)) {
            const scoped = depName.startsWith('@') ? depName : depName.split('/')[0] || depName;
            if (content.includes(`from '${depName}'`) || content.includes(`from "${depName}"`) ||
                content.includes(`require('${depName}')`) || content.includes(`require("${depName}")`) ||
                content.includes(`from '${scoped}'`) || content.includes(`from "${scoped}"`)) {
              usedDeps.add(depName);
            }
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      const projectDeps = Object.keys(allDeps);
      const unused = projectDeps.filter(d => !usedDeps.has(d));

      if (unused.length > 0) {
        // Filter out common false positives
        const knownTooling = ['typescript', '@types/node', 'tailwindcss', 'postcss', 'autoprefixer', 'eslint', 'prettier', 'vitest', 'jest', '@types/react', '@types/react-dom', 'ts-node', 'tsx', 'nodemon'];
        const actualUnused = unused.filter(d => !knownTooling.includes(d));

        if (actualUnused.length > 0) {
          issues.push({
            id: 'MRI-UNUSED-DEPS',
            title: `${actualUnused.length} potentially unused ${actualUnused.length === 1 ? 'dependency' : 'dependencies'}`,
            description: `Found ${actualUnused.length} dependencies not imported in source files: ${actualUnused.join(', ')}`,
            severity: 'medium',
            category: 'dependencies',
            confidence: 'medium',
            files: ['package.json'],
            scoreImpact: Math.min(actualUnused.length * 2, 10),
            canAutoFix: false,
            status: 'open',
            tips: [
              `Run \`npm uninstall ${actualUnused[0] || ''}\` to remove unused dependencies`,
              'Consider using tools like depcheck for thorough analysis',
              'Keep dependencies lean to reduce install time and attack surface',
            ],
          });
        }
      }

      return issues;
    },
  },
  {
    id: 'deps-missing',
    name: 'Missing dependency detection',
    category: 'dependencies',
    description: 'Detects imports that reference packages not in package.json',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const pkg = ctx.scan.packageJson;
      if (!pkg) return issues;

      const installedDeps = new Set<string>();
      for (const key of ['dependencies', 'devDependencies', 'peerDependencies'] as const) {
        const deps = pkg[key];
        if (deps && typeof deps === 'object') {
          Object.keys(deps as Record<string, unknown>).forEach(d => installedDeps.add(d));
        }
      }

      const externalImportRegex = /from\s+['"](@[^'"]+\/[^'"]+|[a-z@][^'"/]*)['"]/g;
      const foundPkgs = new Set<string>();

      for (const file of ctx.scan.files) {
        if (file.isBinary) continue;
        if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx') &&
            !file.path.endsWith('.js') && !file.path.endsWith('.jsx')) continue;
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          let match;
          while ((match = externalImportRegex.exec(content)) !== null) {
            const pkgName = match[1] || '';
            if (pkgName && !pkgName.startsWith('.')) {
              foundPkgs.add(pkgName);
            }
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      // Skip workspace packages (monorepo internal packages resolved by name)
      const workspacePkgs = new Set<string>();
      const workspaces = pkg.workspaces as string[] | undefined;
      const workspaceGlobs = workspaces ? [...workspaces] : [];

      // Also check pnpm-workspace.yaml if present
      try {
        const pnpmWc = await import('node:fs/promises').then(fs => fs.readFile(ctx.scan.rootDir + '/pnpm-workspace.yaml', 'utf-8'));
        for (const line of pnpmWc.split('\n')) {
          const m = line.match(/^\s*-\s+"(.+)"\s*$/);
          if (m) workspaceGlobs.push(m[1]!);
        }
      } catch { /* no pnpm-workspace.yaml */ }

      for (const ws of workspaceGlobs) {
          const glob = ws.replace(/\/\*+$/, '').replace(/\//g, '\\/');
          const match = ctx.scan.files.filter((f: import('@mri/scanner').FileEntry) =>
            new RegExp(`^${glob}/package\\.json$`).test(f.relativePath)
          );
          for (const pkgFile of match) {
            try {
              const content = await import('node:fs/promises').then(fs => fs.readFile(pkgFile.path, 'utf-8'));
              const p = JSON.parse(content);
              if (p.name) workspacePkgs.add(p.name);
            } catch { /* expected - fail silently */ }
          }
        }

      // Also skip node: builtins and workspace packages
      const missing = Array.from(foundPkgs).filter(p =>
        !installedDeps.has(p) && !p.startsWith('node:') && !workspacePkgs.has(p)
      );

      if (missing.length > 0) {
        issues.push({
          id: 'MRI-MISSING-DEPS',
          title: `${missing.length} missing ${missing.length === 1 ? 'dependency' : 'dependencies'}`,
          description: `Found imports referencing packages not in package.json: ${missing.join(', ')}`,
          severity: 'high',
          category: 'dependencies',
          confidence: 'high',
          files: ['package.json'],
          scoreImpact: Math.min(missing.length * 5, 15),
          canAutoFix: false,
          status: 'open',
          tips: [`Run \`npm install ${missing[0] || ''}\` to add the missing dependency`],
        });
      }

      return issues;
    },
  },
  {
    id: 'deps-bloat',
    name: 'Dependency bloat detection',
    category: 'dependencies',
    description: 'Flags projects with excessive dependency counts',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const pkg = ctx.scan.packageJson;
      if (!pkg) return issues;

      const deps = pkg.dependencies as Record<string, string> | undefined;
      const devDeps = pkg.devDependencies as Record<string, string> | undefined;

      const depCount = deps ? Object.keys(deps).length : 0;
      const devDepCount = devDeps ? Object.keys(devDeps).length : 0;
      const total = depCount + devDepCount;

      const srcFiles = ctx.scan.files.filter((f: import('@mri/scanner').FileEntry) =>
        f.relativePath.startsWith('src/') || f.relativePath === 'index.ts'
      );

      if (total > 100) {
        issues.push({
          id: 'MRI-DEPS-BLOAT',
          title: `High dependency count: ${total}`,
          description: `Package has ${depCount} runtime and ${devDepCount} dev dependencies. This increases install time, build time, and attack surface.`,
          severity: 'medium',
          category: 'dependencies',
          confidence: 'high',
          files: ['package.json'],
          scoreImpact: total > 200 ? 8 : 4,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Audit which dependencies are actually used in the codebase',
            'Remove unused dependencies',
            'Consolidate libraries that serve similar purposes',
          ],
        });
      }

      return issues;
    },
  },
  {
    id: 'deps-unpinned',
    name: 'Unpinned dependency versions',
    category: 'dependencies',
    description: 'Flags dependencies using range specifiers instead of exact versions',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const pkg = ctx.scan.packageJson;
      if (!pkg) return issues;

      const allDeps: Record<string, string> = {};
      for (const key of ['dependencies', 'devDependencies'] as const) {
        const deps = pkg[key];
        if (deps && typeof deps === 'object') {
          Object.assign(allDeps, deps as Record<string, string>);
        }
      }

      const unpinned: string[] = [];
      for (const [name, version] of Object.entries(allDeps)) {
        if (version.startsWith('^') || version.startsWith('~') || version.includes('*') || version.includes('x')) {
          unpinned.push(name);
        }
      }

      if (unpinned.length > 0) {
        issues.push({
          id: 'MRI-UNPINNED-DEPS',
          title: `${unpinned.length} unpinned ${unpinned.length === 1 ? 'dependency' : 'dependencies'}`,
          description: `${unpinned.length} dependencies use range specifiers (^/~). This can cause different installs to get different versions.`,
          severity: 'medium',
          category: 'dependencies',
          confidence: 'high',
          files: ['package.json'],
          scoreImpact: Math.min(unpinned.length, 8),
          canAutoFix: true,
          status: 'open',
          tips: [
            'Pin dependency versions for production stability',
            'Use exact versions to ensure reproducible builds',
            'Set `save-exact=true` in .npmrc',
          ],
        });
      }

      return issues;
    },
  },
];