import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { ProjectInfo, Framework, PackageManager } from '@mri/core';

export function detectProject(rootDir: string, packageJson: Record<string, unknown> | null): ProjectInfo {
  const name = (packageJson?.name as string) || rootDir.split('/').pop() || 'unknown';
  const hasTypeScript = existsSync(join(rootDir, 'tsconfig.json'));
  const frameworks = detectFrameworks(rootDir, packageJson);
  const packageManager = detectPackageManager(rootDir);

  const hasConfigFiles: string[] = [];
  const configCandidates = [
    'tsconfig.json',
    '.env',
    '.env.example',
    '.gitignore',
    '.eslintrc.js',
    '.eslintrc.json',
    '.prettierrc',
    'jest.config.ts',
    'jest.config.js',
    'vitest.config.ts',
    'docker-compose.yml',
    'Dockerfile',
    'next.config.js',
    'next.config.mjs',
  ];
  for (const cfg of configCandidates) {
    if (existsSync(join(rootDir, cfg))) {
      hasConfigFiles.push(cfg);
    }
  }

  return {
    name,
    rootDir,
    frameworks,
    packageManager,
    hasTypeScript,
    hasConfigFiles,
  };
}

function detectFrameworks(rootDir: string, packageJson: Record<string, unknown> | null): Framework[] {
  const frameworks: Framework[] = [];
  const deps = getDependencies(packageJson);

  if (deps.has('next')) frameworks.push('nextjs');
  if (deps.has('react') || deps.has('react-dom')) frameworks.push('react');
  if (deps.has('vite') || deps.has('create-vite')) frameworks.push('vite');
  if (deps.has('express')) frameworks.push('express');
  if (deps.has('expo') || deps.has('expo-cli') || existsSync(join(rootDir, 'app.json'))) frameworks.push('expo');
  if (deps.has('@nestjs/core')) frameworks.push('nestjs');
  if (deps.has('@prisma/client') || deps.has('prisma')) frameworks.push('prisma');
  if (deps.has('tailwindcss')) frameworks.push('tailwind');

  if (frameworks.length === 0) {
    frameworks.push('node');
  }

  return frameworks;
}

function detectPackageManager(rootDir: string): PackageManager {
  if (existsSync(join(rootDir, 'pnpm-lock.yaml'))) return 'pnpm';
  if (existsSync(join(rootDir, 'yarn.lock'))) return 'yarn';
  if (existsSync(join(rootDir, 'package-lock.json'))) return 'npm';
  if (existsSync(join(rootDir, 'bun.lockb'))) return 'bun';
  return 'unknown';
}

function getDependencies(packageJson: Record<string, unknown> | null): Set<string> {
  const deps = new Set<string>();
  if (!packageJson) return deps;

  const depTypes = ['dependencies', 'devDependencies', 'peerDependencies', 'optionalDependencies'] as const;
  for (const depType of depTypes) {
    const obj = packageJson[depType];
    if (obj && typeof obj === 'object') {
      for (const key of Object.keys(obj as Record<string, unknown>)) {
        deps.add(key);
      }
    }
  }

  return deps;
}

export { getDependencies };
