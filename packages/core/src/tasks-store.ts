import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Task, TasksStore, Note } from './types.js';

const TASKS_DIR = '.mri';
const TASKS_FILE = 'tasks.json';

function getPath(rootDir: string): string {
  return join(rootDir, TASKS_DIR, TASKS_FILE);
}

function getDir(rootDir: string): string {
  return join(rootDir, TASKS_DIR);
}

async function ensureDir(rootDir: string): Promise<void> {
  const dir = getDir(rootDir);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

function generateTaskId(): string {
  return 'TASK-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();
}

export async function loadTasks(rootDir: string): Promise<TasksStore> {
  try {
    const content = await readFile(getPath(rootDir), 'utf-8');
    return JSON.parse(content) as TasksStore;
  } catch {
    return { tasks: [] };
  }
}

export async function saveTasks(rootDir: string, store: TasksStore): Promise<void> {
  await ensureDir(rootDir);
  await writeFile(getPath(rootDir), JSON.stringify(store, null, 2), 'utf-8');
}

export async function addTask(
  rootDir: string,
  task: { title: string; deadline?: string; progress?: number; notes?: Note[] | string[] },
): Promise<Task> {
  const store = await loadTasks(rootDir);
  const now = new Date().toISOString();
  const rawNotes = task.notes ?? [];
  const notes: Note[] = rawNotes.map(n =>
    typeof n === 'string' ? { text: n, createdAt: now } : n,
  );
  const newTask: Task = {
    id: generateTaskId(),
    title: task.title,
    deadline: task.deadline,
    createdAt: now,
    status: 'active',
    progress: task.progress ?? 0,
    notes,
    history: [{ status: 'active', timestamp: now, progress: task.progress ?? 0 }],
  };
  store.tasks.push(newTask);
  await saveTasks(rootDir, store);
  return newTask;
}

export async function updateTaskProgress(rootDir: string, taskId: string, progress: number): Promise<Task | null> {
  const store = await loadTasks(rootDir);
  const task = store.tasks.find(t => t.id === taskId);
  if (!task) return null;
  task.progress = Math.max(0, Math.min(100, progress));
  task.history.push({ status: task.status, progress, timestamp: new Date().toISOString() });
  await saveTasks(rootDir, store);
  return task;
}

export async function addTaskNote(rootDir: string, taskId: string, text: string): Promise<Task | null> {
  const store = await loadTasks(rootDir);
  const task = store.tasks.find(t => t.id === taskId);
  if (!task) return null;
  const note: Note = { text, createdAt: new Date().toISOString() };
  task.notes.push(note);
  await saveTasks(rootDir, store);
  return task;
}

export async function updateTask(
  rootDir: string,
  taskId: string,
  updates: Partial<Pick<Task, 'title' | 'deadline' | 'status' | 'completedAt' | 'progress' | 'notes'>>,
): Promise<Task | null> {
  const store = await loadTasks(rootDir);
  const task = store.tasks.find(t => t.id === taskId);
  if (!task) return null;

  if (updates.status && (updates.status === 'active' || updates.status === 'completed')) {
    task.history.push({
      status: updates.status,
      progress: task.progress,
      timestamp: new Date().toISOString(),
    });
  }

  Object.assign(task, updates);
  await saveTasks(rootDir, store);
  return task;
}

export async function deleteTask(rootDir: string, taskId: string): Promise<boolean> {
  const store = await loadTasks(rootDir);
  const idx = store.tasks.findIndex(t => t.id === taskId);
  if (idx === -1) return false;
  store.tasks.splice(idx, 1);
  await saveTasks(rootDir, store);
  return true;
}

export async function toggleTask(rootDir: string, taskId: string): Promise<Task | null> {
  const store = await loadTasks(rootDir);
  const task = store.tasks.find(t => t.id === taskId);
  if (!task) return null;

  if (task.status === 'active') {
    const now = new Date().toISOString();
    task.status = 'completed';
    task.progress = 100;
    task.completedAt = now;
    task.history.push({ status: 'completed', progress: 100, timestamp: now });
  } else {
    task.status = 'active';
    task.completedAt = undefined;
    task.history.push({ status: 'active', progress: task.progress, timestamp: new Date().toISOString() });
  }

  await saveTasks(rootDir, store);
  return task;
}
