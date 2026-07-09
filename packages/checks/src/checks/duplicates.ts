import type { CheckRegistration, CheckContext } from '../types.js';

export const duplicateChecks: CheckRegistration[] = [
  {
    id: 'dup-functions',
    name: 'Duplicate function detection',
    category: 'duplicates',
    description: 'Detects similar or identical functions across files',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];

      const srcFiles = ctx.scan.files.filter((f: import('@mri/scanner').FileEntry) =>
        f.relativePath.startsWith('src/') && !f.isBinary &&
        (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx') ||
         f.relativePath.endsWith('.js') || f.relativePath.endsWith('.jsx'))
      );

      const functionSignatures = new Map<string, string[]>();

      for (const file of srcFiles.slice(0, 200)) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          const funcMatches = content.match(/(?:export\s+)?(?:async\s+)?function\s+(\w+)/g);
          if (funcMatches) {
            for (const match of funcMatches) {
              const name = match.replace(/export\s+/, '').replace(/async\s+/, '').replace(/function\s+/, '');
              const existing = functionSignatures.get(name) || [];
              existing.push(file.relativePath);
              functionSignatures.set(name, existing);
            }
          }
        } catch {
          /* expected - silent fail is intentional */
        }
      }

      for (const [name, files] of functionSignatures) {
        if (files.length > 3 && name !== 'default' && name !== 'getStaticProps' &&
            name !== 'getServerSideProps' && name !== 'handler' && name !== 'middleware') {
          issues.push({
            id: `MRI-DUP-FUNC-${Buffer.from(name).slice(0, 6).toString('hex')}`,
            title: `Function "${name}" defined in ${files.length} files`,
            description: `The function "${name}" appears in ${files.length} files. This may indicate duplicated logic.`,
            severity: 'medium',
            category: 'duplicates',
            confidence: 'medium',
            files: files.slice(0, 10),
            scoreImpact: 3,
            canAutoFix: false,
            status: 'open',
            tips: [
              `Extract the shared "${name}" logic into a shared utility module`,
              'Consolidate implementations and remove duplicates',
            ],
          });
        }
      }

      return issues;
    },
  },
];