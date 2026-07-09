import type { CheckRegistration, CheckContext } from '../types.js';

function resolveRelative(fromDir: string, importPath: string): string | null {
  const parts = fromDir.split('/').filter(Boolean);
  const importParts = importPath.replace(/^\.\//, '').split('/');
  for (const part of importParts) {
    if (part === '..') { if (parts.length > 0) parts.pop(); }
    else if (part !== '.') parts.push(part);
  }
  return parts.join('/');
}

export const architectureChecks: CheckRegistration[] = [
  {
    id: 'architecture-large-files',
    name: 'Large file detection',
    category: 'architecture',
    description: 'Detects files that exceed the size threshold',
    enabled: true,
    async run(ctx: CheckContext) {
      const threshold = ctx.config.fileSizeThreshold;
      const linesPerFile = new Map<string, number>();

      for (const file of ctx.scan.files) {
        if (file.isBinary) continue;
        if (!file.path.endsWith('.ts') && !file.path.endsWith('.tsx') &&
            !file.path.endsWith('.js') && !file.path.endsWith('.jsx') &&
            !file.path.endsWith('.css') && !file.path.endsWith('.json')) continue;
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          const lines = content.split('\n').length;
          linesPerFile.set(file.relativePath, lines);
        } catch {
          // skip unreadable
        }
      }

      const issues: import('@mri/core').Issue[] = [];
      for (const [filePath, lines] of linesPerFile) {
        if (lines > threshold) {
          const severity = lines > threshold * 2 ? 'high' : lines > threshold * 1.5 ? 'medium' : 'low';
          issues.push({
            id: `MRI-LARGE-FILE-${Buffer.from(filePath).toString('base64').slice(0, 8)}`,
            title: `Large file: ${lines} lines`,
            description: `${filePath} has ${lines} lines (threshold: ${threshold}). Large files are harder to maintain and understand.`,
            severity,
            category: 'architecture',
            confidence: 'high',
            files: [filePath],
            scoreImpact: severity === 'high' ? 5 : severity === 'medium' ? 3 : 1,
            canAutoFix: false,
            status: 'open',
            tips: [
              `Split ${filePath} into smaller modules (< ${threshold} lines each)`,
              'Extract related functions into separate files',
              'Consider using a barrel export pattern for the new modules',
            ],
          });
        }
      }

      return issues;
    },
  },
  {
    id: 'architecture-deep-nesting',
    name: 'Deep folder nesting detection',
    category: 'architecture',
    description: 'Detects deeply nested folder structures',
    enabled: true,
    async run(ctx: CheckContext) {
      const depthMap = new Map<string, number>();
      for (const file of ctx.scan.files) {
        const parts = file.relativePath.split('/');
        if (parts.length <= 1) continue;
        const dir = parts.slice(0, -1).join('/');
        depthMap.set(dir, Math.max(depthMap.get(dir) || 0, parts.length - 1));
      }

      const issues: import('@mri/core').Issue[] = [];
      for (const [dirPath, depth] of depthMap) {
        if (depth > 6) {
          issues.push({
            id: `MRI-DEEP-${Buffer.from(dirPath).slice(0, 6).toString('hex')}`,
            title: `Deep directory nesting: ${depth} levels`,
            description: `Directory ${dirPath} is ${depth} levels deep. Deep nesting increases cognitive load.`,
            severity: depth > 10 ? 'high' : 'medium',
            category: 'architecture',
            confidence: 'high',
            files: ctx.scan.files.filter((f: import('@mri/scanner').FileEntry) => f.relativePath.startsWith(dirPath)).map(f => f.relativePath),
            scoreImpact: 3,
            canAutoFix: false,
            status: 'open',
            tips: [
              `Flatten the structure under ${dirPath.split('/')[0] || dirPath}`,
              'Group related files by feature, not by type',
              'Aim for max 3-4 levels of nesting',
            ],
          });
        }
      }

      return issues;
    },
  },
  {
    id: 'architecture-orphan-files',
    category: 'architecture',
    name: 'Orphaned file detection',
    description: 'Detects files not imported anywhere',
    enabled: true,
    async run(ctx: CheckContext) {
      const sourceFiles = ctx.scan.files.filter((f: import('@mri/scanner').FileEntry) =>
        f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx') ||
        f.relativePath.endsWith('.js') || f.relativePath.endsWith('.jsx')
      );

      // Collect monorepo workspace package names from root package.json
      const rootPkg = ctx.scan.packageJson;
      const workspacePkgs = new Set<string>();
      if (rootPkg) {
        const workspaces = rootPkg.workspaces as string[] | undefined;
        if (workspaces) {
          for (const ws of workspaces) {
            const glob = ws.replace(/\/\*+$/, '').replace(/\//g, '\\/');
            const match = ctx.scan.files.filter((f: import('@mri/scanner').FileEntry) =>
              new RegExp(`^${glob}/package\\.json$`).test(f.relativePath)
            );
            for (const pkgFile of match) {
              try {
                const content = await import('node:fs/promises').then(fs => fs.readFile(pkgFile.path, 'utf-8'));
                const p = JSON.parse(content);
                if (p.name) workspacePkgs.add(p.name);
              } catch {
                // not a parseable package.json
              }
            }
          }
        }
      }

      const issues: import('@mri/core').Issue[] = [];

      // Build a set of all files referenced by ANY relative import in the project
      const referencedFiles = new Set<string>();
      for (const file of sourceFiles) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          const importRegex = /from\s+['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\)/g;
          let match;
          while ((match = importRegex.exec(content)) !== null) {
            const ref = match[1] || match[2] || '';
            if (ref.startsWith('.')) {
              // Resolve relative path to a root-relative path and strip extension
              const fileDir = file.relativePath.split('/').slice(0, -1).join('/');
              const resolved = resolveRelative(fileDir, ref);
              if (resolved) referencedFiles.add(resolved.replace(/\.(ts|tsx|js|jsx)$/, ''));
            }
          }
        } catch { /* expected */ }
      }

      for (const file of sourceFiles) {
        const ref = file.relativePath.replace(/\.(ts|tsx|js|jsx)$/, '');
        const fileName = file.relativePath.split('/').pop() || '';
        const isRootEntry = ref === 'index' || ref === 'main' || ref === 'app';
        const isIndexFile = fileName === 'index.ts' || fileName === 'index.tsx';

        // Check if any import references this file's path (resolved) or its name
        const isImported = referencedFiles.has(ref);
        const isReferencedInImport = Array.from(referencedFiles).some(r => r.endsWith(ref));

        // Skip monorepo internal packages and index files
        if (isIndexFile) continue;

        if (!isImported && !isReferencedInImport && !isRootEntry) {
          issues.push({
            id: `MRI-ORPHAN-${Buffer.from(file.relativePath).slice(0, 4).toString('hex')}`,
            title: `Potentially orphaned: ${file.relativePath}`,
            description: `${file.relativePath} is not imported by any other file in the project.`,
            severity: 'low',
            category: 'architecture',
            confidence: 'medium',
            files: [file.relativePath],
            scoreImpact: 1,
            canAutoFix: false,
            status: 'open',
            tips: [
              `Check if ${file.relativePath} is still needed`,
              'Remove unused files to reduce maintenance burden',
            ],
          });
        }
      }

      return issues;
    },
  },
];