import yargs from 'yargs';
import { hideBin } from 'yargs/helpers';
import type { ReportFormat, CategoryId } from '@software-mri/core';

const CATEGORIES: string[] = [
  'architecture', 'dependencies', 'deadCode', 'duplicates', 'typeSafety',
  'testCoverage', 'configHealth', 'securityHygiene', 'performanceRisk', 'maintainability',
];

export async function runCli(): Promise<void> {
  const argv = await yargs(hideBin(process.argv))
    .scriptName('mri')
    .usage('$0 <command> [options]')
    .command('scan', 'Run a production readiness scan', (yargs) => {
      return yargs
        .option('ci', { type: 'boolean', desc: 'Non-interactive CI mode', default: false })
        .option('format', { type: 'string', desc: 'Output format', choices: ['terminal', 'json', 'markdown', 'html'] as const })
        .option('output', { type: 'string', desc: 'Output file path' })
        .option('config', { type: 'string', desc: 'Path to config file' })
        .option('strictness', { type: 'string', desc: 'Strictness level', choices: ['low', 'medium', 'high'] as const })
        .option('score-threshold', { type: 'number', desc: 'Minimum score to pass CI' });
    }, async (args) => {
      const { runScan } = await import('./commands/scan.js');
      const exitCode = await runScan({
        ci: args.ci ?? false,
        format: args.format as ReportFormat | undefined,
        output: args.output,
        config: args.config,
        strictness: args.strictness,
        scoreThreshold: args['score-threshold'],
      });
      process.exit(exitCode);
    })
    .command('report', 'View the last scan report', () => {}, async () => {
      const { runReport } = await import('./commands/report.js');
      await runReport();
    })
    .command('doctor', 'Fix common issues interactively', () => {}, async () => {
      const { runDoctor } = await import('./commands/doctor.js');
      await runDoctor();
    })
    .command('explain <issue-id>', 'Explain a specific issue', (yargs) => {
      return yargs.positional('issue-id', { type: 'string', demandOption: true, desc: 'Issue ID to explain' });
    }, async (args) => {
      const { runExplain } = await import('./commands/explain.js');
      await runExplain(args['issue-id'] || '');
    })
    .command('export', 'Export the last report', (yargs) => {
      return yargs
        .option('format', { type: 'string', desc: 'Output format', choices: ['json', 'markdown', 'html'] as const, default: 'json' })
        .option('output', { type: 'string', desc: 'Output file path' });
    }, async (args) => {
      const { runExport } = await import('./commands/export.js');
      await runExport({ format: (args.format as ReportFormat) || 'json', output: args.output });
    })
    .command('init', 'Create a default mri.config.json', () => {}, async () => {
      const { runInit } = await import('./commands/init.js');
      await runInit();
    })
    .command('config', 'Open configuration', () => {}, async () => {
      const { runConfig } = await import('./commands/config.js');
      await runConfig();
    })
    .command('tasks', 'Manage tasks', (yargs) => {
      return yargs
        .command('list', 'List all tasks', () => {}, async () => {
          const { runTasks } = await import('./commands/goals.js');
          await runTasks(['list']);
        })
        .command('add [title]', 'Add a new task', (yargs) => {
          return yargs
            .positional('title', { type: 'string', desc: 'Task title', default: '' })
            .option('deadline', { type: 'string', desc: 'Deadline (ISO date or relative like "next friday")' });
        }, async (args) => {
          const { runTasks } = await import('./commands/goals.js');
          await runTasks(['add', args.title || 'My Task', args.deadline || '']);
        })
        .command('done <task-id>', 'Mark task as completed', () => {}, async (args) => {
          const { runTasks } = await import('./commands/goals.js');
          await runTasks(['done', String(args['task-id'] || '')]);
        })
        .demandCommand(1, 'Use `mri tasks list` to start');
    }, async (args) => {
      if (!args._ || args._.length <= 1) {
        const { runTasks } = await import('./commands/goals.js');
        await runTasks(['list']);
      }
    })
    .demandCommand(1, 'Use `mri scan` to start, or `mri --help` for all commands')
    .strict()
    .help()
    .alias('h', 'help')
    .version()
    .alias('v', 'version')
    .parse();

  if (!argv._ || argv._.length === 0) {
    yargs(hideBin(process.argv)).showHelp();
  }
}