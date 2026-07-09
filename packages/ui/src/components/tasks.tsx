import React, { useState, useMemo } from 'react';
import { Text, Box, useInput } from 'ink';
import type { Task } from '@software-mri/core';

interface TasksScreenProps {
  tasks: Task[];
  onToggle: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  onAdd: () => void;
  onBack: () => void;
  onSelectTask: (task: Task) => void;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function formatDeadline(d?: string): string {
  if (!d) return '';
  const date = new Date(d);
  const now = new Date();
  const diff = date.getTime() - now.getTime();
  const days = Math.round(diff / 86400000);
  if (days < 0) return `${Math.abs(days)}d ago`;
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  return `${days}d left`;
}

function isOverdue(task: Task): boolean {
  if (task.status !== 'active' || !task.deadline) return false;
  return new Date(task.deadline).getTime() < Date.now();
}

function isToday(dateStr?: string): boolean {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.toDateString() === now.toDateString();
}

export function TasksScreen({ tasks, onToggle, onDelete, onAdd, onBack, onSelectTask }: TasksScreenProps) {
  const [selected, setSelected] = useState(0);
  const [showDone, setShowDone] = useState(false);

  const sections = useMemo(() => {
    const overdue: Task[] = [];
    const todayActive: Task[] = [];
    const active: Task[] = [];
    const completed: Task[] = [];

    for (const t of tasks) {
      if (t.status === 'completed') {
        completed.push(t);
      } else if (isOverdue(t)) {
        overdue.push(t);
      } else if (isToday(t.createdAt)) {
        todayActive.push(t);
      } else {
        active.push(t);
      }
    }

    return { overdue, todayActive, active, completed };
  }, [tasks]);

  const flatList = useMemo(() => {
    const list: { type: 'overdue-header' | 'today-header' | 'active-header' | 'done-header' | 'task'; task?: Task }[] = [];
    if (sections.overdue.length > 0) {
      list.push({ type: 'overdue-header' });
      for (const t of sections.overdue) list.push({ type: 'task', task: t });
    }
    if (sections.todayActive.length > 0) {
      list.push({ type: 'today-header' });
      for (const t of sections.todayActive) list.push({ type: 'task', task: t });
    }
    if (sections.active.length > 0) {
      list.push({ type: 'active-header' });
      for (const t of sections.active) list.push({ type: 'task', task: t });
    }
    if (sections.completed.length > 0 && showDone) {
      list.push({ type: 'done-header' });
      for (const t of sections.completed) list.push({ type: 'task', task: t });
    }
    return list;
  }, [sections, showDone]);

  const activeCount = tasks.filter(t => t.status === 'active').length;
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const totalCount = tasks.length;

  const chartData = useMemo(() => {
    const days: { label: string; count: number }[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dayStr = d.toDateString();
      const count = tasks.filter(t => {
        if (!t.completedAt) return false;
        return new Date(t.completedAt).toDateString() === dayStr;
      }).length;
      const wkIdx = d.getDay() === 0 ? 6 : d.getDay() - 1;
      days.push({ label: WEEKDAYS[wkIdx] ?? '', count });
    }
    return days;
  }, [tasks]);

  useInput((input, key) => {
    if (key.escape) { onBack(); return; }
    if (key.upArrow && selected > 0) { setSelected(selected - 1); return; }
    if (key.downArrow && selected < flatList.length - 1) { setSelected(selected + 1); return; }
    if (key.return && flatList.length > 0) {
      const entry = flatList[selected]!;
      if (entry.type === 'task' && entry.task) onSelectTask(entry.task);
      return;
    }
    if (input === 'd' && flatList.length > 0) {
      const entry = flatList[selected]!;
      if (entry.type === 'task' && entry.task) onDelete(entry.task.id);
      return;
    }
    if (input === 'n') { onAdd(); return; }
    if (input === 'h') { setShowDone(!showDone); return; }
  });

  return (
    <Box flexDirection="column" padding={0}>
      <Box justifyContent="space-between" marginBottom={0}>
        <Text bold color="cyan">Tasks</Text>
        <Text color="gray">{completedCount}/{totalCount} done ({totalCount > 0 ? Math.round(completedCount / totalCount * 100) : 0}%)</Text>
      </Box>

      {chartData.some(d => d.count > 0) && (
        <Box flexDirection="column" marginBottom={0}>
          <Box marginLeft={2} gap={0}>
            {chartData.map((d, i) => (
              <Box key={i} width={5} flexDirection="column" alignItems="center">
                <Text color="gray">{d.count || ' '}</Text>
              </Box>
            ))}
          </Box>
          <Box marginLeft={2} gap={0}>
            {chartData.map((d, i) => (
              <Box key={i} width={5} flexDirection="column" alignItems="center">
                <Text color="green">{d.count > 0 ? '\u2588' : '\u2591'}</Text>
              </Box>
            ))}
          </Box>
          <Box marginLeft={2} gap={0}>
            {chartData.map((d, i) => (
              <Box key={i} width={5} flexDirection="column" alignItems="center">
                <Text color="gray">{d.label}</Text>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {flatList.length === 0 && (
        <Box marginY={1}>
          <Text color="gray">No tasks yet. Press <Text color="cyan">n</Text> to create one.</Text>
        </Box>
      )}

      {flatList.map((entry, i) => {
        if (entry.type === 'overdue-header') {
          return (
            <Box key="oh" marginTop={0}>
              <Text bold color="red">Overdue</Text>
            </Box>
          );
        }
        if (entry.type === 'today-header') {
          return (
            <Box key="th" marginTop={0}>
              <Text bold color="yellow">Today</Text>
            </Box>
          );
        }
        if (entry.type === 'active-header') {
          return (
            <Box key="ah" marginTop={0}>
              <Text bold color="cyan">Active</Text>
            </Box>
          );
        }
        if (entry.type === 'done-header') {
          return (
            <Box key="dh" marginTop={0}>
              <Text bold color="green">Completed</Text>
            </Box>
          );
        }
        if (entry.type === 'task' && entry.task) {
          const isDone = entry.task.status === 'completed';
          const pct = entry.task.progress ?? 0;
          const barLen = Math.round(pct / 20);
          const bar = '\u2588'.repeat(barLen) + '\u2591'.repeat(5 - barLen);
          const hasNotes = (entry.task.notes?.length ?? 0) > 0;
          return (
            <Box key={entry.task.id} flexDirection="column">
              <Box>
                <Text color={i === selected ? 'cyan' : 'gray'}>
                  {i === selected ? '\u203A ' : '  '}
                </Text>
                {isDone ? (
                  <Text color="green">{'\u2713 '}</Text>
                ) : (
                  <Text color={i === selected ? 'white' : undefined}>{'  '}</Text>
                )}
                <Text
                  color={isDone ? 'gray' : i === selected ? 'white' : undefined}
                  strikethrough={isDone}
                >
                  {entry.task.title}
                </Text>
                {entry.task.deadline && (
                  <Text color={isOverdue(entry.task) ? 'red' : 'gray'}>
                    {' '}{formatDeadline(entry.task.deadline)}
                  </Text>
                )}
              </Box>
              {!isDone && pct > 0 && (
                <Box marginLeft={4}>
                  <Text color="gray">{bar} {pct}%</Text>
                  {hasNotes && <Text color="cyan">{' \u2606'}</Text>}
                </Box>
              )}
              {!isDone && hasNotes && pct === 0 && (
                <Box marginLeft={4}>
                  <Text color="cyan">{'\u2606 note'}</Text>
                </Box>
              )}
            </Box>
          );
        }
        return null;
      })}

      {sections.completed.length > 0 && (
        <Box marginTop={0}>
          <Text color="gray">
            {showDone ? 'h hide' : 'h show'} completed ({sections.completed.length})
          </Text>
        </Box>
      )}

      <Box justifyContent="center" marginTop={0}>
        <Box gap={1}>
          <Text color="gray">{'\u2191\u2193 select'}</Text>
          <Text color="gray">Enter detail</Text>
          <Text color="gray">n add</Text>
          <Text color="gray">d delete</Text>
          <Text color="gray">h done</Text>
          <Text color="gray">Esc back</Text>
        </Box>
      </Box>
    </Box>
  );
}
