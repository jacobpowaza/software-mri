import type { ScanResult, ScanProgress, Issue, ExportOptions, ReportFormat, CategoryId } from '@mri/core';

export type Screen =
  | 'welcome'
  | 'scanning'
  | 'dashboard'
  | 'issues'
  | 'issue-detail'
  | 'export'
  | 'settings'
  | 'help';

export interface UIState {
  screen: Screen;
  scanResult: ScanResult | null;
  scanProgress: ScanProgress | null;
  selectedCategory: CategoryId | null;
  selectedIssue: number;
  compactMode: boolean;
  exportOptions: ExportOptions;
  commandPaletteOpen: boolean;
  searchQuery: string;
  filteredIssues: string[];
}

export { Dashboard } from './components/dashboard.js';
export { ScanProgressView } from './components/scan-progress.js';
export { IssueDetail } from './components/issue-detail.js';
export { WelcomeScreen } from './components/welcome.js';
export { ExportScreen } from './components/export-screen.js';
export { HelpScreen } from './components/help-screen.js';
export { Layout } from './components/layout.js';
export { TasksScreen } from './components/tasks.js';
export { TaskDetailScreen } from './components/task-detail.js';
export { AddTaskScreen } from './components/add-task.js';
export { GoalsScreen } from './components/goals.js';
export { AddGoalScreen } from './components/add-goal.js';
export { GoalSummary } from './components/goal-summary.js';
export { GoalNoteScreen } from './components/goal-note.js';
export { useTerminalSize } from './hooks/use-terminal-size.js';