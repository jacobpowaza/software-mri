#!/usr/bin/env node
import { runCli } from './cli.js';

runCli().catch((error) => {
  console.error('Fatal error:', error instanceof Error ? error.message : error);
  process.exit(2);
});