import React from 'react';
import { render } from 'ink';
import { createScanContext, detectProject } from '@software-mri/scanner';
import { createCheckRegistry } from '@software-mri/checks';
import { calculateScores } from '@software-mri/scoring';
import { loadConfig } from '@software-mri/config';
import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ScanResult, ScanProgress, Issue, Task, IssueStatus } from '@software-mri/core';
import { loadTasks, addTask, toggleTask, deleteTask, updateTaskProgress, addTaskNote } from '@software-mri/core';
import { Dashboard, ScanProgressView, IssueDetail, WelcomeScreen, ExportScreen, HelpScreen, TasksScreen, TaskDetailScreen, AddTaskScreen } from '@software-mri/ui';

type AppScreen = 'welcome' | 'scanning' | 'dashboard' | 'issue-detail' | 'export' | 'help' | 'tasks' | 'task-detail' | 'add-task';

function MriApp(): React.ReactElement | null {
  const [screen, setScreen] = React.useState<AppScreen>('welcome');
  const [result, setResult] = React.useState<ScanResult | null>(null);
  const [progress, setProgress] = React.useState<ScanProgress | null>(null);
  const [selectedIssue, setSelectedIssue] = React.useState<Issue | null>(null);
  const [selectedTask, setSelectedTask] = React.useState<Task | null>(null);
  const [tasks, setTasks] = React.useState<Task[]>([]);
  const [projectName, setProjectName] = React.useState('');
  const [frameworks, setFrameworks] = React.useState<string[]>([]);
  const [packageManager, setPackageManager] = React.useState('');
  const rootDir = process.cwd();

  const reloadTasks = React.useCallback(async () => {
    const store = await loadTasks(rootDir);
    const updated = store.tasks;
    setTasks(updated);
    if (selectedTask) {
      const found = updated.find(t => t.id === selectedTask.id);
      if (found) setSelectedTask(found);
    }
  }, [rootDir, selectedTask]);

  const startScan = React.useCallback(async () => {
    setScreen('scanning');
    const config = await loadConfig(rootDir);
    const scanContext = await createScanContext(rootDir, config);
    const project = detectProject(rootDir, scanContext.packageJson);
    setFrameworks(project.frameworks);
    setProjectName(project.name);
    setPackageManager(project.packageManager);

    setProgress({ phase: 'scanning', filesScanned: 0, totalFiles: scanContext.files.length, currentFile: '', message: 'Scanning...' });

    const registry = createCheckRegistry();
    setProgress({ phase: 'analyzing', filesScanned: scanContext.files.length, totalFiles: scanContext.files.length, currentFile: '', message: 'Analyzing...' });

    const startTime = Date.now();
    let filesProcessed = 0;
    const issues = await registry.runAll({ scan: scanContext, project, config }, (check) => {
      filesProcessed++;
      setProgress({ phase: 'analyzing', filesScanned: filesProcessed, totalFiles: registry.getAll().length, currentFile: check.name, message: 'Running: ' + check.name });
    });

    setProgress({ phase: 'scoring', filesScanned: scanContext.files.length, totalFiles: scanContext.files.length, currentFile: '', message: 'Scoring...' });

    const scanResult = calculateScores({ issues, project, config, scannedFiles: scanContext.files.length, scanDurationMs: Date.now() - startTime });
    setResult(scanResult);
    setScreen('dashboard');

    await writeFile(join(rootDir, '.mri-last-report.json'), JSON.stringify(scanResult, null, 2), 'utf-8');
    await reloadTasks();
  }, []);

  React.useEffect(() => { startScan(); }, []);

  const handleSelectIssue = (issue: Issue) => { setSelectedIssue(issue); setScreen('issue-detail'); };
  const handleBack = () => {
    switch (screen) {
      case 'issue-detail': setScreen('dashboard'); break;
      case 'export': setScreen('dashboard'); break;
      case 'help': setScreen(result ? 'dashboard' : 'welcome'); break;
      case 'tasks': setScreen('dashboard'); break;
      case 'task-detail': setScreen('tasks'); break;
      case 'add-task': setScreen('tasks'); break;
    }
  };

  const handleExport = () => setScreen('export');
  const handleOpenTasks = async () => { await reloadTasks(); setScreen('tasks'); };
  const handleOpenAddTask = () => setScreen('add-task');
  const handleSelectTask = (task: Task) => { setSelectedTask(task); setScreen('task-detail'); };

  const handleToggleTask = async (taskId: string) => {
    await toggleTask(rootDir, taskId);
    await reloadTasks();
  };

  const handleDeleteTask = async (taskId: string) => {
    await deleteTask(rootDir, taskId);
    await reloadTasks();
  };

  const handleUpdateProgress = async (taskId: string, progress: number) => {
    await updateTaskProgress(rootDir, taskId, progress);
    await reloadTasks();
  };

  const handleAddNote = async (taskId: string, note: string) => {
    await addTaskNote(rootDir, taskId, note);
    await reloadTasks();
  };

  const handleAddTask = async (title: string, deadline?: string, progress?: number, note?: string) => {
    await addTask(rootDir, { title, deadline, progress, notes: note ? [note] : undefined });
    await reloadTasks();
  };

  const handleDismiss = (issueId: string) => {
    if (!result) return;
    const updated = { ...result };
    for (const cat of updated.categories) {
      const idx = cat.issues.findIndex(i => i.id === issueId);
      if (idx !== -1) {
        cat.issues[idx] = { ...cat.issues[idx]!, status: 'dismissed' as IssueStatus };
      }
    }
    setResult(updated);
  };

  const handleExportResult = async (format: 'json' | 'markdown' | 'html') => {
    if (!result) return;
    const { generateReport } = await import('@software-mri/reporter');
    const report = generateReport(result, format);
    await writeFile(join(process.cwd(), report.filename), report.content, 'utf-8');
  };

  if (screen === 'welcome') return React.createElement(WelcomeScreen, { projectName, frameworks, packageManager });
  if (screen === 'scanning' && progress) return React.createElement(ScanProgressView, { progress });

  if (screen === 'dashboard' && result) {
    return React.createElement(Dashboard, {
      result,
      onSelectIssue: handleSelectIssue,
      onCategoryChange: () => {},
      onRescan: startScan,
      onExport: handleExport,
      onHelp: () => setScreen('help'),
      onQuit: () => process.exit(0),
      onTasks: handleOpenTasks,
    });
  }

  if (screen === 'issue-detail' && selectedIssue) return React.createElement(IssueDetail, { issue: selectedIssue, onBack: handleBack, onDismiss: handleDismiss });
  if (screen === 'export') return React.createElement(ExportScreen, { onExport: handleExportResult, onBack: handleBack });
  if (screen === 'help') return React.createElement(HelpScreen, { onBack: handleBack });

  if (screen === 'tasks') {
    return React.createElement(TasksScreen, {
      tasks,
      onToggle: handleToggleTask,
      onDelete: handleDeleteTask,
      onAdd: handleOpenAddTask,
      onBack: handleBack,
      onSelectTask: handleSelectTask,
    });
  }

  if (screen === 'task-detail' && selectedTask) {
    return React.createElement(TaskDetailScreen, {
      task: selectedTask,
      onUpdateProgress: handleUpdateProgress,
      onAddNote: handleAddNote,
      onToggle: handleToggleTask,
      onBack: handleBack,
    });
  }

  if (screen === 'add-task') {
    return React.createElement(AddTaskScreen, { onConfirm: handleAddTask, onBack: handleBack });
  }

  return null;
}

export async function runInteractiveScan(): Promise<void> {
  const { waitUntilExit } = render(React.createElement(MriApp));
  await waitUntilExit();
}
