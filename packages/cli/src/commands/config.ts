import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { validateConfig } from '@software-mri/config';

export async function runConfig(): Promise<void> {
  const configPath = join(process.cwd(), 'mri.config.json');
  try {
    const content = await readFile(configPath, 'utf-8');
    const config = JSON.parse(content);
    const validation = validateConfig(config);

    if (!validation.valid) {
      process.stderr.write(`Config errors:\n${validation.errors.map(e => `  - ${e}`).join('\n')}\n`);
      return;
    }

    process.stdout.write(`Current config: ${configPath}\n`);
    process.stdout.write(content);
  } catch {
    process.stdout.write('No mri.config.json found. Run `mri init` to create one.\n');
  }
}