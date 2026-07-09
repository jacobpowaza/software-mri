import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { DEFAULT_CONFIG } from '@mri/core';

export async function runInit(): Promise<void> {
  const configPath = join(process.cwd(), 'mri.config.json');
  try {
    await writeFile(configPath, JSON.stringify(DEFAULT_CONFIG, null, 2), 'utf-8');
    process.stdout.write(`Created ${configPath}\n`);
    process.stdout.write('Edit this file to customize Software MRI behavior.\n');
  } catch (error) {
    process.stderr.write(`Failed to create config: ${error}\n`);
    process.exit(2);
  }
}