import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { CheckRegistration, CheckContext } from '../types.js';

export const envChecks: CheckRegistration[] = [
  {
    id: 'env-comparison',
    name: 'Environment variable hygiene',
    category: 'configHealth',
    description: 'Compares .env, .env.example, .env.local.example for consistency',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];

      const env = await readEnvFile(ctx.project.rootDir, '.env');
      const envExample = await readEnvFile(ctx.project.rootDir, '.env.example');
      const envLocalExample = await readEnvFile(ctx.project.rootDir, '.env.local.example');

      if (!env && !envExample && !envLocalExample) {
        issues.push({
          id: 'MRI-ENV-NOEXAMPLES',
          title: 'No environment configuration files found',
          description: 'No .env, .env.example, or .env.local.example found. Environment configuration is not documented.',
          severity: 'medium',
          category: 'configHealth',
          confidence: 'high',
          files: [],
          scoreImpact: 5,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Create a .env.example file documenting all required environment variables',
            'Include placeholder values (never real secrets)',
          ],
        });
        return issues;
      }

      const exampleKeys = envExample ? Object.keys(envExample) : [];
      const localExampleKeys = envLocalExample ? Object.keys(envLocalExample) : [];

      if (envExample && env) {
        const envKeys = Object.keys(env);
        const missingFromEnv = exampleKeys.filter(k => !envKeys.includes(k));
        const extraInEnv = envKeys.filter(k => !exampleKeys.includes(k) && !k.startsWith('#'));

        if (missingFromEnv.length > 0) {
          issues.push({
            id: 'MRI-ENV-MISSING',
            title: `${missingFromEnv.length} missing environment ${missingFromEnv.length === 1 ? 'variable' : 'variables'}`,
            description: `Variables defined in .env.example but missing from .env: ${missingFromEnv.join(', ')}`,
            severity: 'high',
            category: 'configHealth',
            confidence: 'high',
            files: ['.env', '.env.example'],
            scoreImpact: Math.min(missingFromEnv.length * 3, 10),
            canAutoFix: false,
            status: 'open',
            tips: [
              `Add to .env: ${missingFromEnv.slice(0, 3).join(', ')}`,
              'Check if the application runs correctly with these variables',
            ],
          });
        }

        if (extraInEnv.length > 0) {
          issues.push({
            id: 'MRI-ENV-EXTRA',
            title: `${extraInEnv.length} extra ${extraInEnv.length === 1 ? 'variable' : 'variables'} not in .env.example`,
            description: `.env has variables not documented in .env.example: ${extraInEnv.join(', ')}`,
            severity: 'low',
            category: 'configHealth',
            confidence: 'high',
            files: ['.env', '.env.example'],
            scoreImpact: 1,
            canAutoFix: false,
            status: 'open',
            tips: [
              'Add undocumented env vars to .env.example for team visibility',
            ],
          });
        }
      }

      if (!envExample) {
        issues.push({
          id: 'MRI-ENV-NOEXAMPLE',
          title: 'Missing .env.example file',
          description: 'The project has a .env file but no .env.example. Environment variables are not documented for other developers.',
          severity: 'medium',
          category: 'configHealth',
          confidence: 'high',
          files: ['.env'],
          scoreImpact: 5,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Create an .env.example from .env with placeholder values',
            'Document all required environment variables',
          ],
        });
      }

      return issues;
    },
  },
  {
    id: 'env-no-env-file',
    name: 'No .env file check',
    category: 'configHealth',
    description: 'Checks if a .env file exists when one is expected',
    enabled: true,
    async run(ctx: CheckContext) {
      const issues: import('@software-mri/core').Issue[] = [];
      const hasEnvExample = ctx.scan.files.some(f => f.relativePath === '.env.example');
      const hasEnv = ctx.scan.files.some(f => f.relativePath === '.env');

      if (hasEnvExample && !hasEnv) {
        issues.push({
          id: 'MRI-ENV-MISSING-ENV',
          title: 'Missing .env file',
          description: 'The project has .env.example but no .env file. The application may need environment variables to run.',
          severity: 'info',
          category: 'configHealth',
          confidence: 'high',
          files: ['.env.example'],
          scoreImpact: 0,
          canAutoFix: false,
          status: 'open',
          tips: [
            'Copy .env.example to .env and fill in the values',
          ],
        });
      }

      return issues;
    },
  },
];

async function readEnvFile(rootDir: string, filename: string): Promise<Record<string, string> | null> {
  try {
    const content = await readFile(join(rootDir, filename), 'utf-8');
    const vars: Record<string, string> = {};
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex === -1) continue;
      const key = trimmed.slice(0, eqIndex).trim();
      const value = trimmed.slice(eqIndex + 1).trim();
      if (key) vars[key] = value;
    }
    return vars;
  } catch {
    return null;
  }
}