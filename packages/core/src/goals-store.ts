import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import type { Goal, GoalsStore, GoalSnapshot, CategoryId } from './types.js';
import { generateGoalId } from './utils.js';

const GOALS_DIR = '.mri';
const GOALS_FILE = 'goals.json';

function getPath(rootDir: string): string {
  return join(rootDir, GOALS_DIR, GOALS_FILE);
}

function getDir(rootDir: string): string {
  return join(rootDir, GOALS_DIR);
}

async function ensureDir(rootDir: string): Promise<void> {
  const dir = getDir(rootDir);
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
}

export async function loadGoals(rootDir: string): Promise<GoalsStore> {
  try {
    const content = await readFile(getPath(rootDir), 'utf-8');
    return JSON.parse(content) as GoalsStore;
  } catch {
    return { goals: [] };
  }
}

export async function saveGoals(rootDir: string, store: GoalsStore): Promise<void> {
  await ensureDir(rootDir);
  await writeFile(getPath(rootDir), JSON.stringify(store, null, 2), 'utf-8');
}

export async function addGoal(rootDir: string, goal: Omit<Goal, 'id' | 'createdAt' | 'updatedAt' | 'history'>): Promise<Goal> {
  const store = await loadGoals(rootDir);
  const now = new Date().toISOString();
  const newGoal: Goal = {
    ...goal,
    id: generateGoalId(),
    createdAt: now,
    updatedAt: now,
    history: [],
  };
  store.goals.push(newGoal);
  await saveGoals(rootDir, store);
  return newGoal;
}

export async function updateGoal(
  rootDir: string,
  goalId: string,
  updates: Partial<Pick<Goal, 'title' | 'description' | 'targetScore' | 'currentScore' | 'status' | 'notes'>>,
): Promise<Goal | null> {
  const store = await loadGoals(rootDir);
  const goal = store.goals.find(g => g.id === goalId);
  if (!goal) return null;

  if (updates.currentScore !== undefined && updates.currentScore !== goal.currentScore) {
    goal.history.push({
      score: goal.currentScore,
      timestamp: new Date().toISOString(),
      note: updates.notes?.[updates.notes.length - 1] || `Score updated to ${updates.currentScore}`,
    });
  }

  Object.assign(goal, updates, { updatedAt: new Date().toISOString() });
  await saveGoals(rootDir, store);
  return goal;
}

export async function recordProgress(rootDir: string, goalId: string, score: number, note: string): Promise<void> {
  await updateGoal(rootDir, goalId, { currentScore: score });
}

export async function autoCreateGoals(rootDir: string, currentScore: number, categories: { id: CategoryId; score: number }[]): Promise<Goal[]> {
  const store = await loadGoals(rootDir);
  const created: Goal[] = [];

  for (const cat of categories) {
    const existing = store.goals.find(g => g.category === cat.id && g.status === 'active');
    if (existing) continue;
    if (cat.score >= 90) continue;

    const target = cat.score < 50 ? Math.min(cat.score + 30, 80) : Math.min(cat.score + 15, 90);
    const goal = await addGoal(rootDir, {
      title: getDefaultGoalTitle(cat.id),
      description: `Improve ${cat.id} score from ${cat.score}% to ${target}%`,
      category: cat.id,
      targetScore: target,
      currentScore: cat.score,
      status: 'active',
      notes: ['Auto-created from scan'],
    });
    created.push(goal);
  }

  const overallGoal = store.goals.find(g => g.category === 'architecture' && g.title === 'Overall Production Readiness' && g.status === 'active');
  if (!overallGoal && currentScore < 90) {
    const target = currentScore < 50 ? Math.min(currentScore + 20, 85) : Math.min(currentScore + 10, 95);
    const goal = await addGoal(rootDir, {
      title: 'Overall Production Readiness',
      description: `Improve overall score from ${currentScore}% to ${target}%`,
      category: 'architecture',
      targetScore: target,
      currentScore,
      status: 'active',
      notes: ['Auto-created from scan'],
    });
    created.push(goal);
  }

  return created;
}

function getDefaultGoalTitle(cat: CategoryId): string {
  const titles: Record<CategoryId, string> = {
    architecture: 'Improve Architecture Health',
    dependencies: 'Clean Up Dependencies',
    deadCode: 'Remove Dead Code',
    duplicates: 'Eliminate Duplicates',
    typeSafety: 'Strengthen Type Safety',
    testCoverage: 'Improve Test Coverage',
    configHealth: 'Fix Configuration Issues',
    securityHygiene: 'Fix Security Issues',
    performanceRisk: 'Improve Performance',
    maintainability: 'Improve Maintainability',
  };
  return titles[cat];
}