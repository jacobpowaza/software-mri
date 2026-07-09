import { readdir, stat, readFile } from 'node:fs/promises';
import { join, relative } from 'node:path';
import { minimatch } from 'minimatch';
import type { MriConfig } from '@software-mri/core';
import { isBinaryFile } from '@software-mri/core';

export interface FileEntry {
  path: string;
  relativePath: string;
  size: number;
  isBinary: boolean;
}

export interface ScanContext {
  files: FileEntry[];
  ignoredFolders: Set<string>;
  gitignorePatterns: string[];
  packageJson: Record<string, unknown> | null;
  hasLockfile: boolean;
  lockfileType: string | null;
  config: MriConfig;
  rootDir: string;
}

async function loadGitignorePatterns(rootDir: string): Promise<string[]> {
  const patterns: string[] = ['node_modules', '.git'];
  try {
    const content = await readFile(join(rootDir, '.gitignore'), 'utf-8');
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#')) {
        patterns.push(trimmed);
      }
    }
  } catch {
    /* expected - .gitignore may not exist */
  }
  return patterns;
}

async function loadPackageJson(rootDir: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(join(rootDir, 'package.json'), 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

async function detectLockfile(rootDir: string): Promise<{ has: boolean; type: string | null }> {
  const candidates = [
    { name: 'pnpm-lock.yaml', type: 'pnpm' },
    { name: 'yarn.lock', type: 'yarn' },
    { name: 'package-lock.json', type: 'npm' },
    { name: 'bun.lockb', type: 'bun' },
  ];
  for (const { name, type } of candidates) {
    try {
      await stat(join(rootDir, name));
      return { has: true, type };
    } catch {
      continue;
    }
  }
  return { has: false, type: null };
}

function isIgnored(relPath: string, patterns: string[], ignoredFolders: Set<string>): boolean {
  const parts = relPath.split('/');
  for (const part of parts) {
    if (ignoredFolders.has(part)) return true;
  }
  for (const pattern of patterns) {
    if (minimatch(relPath, pattern)) return true;
    if (minimatch(relPath, pattern + '/**')) return true;
    if (pattern.startsWith('/') && minimatch(relPath, pattern.slice(1))) return true;
    if (minimatch(relPath, '**/' + pattern)) return true;
    if (minimatch(relPath, '**/' + pattern + '/**')) return true;
  }
  return false;
}

async function walkDirectory(
  dirPath: string,
  rootDir: string,
  gitignorePatterns: string[],
  ignoredFolders: Set<string>,
  config: MriConfig,
): Promise<FileEntry[]> {
  const entries: FileEntry[] = [];

  try {
    const dirEntries = await readdir(dirPath, { withFileTypes: true });

    for (const entry of dirEntries) {
      const fullPath = join(dirPath, entry.name);
      const relPath = relative(rootDir, fullPath);

      if (ignoredFolders.has(entry.name) && entry.isDirectory()) continue;
      if (entry.name.startsWith('.') && entry.isDirectory() && entry.name !== '.env') continue;

      if (isIgnored(relPath, gitignorePatterns, ignoredFolders) && relPath !== '.env') continue;

      if (entry.isDirectory()) {
        const subEntries = await walkDirectory(fullPath, rootDir, gitignorePatterns, ignoredFolders, config);
        entries.push(...subEntries);
      } else if (entry.isFile()) {
        try {
          const fileStat = await stat(fullPath);
          const binary = isBinaryFile(entry.name);
          entries.push({
            path: fullPath,
            relativePath: relPath,
            size: fileStat.size,
            isBinary: binary,
          });
        } catch {
          /* expected - file may have been deleted between stat and read */
        }
      }
    }
  } catch {
    /* expected - directory may not be readable */
  }

  return entries;
}

export async function createScanContext(rootDir: string, config: MriConfig): Promise<ScanContext> {
  const gitignorePatterns = await loadGitignorePatterns(rootDir);
  const packageJson = await loadPackageJson(rootDir);
  const lockfile = await detectLockfile(rootDir);

  const ignoredFolders = new Set([
    ...DEFAULT_IGNORED_FOLDERS,
    ...config.ignoredFolders,
  ]);

  const files = await walkDirectory(rootDir, rootDir, gitignorePatterns, ignoredFolders, config);

  return {
    files,
    ignoredFolders,
    gitignorePatterns,
    packageJson,
    hasLockfile: lockfile.has,
    lockfileType: lockfile.type,
    config,
    rootDir,
  };
}

const DEFAULT_IGNORED_FOLDERS = [
  'node_modules',
  '.next',
  'dist',
  'build',
  'coverage',
  '.git',
  '.turbo',
  '.expo',
  '.cache',
  '.nyc_output',
  '.vite',
  '.yarn',
];

export function filterByGlob(context: ScanContext, pattern: string): FileEntry[] {
  return context.files.filter(f => minimatch(f.relativePath, pattern));
}

export function filterByExtension(context: ScanContext, ext: string): FileEntry[] {
  return context.files.filter(f => f.relativePath.endsWith(ext));
}

export function filterBySize(context: ScanContext, minBytes: number): FileEntry[] {
  return context.files.filter(f => f.size >= minBytes);
}