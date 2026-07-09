import { readFile, writeFile } from 'node:fs/promises';
import { join, isAbsolute } from 'node:path';
import type { MriConfig, CliOptions } from '@software-mri/core';
import { DEFAULT_CONFIG, extractErrorMessage } from '@software-mri/core';

export async function loadConfig(rootDir: string, cliOptions?: Partial<CliOptions>): Promise<MriConfig> {
  const userConfig = await loadUserConfig(rootDir);
  const merged = mergeConfig(DEFAULT_CONFIG, userConfig);

  if (cliOptions?.strictness) {
    merged.strictness = cliOptions.strictness as MriConfig['strictness'];
  }

  if (cliOptions?.scoreThreshold !== undefined) {
    merged.scoreThreshold = cliOptions.scoreThreshold;
  }

  if (cliOptions?.format) {
    merged.outputFormat = cliOptions.format;
  }

  return adjustForStrictness(merged);
}

async function loadUserConfig(rootDir: string): Promise<Partial<MriConfig>> {
  const candidates = [
    'mri.config.json',
    'mri.config.js',
    '.mri.config.json',
    '.mrircc',
  ];

  for (const candidate of candidates) {
    try {
      const content = await readFile(join(rootDir, candidate), 'utf-8');
      return JSON.parse(content) as Partial<MriConfig>;
    } catch {
      continue;
    }
  }

  return {};
}

function mergeConfig(base: MriConfig, override: Partial<MriConfig>): MriConfig {
  const merged = { ...base };

  if (override.ignoredFolders) {
    merged.ignoredFolders = [...new Set([...base.ignoredFolders, ...override.ignoredFolders])];
  }

  if (override.scoreWeights) {
    merged.scoreWeights = { ...base.scoreWeights, ...override.scoreWeights };
  }

  if (override.fileSizeThreshold !== undefined) {
    merged.fileSizeThreshold = override.fileSizeThreshold;
  }

  if (override.enabledChecks) {
    merged.enabledChecks = override.enabledChecks;
  }

  if (override.outputFormat) {
    merged.outputFormat = override.outputFormat;
  }

  if (override.strictness) {
    merged.strictness = override.strictness;
  }

  if (override.scoreThreshold !== undefined) {
    merged.scoreThreshold = override.scoreThreshold;
  }

  return merged;
}

function adjustForStrictness(config: MriConfig): MriConfig {
  switch (config.strictness) {
    case 'low':
      config.fileSizeThreshold = 800;
      config.scoreThreshold = 50;
      break;
    case 'high':
      config.fileSizeThreshold = 300;
      config.scoreThreshold = 85;
      break;
    default:
      config.fileSizeThreshold = 500;
      config.scoreThreshold = 70;
      break;
  }
  return config;
}

export async function writeConfigFile(rootDir: string, config: MriConfig): Promise<string> {
  const filePath = join(rootDir, 'mri.config.json');
  const content = JSON.stringify(config, null, 2);
  await writeFile(filePath, content, 'utf-8');
  return filePath;
}

export function createDefaultConfigFile(): MriConfig {
  return { ...DEFAULT_CONFIG };
}

export function validateConfig(config: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config || typeof config !== 'object') {
    return { valid: false, errors: ['Config must be a JSON object'] };
  }

  const c = config as Record<string, unknown>;

  if (c.scoreThreshold !== undefined && typeof c.scoreThreshold !== 'number') {
    errors.push('scoreThreshold must be a number');
  }

  if (c.fileSizeThreshold !== undefined && typeof c.fileSizeThreshold !== 'number') {
    errors.push('fileSizeThreshold must be a number');
  }

  if (c.strictness !== undefined && !['low', 'medium', 'high'].includes(c.strictness as string)) {
    errors.push('strictness must be one of: low, medium, high');
  }

  if (c.outputFormat !== undefined && !['terminal', 'json', 'markdown', 'html'].includes(c.outputFormat as string)) {
    errors.push('outputFormat must be one of: terminal, json, markdown, html');
  }

  if (c.ignoredFolders !== undefined && !Array.isArray(c.ignoredFolders)) {
    errors.push('ignoredFolders must be an array');
  }

  return { valid: errors.length === 0, errors };
}