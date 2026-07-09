import type { CheckRegistration, CheckContext } from '../types.js';

export const securityChecks: CheckRegistration[] = [
  {
    id: 'sec-eval',
    name: 'eval usage detection',
    category: 'securityHygiene',
    description: 'Detects unsafe eval() calls in source files',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const srcFiles = ctx.scan.files.filter((f: import('@software-mri/scanner').FileEntry) =>
        f.relativePath.startsWith('src/') && !f.isBinary &&
        (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx') ||
         f.relativePath.endsWith('.js') || f.relativePath.endsWith('.jsx'))
      );

      for (const file of srcFiles) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          if (content.includes('eval(') || content.includes('Function(')) {
            issues.push({
              id: `MRI-SEC-EVAL-${Buffer.from(file.relativePath).slice(0, 4).toString('hex')}`,
              title: 'Unsafe eval() or Function() usage',
              description: `${file.relativePath} contains eval() or Function() constructor usage. These can lead to code injection attacks.`,
              severity: 'high',
              category: 'securityHygiene',
              confidence: 'high',
              files: [file.relativePath],
              scoreImpact: 8,
              canAutoFix: false,
              status: 'open',
              tips: [
                'Replace eval() with safer alternatives',
                'Use JSON.parse for JSON strings',
                'Use Function constructors only when absolutely necessary',
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
    id: 'sec-console-log',
    name: 'Console.log in source files',
    category: 'securityHygiene',
    description: 'Detects console.log statements in production source files',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const srcFiles = ctx.scan.files.filter((f: import('@software-mri/scanner').FileEntry) =>
        f.relativePath.startsWith('src/') && !f.relativePath.endsWith('.test.ts') &&
        !f.relativePath.endsWith('.spec.ts') && !f.isBinary &&
        (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx') ||
         f.relativePath.endsWith('.js') || f.relativePath.endsWith('.jsx'))
      );

      for (const file of srcFiles) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          const lines = content.split('\n');
          const consoleLines = lines
            .map((line, i) => ({ line: i + 1, text: line }))
            .filter(l => l.text.includes('console.log') && !l.text.includes('//'));

          if (consoleLines.length > 0 && !file.relativePath.includes('logger') && !file.relativePath.includes('log')) {
            issues.push({
              id: `MRI-SEC-CONSOLE-${Buffer.from(file.relativePath).slice(0, 4).toString('hex')}`,
              title: `console.log found in ${consoleLines.length} ${consoleLines.length === 1 ? 'location' : 'locations'}`,
              description: `${file.relativePath} has ${consoleLines.length} console.log statements that should be removed before production.`,
              severity: 'low',
              category: 'securityHygiene',
              confidence: 'high',
              files: [file.relativePath],
              scoreImpact: 1,
              canAutoFix: true,
              status: 'open',
              tips: [
                'Remove console.log statements before production',
                'Use a proper logging library for production logging',
                'Consider using eslint no-console rule',
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
    id: 'sec-hardcoded-urls',
    name: 'Hardcoded localhost URLs',
    category: 'securityHygiene',
    description: 'Detects hardcoded localhost URLs in source files',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const srcFiles = ctx.scan.files.filter((f: import('@software-mri/scanner').FileEntry) =>
        f.relativePath.startsWith('src/') && !f.isBinary &&
        (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx') ||
         f.relativePath.endsWith('.js') || f.relativePath.endsWith('.jsx'))
      );

      for (const file of srcFiles) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          const localhostPattern = /http:\/\/localhost(:\d+)?/g;
          const matches = content.match(localhostPattern);

          if (matches && matches.length > 0 && !file.relativePath.includes('config') && !file.relativePath.includes('setup')) {
            issues.push({
              id: `MRI-SEC-LOCALHOST-${Buffer.from(file.relativePath).slice(0, 4).toString('hex')}`,
              title: `Hardcoded localhost URLs (${matches.length})`,
              description: `${file.relativePath} contains hardcoded localhost URLs. These should use environment variables.`,
              severity: 'medium',
              category: 'securityHygiene',
              confidence: 'high',
              files: [file.relativePath],
              scoreImpact: 3,
              canAutoFix: false,
              status: 'open',
              tips: [
                'Use environment variables for API URLs',
                'Set different values for development and production',
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
    id: 'sec-missing-gitignore',
    name: 'Missing .gitignore entries',
    category: 'securityHygiene',
    description: 'Checks for common missing .gitignore entries',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const hasGitignore = ctx.scan.files.some(f => f.relativePath === '.gitignore');

      if (!hasGitignore) {
        issues.push({
          id: 'MRI-SEC-NOGITIGNORE',
          title: 'Missing .gitignore file',
          description: 'No .gitignore file found in the project root.',
          severity: 'high',
          category: 'securityHygiene',
          confidence: 'high',
          files: [],
          scoreImpact: 8,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Create a .gitignore file to prevent committing sensitive files',
            'Add node_modules, .env, dist, and .env.local to .gitignore',
          ],
        });
        return issues;
      }

      try {
        const content = await import('node:fs/promises').then(fs =>
          fs.readFile(ctx.scan.files.find(f => f.relativePath === '.gitignore')?.path || '', 'utf-8')
        );

        const entries = content.split('\n');
        const missingEntries: string[] = [];

        const recommendedEntries = [
          'node_modules', '.env', '.env.local', 'dist', 'build',
          '.next', 'coverage', '*.log', '.DS_Store',
        ];

        for (const entry of recommendedEntries) {
          if (!entries.some(e => e.trim() === entry)) {
            missingEntries.push(entry);
          }
        }

        if (missingEntries.length > 0) {
          issues.push({
            id: 'MRI-SEC-GITIGNORE',
            title: `Missing ${missingEntries.length} recommended .gitignore ${missingEntries.length === 1 ? 'entry' : 'entries'}`,
            description: `.gitignore is missing: ${missingEntries.join(', ')}`,
            severity: 'medium',
            category: 'securityHygiene',
            confidence: 'high',
            files: ['.gitignore'],
            scoreImpact: 3,
            canAutoFix: true,
            status: 'open',
            tips: [
              `Add to .gitignore: ${missingEntries.join(', ')}`,
            ],
          });
        }
      } catch {
        /* expected - silent fail is intentional */
      }

      return issues;
    },
  },
  {
    id: 'sec-insecure-random',
    name: 'Insecure random number generation',
    category: 'securityHygiene',
    description: 'Detects Math.random() used in place of crypto.random',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const srcFiles = ctx.scan.files.filter((f: import('@software-mri/scanner').FileEntry) =>
        f.relativePath.startsWith('src/') && !f.isBinary &&
        (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx') ||
         f.relativePath.endsWith('.js') || f.relativePath.endsWith('.jsx'))
      );

      for (const file of srcFiles) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          if (content.includes('Math.random()') &&
              (content.includes('token') || content.includes('secret') ||
               content.includes('password') || content.includes('key') ||
               content.includes('auth') || content.includes('csrf'))) {
            issues.push({
              id: `MRI-SEC-RANDOM-${Buffer.from(file.relativePath).slice(0, 4).toString('hex')}`,
              title: 'Math.random() used for security-sensitive purpose',
              description: `${file.relativePath} uses Math.random() for security-sensitive functionality.`,
              severity: 'high',
              category: 'securityHygiene',
              confidence: 'medium',
              files: [file.relativePath],
              scoreImpact: 8,
              canAutoFix: false,
              status: 'open',
              tips: [
                'Use crypto.randomBytes() or crypto.randomUUID() instead of Math.random()',
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
    id: 'sec-env-secrets',
    name: 'Potential secrets in environment files',
    category: 'securityHygiene',
    description: 'Detects potential secret exposure in environment configuration',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const envFiles = ctx.scan.files.filter((f: import('@software-mri/scanner').FileEntry) =>
        f.relativePath === '.env' || f.relativePath === '.env.local'
      );

      if (envFiles.length === 0) return issues;

      const secretPatterns = [
        /SECRET/i, /PASSWORD/i, /TOKEN/i, /API_KEY/i, /APIKEY/i,
        /PRIVATE/i, /CREDENTIAL/i, /AUTH_SECRET/i,
      ];

      for (const file of envFiles) {
        try {
          const content = await import('node:fs/promises').then(fs => fs.readFile(file.path, 'utf-8'));
          const lines = content.split('\n').filter(l => l.trim() && !l.trim().startsWith('#'));

          for (const line of lines) {
            for (const pattern of secretPatterns) {
              if (pattern.test(line) && line.includes('=') && !line.includes('CHANGE_ME') && !line.includes('your-')) {
                issues.push({
                  id: `MRI-SEC-ENV-${Buffer.from(file.relativePath).slice(0, 4).toString('hex')}`,
                  title: 'Potential secret configured in .env file',
                  description: `${file.relativePath} contains potentially sensitive environment variables.`,
                  severity: 'info',
                  category: 'securityHygiene',
                  confidence: 'medium',
                  files: [file.relativePath],
                  scoreImpact: 0,
                  canAutoFix: false,
                  status: 'open',
                  tips: [
                    'Ensure .env is in .gitignore',
                    'Use .env.example with placeholder values for the repo',
                    'Rotate any secrets that were committed',
                  ],
                });
                break;
              }
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