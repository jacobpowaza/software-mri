export interface ProjectInfo {
  name: string;
  rootDir: string;
  frameworks: Framework[];
  packageManager: PackageManager;
  hasTypeScript: boolean;
  hasConfigFiles: string[];
}

export type Framework =
  | 'nextjs'
  | 'react'
  | 'vite'
  | 'express'
  | 'expo'
  | 'nestjs'
  | 'prisma'
  | 'tailwind'
  | 'node';

export type PackageManager = 'npm' | 'yarn' | 'pnpm' | 'bun' | 'unknown';

export interface MriConfig {
  ignoredFolders: string[];
  scoreWeights: Partial<Record<CategoryId, number>>;
  fileSizeThreshold: number;
  enabledChecks: string[];
  outputFormat: 'terminal' | 'json' | 'markdown' | 'html';
  strictness: 'low' | 'medium' | 'high';
  scoreThreshold: number;
  customChecks?: Record<string, unknown>;
}

export const DEFAULT_CONFIG: MriConfig = {
  ignoredFolders: [
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
  ],
  scoreWeights: {},
  fileSizeThreshold: 500,
  enabledChecks: [],
  outputFormat: 'terminal',
  strictness: 'medium',
  scoreThreshold: 70,
};

export type CategoryId =
  | 'architecture'
  | 'dependencies'
  | 'deadCode'
  | 'duplicates'
  | 'typeSafety'
  | 'testCoverage'
  | 'configHealth'
  | 'securityHygiene'
  | 'performanceRisk'
  | 'maintainability';

export const CATEGORIES: CategoryMeta[] = [
  { id: 'architecture', label: 'Architecture', weight: 0.12 },
  { id: 'dependencies', label: 'Dependencies', weight: 0.12 },
  { id: 'deadCode', label: 'Dead Code', weight: 0.10 },
  { id: 'duplicates', label: 'Duplicates', weight: 0.08 },
  { id: 'typeSafety', label: 'Type Safety', weight: 0.12 },
  { id: 'testCoverage', label: 'Test Coverage', weight: 0.12 },
  { id: 'configHealth', label: 'Config Health', weight: 0.08 },
  { id: 'securityHygiene', label: 'Security', weight: 0.10 },
  { id: 'performanceRisk', label: 'Performance', weight: 0.08 },
  { id: 'maintainability', label: 'Maintainability', weight: 0.08 },
];

export interface CategoryMeta {
  id: CategoryId;
  label: string;
  weight: number;
}

export type Severity = 'critical' | 'high' | 'medium' | 'low' | 'info';

export type IssueStatus = 'open' | 'fixed' | 'wontfix' | 'dismissed';

export interface Issue {
  id: string;
  title: string;
  description: string;
  severity: Severity;
  category: CategoryId;
  confidence: 'high' | 'medium' | 'low';
  files: string[];
  explanation?: string;
  fix?: string;
  verify?: string;
  scoreImpact: number;
  canAutoFix: boolean;
  status: IssueStatus;
  tips: string[];
}

export interface CategoryScore {
  category: CategoryId;
  score: number;
  status: 'pass' | 'warn' | 'fail';
  issues: Issue[];
  summary: string;
  tips: string[];
}

export interface ScanResult {
  project: ProjectInfo;
  categories: CategoryScore[];
  totalScore: number;
  totalIssues: number;
  scanDurationMs: number;
  scannedFiles: number;
  config: MriConfig;
}

export type ScanPhase =
  | 'detecting'
  | 'scanning'
  | 'analyzing'
  | 'scoring'
  | 'complete'
  | 'error';

export interface ScanProgress {
  phase: ScanPhase;
  filesScanned: number;
  totalFiles: number;
  currentFile: string;
  message: string;
}

export type ReportFormat = 'json' | 'markdown' | 'html';

export interface ReportOutput {
  format: ReportFormat;
  content: string;
  filename: string;
}

export interface CliOptions {
  ci: boolean;
  format: ReportFormat;
  output: string;
  config: string;
  strictness: string;
  scoreThreshold: number;
}

export interface Goal {
  id: string;
  title: string;
  description: string;
  category: CategoryId;
  targetScore: number;
  currentScore: number;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'completed' | 'archived';
  notes: string[];
  history: GoalSnapshot[];
}

export interface Note {
  text: string;
  createdAt: string;
}

export interface Task {
  id: string;
  title: string;
  deadline?: string;
  createdAt: string;
  completedAt?: string;
  status: 'active' | 'completed' | 'archived';
  progress: number;
  notes: Note[];
  history: TaskSnapshot[];
}

export interface TaskSnapshot {
  status: 'active' | 'completed' | 'archived';
  progress?: number;
  timestamp: string;
  note?: string;
}

export interface TasksStore {
  tasks: Task[];
}

export interface GoalSnapshot {
  score: number;
  timestamp: string;
  note: string;
}

export interface ProgressEntry {
  id: string;
  goalId: string;
  date: string;
  score: number;
  note: string;
}

export interface GoalsStore {
  goals: Goal[];
}

export interface ExportOptions {
  format: ReportFormat;
  output?: string;
}
