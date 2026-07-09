import { loadTasks, addTask, toggleTask, deleteTask } from '@software-mri/core';

export async function runTasks(args: string[]): Promise<void> {
  const rootDir = process.cwd();
  const [sub] = args;

  if (sub === 'list' || !sub) {
    const store = await loadTasks(rootDir);
    if (store.tasks.length === 0) {
      process.stdout.write('No tasks found. Create one with `mri tasks add`.\n');
      return;
    }

    const active = store.tasks.filter(t => t.status === 'active');
    const completed = store.tasks.filter(t => t.status === 'completed');

    if (active.length > 0) {
      process.stdout.write('\n  Active Tasks:\n');
      for (const t of active) {
        const dl = t.deadline ? ` (due: ${new Date(t.deadline).toLocaleDateString()})` : '';
        process.stdout.write(`    \u25CB ${t.title}${dl}\n`);
      }
    }

    if (completed.length > 0) {
      process.stdout.write('\n  Completed:\n');
      for (const t of completed) {
        process.stdout.write(`    \u2713 ${t.title}\n`);
      }
    }

    process.stdout.write(`\n  ${completed.length}/${store.tasks.length} tasks done\n`);
    return;
  }

  if (sub === 'add') {
    const title = args[1] || 'My Task';
    const deadlineStr = args[2] || '';
    const deadline = deadlineStr ? new Date(deadlineStr).toISOString() : undefined;

    const task = await addTask(rootDir, { title, deadline });
    process.stdout.write(`Created task: ${task.title}\n`);
    return;
  }

  if (sub === 'done') {
    const id = args[1];
    if (!id) { process.stdout.write('Usage: mri tasks done <task-id>\n'); return; }
    const result = await toggleTask(rootDir, id);
    if (result) {
      process.stdout.write(`Task "${result.title}" marked as ${result.status}.\n`);
    } else {
      process.stdout.write('Task not found.\n');
    }
    return;
  }

  process.stdout.write('Usage: mri tasks [list|add|done]\n');
}