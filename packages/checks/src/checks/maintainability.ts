import type { CheckRegistration, CheckContext } from '../types.js';

export const maintainabilityChecks: CheckRegistration[] = [
  {
    id: 'maintain-readme',
    name: 'README existence check',
    category: 'maintainability',
    description: 'Checks if the project has a README file',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const hasReadme = ctx.scan.files.some(f =>
        f.relativePath.toLowerCase() === 'readme.md' ||
        f.relativePath.toLowerCase() === 'readme.mdx'
      );

      if (!hasReadme) {
        issues.push({
          id: 'MRI-MAINTAIN-README',
          title: 'Missing README.md file',
          description: 'No README.md found. README files help onboard developers and document the project.',
          severity: 'medium',
          category: 'maintainability',
          confidence: 'high',
          files: [],
          scoreImpact: 4,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Create a README.md with project description, setup instructions, and usage examples',
            'Include badges for build status, coverage, and license',
          ],
        });
      }

      return issues;
    },
  },
  {
    id: 'maintain-license',
    name: 'License file check',
    category: 'maintainability',
    description: 'Checks if the project has a license file',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const hasLicense = ctx.scan.files.some(f =>
        f.relativePath.toLowerCase().startsWith('license')
      );

      if (!hasLicense && ctx.scan.packageJson) {
        const license = (ctx.scan.packageJson as Record<string, unknown>).license;
        if (!license) {
          issues.push({
            id: 'MRI-MAINTAIN-LICENSE',
            title: 'Missing license',
            description: 'No LICENSE file or license field in package.json. The project has no open-source license.',
            severity: 'low',
            category: 'maintainability',
            confidence: 'high',
            files: [],
            scoreImpact: 1,
            canAutoFix: false,
            status: 'open',
            tips: [
              'Add a LICENSE file (e.g., MIT, Apache 2.0)',
              'Add "license": "MIT" to package.json',
            ],
          });
        }
      }

      return issues;
    },
  },
  {
    id: 'maintain-contributing',
    name: 'Contributing guide check',
    category: 'maintainability',
    description: 'Checks if the project has contribution guidelines',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const hasContributing = ctx.scan.files.some(f =>
        f.relativePath.toLowerCase().includes('contributing')
      );

      if (!hasContributing && ctx.scan.files.some(f => f.relativePath.toLowerCase() === 'readme.md')) {
        issues.push({
          id: 'MRI-MAINTAIN-CONTRIBUTING',
          title: 'Missing CONTRIBUTING.md',
          description: 'No CONTRIBUTING.md file found. This file helps onboard contributors.',
          severity: 'low',
          category: 'maintainability',
          confidence: 'high',
          files: [],
          scoreImpact: 1,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Create a CONTRIBUTING.md with development setup and guidelines',
          ],
        });
      }

      return issues;
    },
  },
  {
    id: 'maintain-ci',
    name: 'CI configuration check',
    category: 'maintainability',
    description: 'Checks if the project has CI configuration',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const hasCI = ctx.scan.files.some(f =>
        f.relativePath.includes('.github/workflows') ||
        f.relativePath === '.github/workflows/ci.yml' ||
        f.relativePath === '.travis.yml' ||
        f.relativePath === 'Jenkinsfile' ||
        f.relativePath === '.gitlab-ci.yml' ||
        f.relativePath === 'azure-pipelines.yml'
      );

      if (!hasCI) {
        issues.push({
          id: 'MRI-MAINTAIN-NOCI',
          title: 'No CI configuration found',
          description: 'No CI configuration file detected. Automated testing is not set up.',
          severity: 'medium',
          category: 'maintainability',
          confidence: 'high',
          files: [],
          scoreImpact: 4,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Set up GitHub Actions, CircleCI, or your preferred CI provider',
            'Add a CI workflow that runs tests and linting',
          ],
        });
      }

      return issues;
    },
  },
  {
    id: 'maintain-scripts',
    name: 'Package scripts check',
    category: 'maintainability',
    description: 'Checks for common missing package.json scripts',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const pkg = ctx.scan.packageJson;
      if (!pkg) return issues;

      const scripts = pkg.scripts as Record<string, string> | undefined;
      if (!scripts) return issues;

      const recommendedScripts: Record<string, string> = {
        build: 'Build the project',
        test: 'Run tests',
        lint: 'Run linting',
        typecheck: 'Run type checking',
        clean: 'Clean build artifacts',
      };

      const missing: string[] = [];
      for (const [script, _desc] of Object.entries(recommendedScripts)) {
        if (!scripts[script]) {
          missing.push(script);
        }
      }

      if (missing.length > 0) {
        issues.push({
          id: 'MRI-MAINTAIN-SCRIPTS',
          title: `Missing recommended scripts: ${missing.join(', ')}`,
          description: `package.json is missing recommended scripts: ${missing.join(', ')}`,
          severity: 'low',
          category: 'maintainability',
          confidence: 'high',
          files: ['package.json'],
          scoreImpact: 1,
          canAutoFix: false,
          status: 'open',
          tips: missing.map(s => `Add "${s}" script to package.json`),
        });
      }

      return issues;
    },
  },
  {
    id: 'maintain-inconsistent-naming',
    name: 'Inconsistent naming patterns',
    category: 'maintainability',
    description: 'Detects inconsistent file naming conventions',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@mri/core').Issue[] = [];
      const srcFiles = ctx.scan.files.filter((f: import('@mri/scanner').FileEntry) =>
        f.relativePath.startsWith('src/') &&
        (f.relativePath.endsWith('.ts') || f.relativePath.endsWith('.tsx'))
      );

      const pascalCase = /^[A-Z][a-zA-Z0-9]+\.(tsx|ts)$/;
      const camelCase = /^[a-z][a-zA-Z0-9]+\.(ts|tsx)$/;
      const kebabCase = /^[a-z][a-z0-9-]+\.(ts|tsx)$/;

      let hasPascal = false, hasCamel = false, hasKebab = false;

      for (const file of srcFiles) {
        const name = file.relativePath.split('/').pop() || '';
        if (pascalCase.test(name)) hasPascal = true;
        if (camelCase.test(name)) hasCamel = true;
        if (kebabCase.test(name)) hasKebab = true;
      }

      const patterns = [
        { name: 'PascalCase', active: hasPascal },
        { name: 'camelCase', active: hasCamel },
        { name: 'kebab-case', active: hasKebab },
      ];

      const activePatterns = patterns.filter(p => p.active);

      if (activePatterns.length > 0) {
        const uniquePatterns = activePatterns.filter(p => p.active).map(p => p.name);
        if (uniquePatterns.length > 1) {
          issues.push({
            id: 'MRI-MAINTAIN-NAMING',
            title: `Mixed naming conventions: ${uniquePatterns.join(', ')}`,
            description: `The project uses multiple file naming conventions: ${uniquePatterns.join(', ')}. Consistency improves navigability.`,
            severity: 'low',
            category: 'maintainability',
            confidence: 'high',
            files: srcFiles.slice(0, 5).map(f => f.relativePath),
            scoreImpact: 1,
            canAutoFix: false,
            status: 'open',
            tips: [
              'Standardize on a single naming convention (recommended: kebab-case for files, PascalCase for components)',
            ],
          });
        }
      }

      return issues;
    },
  },
];