import React, { useState, useMemo } from 'react';
import { Text, Box, useInput } from 'ink';
import type { Task } from '@software-mri/core';

interface TaskDetailScreenProps {
  task: Task;
  onUpdateProgress: (taskId: string, progress: number) => void;
  onAddNote: (taskId: string, note: string) => void;
  onToggle: (taskId: string) => void;
  onBack: () => void;
}

type Step = 'menu' | 'progress' | 'note';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const PROGRESS_OPTIONS = [0, 10, 25, 50, 75, 90, 100];
const HEAT_WEEKS = 10;

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

function fmtTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function fmtDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString();
}

function sameDay(a: string, b: string): boolean {
  return new Date(a).toDateString() === new Date(b).toDateString();
}

function buildHeatmap(task: Task): { weeks: number[][] } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);

  const dayOfWeek = now.getDay();
  const daysSinceMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const thisMonday = new Date(now);
  thisMonday.setDate(thisMonday.getDate() - daysSinceMonday);

  const start = new Date(thisMonday);
  start.setDate(start.getDate() - (HEAT_WEEKS - 1) * 7);

  const dayCounts: Record<string, number> = {};

  for (const h of task.history) {
    const key = new Date(h.timestamp).toDateString();
    dayCounts[key] = (dayCounts[key] ?? 0) + 1;
  }

  for (const n of task.notes) {
    const key = new Date(n.createdAt).toDateString();
    dayCounts[key] = (dayCounts[key] ?? 0) + 1;
  }

  const weeks: number[][] = [];
  for (let w = 0; w < HEAT_WEEKS; w++) {
    const cols: number[] = [];
    for (let d = 0; d < 7; d++) {
      const day = new Date(start);
      day.setDate(day.getDate() + w * 7 + d);
      const key = day.toDateString();
      cols.push(dayCounts[key] ?? 0);
    }
    weeks.push(cols);
  }

  return { weeks };
}

function heatChar(count: number): string {
  if (count === 0) return '\u2591';
  if (count === 1) return '\u2592';
  if (count === 2) return '\u2593';
  return '\u2588';
}

function heatColor(count: number): string {
  if (count === 0) return 'gray';
  if (count === 1) return 'green';
  if (count === 2) return 'green';
  return 'green';
}

export function TaskDetailScreen({ task, onUpdateProgress, onAddNote, onToggle, onBack }: TaskDetailScreenProps) {
  const [step, setStep] = useState<Step>('menu');
  const [menuIdx, setMenuIdx] = useState(0);
  const [prgIdx, setPrgIdx] = useState(0);
  const [noteBuf, setNoteBuf] = useState('');
  const [showNotes, setShowNotes] = useState(false);

  const isDone = task.status === 'completed';
  const pct = task.progress ?? 0;
  const barLen = Math.round(pct / 10);
  const bar = '\u2588'.repeat(barLen) + '\u2591'.repeat(10 - barLen);

  const menuItems = showNotes
    ? task.notes.map(n => ({ type: 'note-item' as const, label: `[${fmtDate(n.createdAt)}] ${n.text}` }))
    : [
        { type: 'action' as const, label: `Set Progress (${pct}%)` },
        { type: 'action' as const, label: 'Add Note' },
        { type: 'action' as const, label: isDone ? 'Reopen Task' : 'Mark Completed' },
        { type: 'action' as const, label: task.notes.length > 0 ? `View Notes (${task.notes.length})` : 'Notes (0)' },
        { type: 'action' as const, label: 'Back' },
      ];

  const heatData = useMemo(() => buildHeatmap(task), [task]);

  useInput((input, key) => {
    if (key.escape) {
      if (step === 'progress' || step === 'note') { setStep('menu'); return; }
      if (showNotes) { setShowNotes(false); return; }
      onBack();
      return;
    }

    if (step === 'note') {
      if (key.return && noteBuf.trim()) {
        onAddNote(task.id, noteBuf.trim());
        setNoteBuf('');
        setStep('menu');
        return;
      }
      if (key.backspace || key.delete) {
        setNoteBuf(noteBuf.slice(0, -1));
        return;
      }
      if (input && input.length === 1 && input.charCodeAt(0) >= 32) {
        setNoteBuf(noteBuf + input);
      }
      return;
    }

    if (step === 'progress') {
      if (key.upArrow && prgIdx > 0) setPrgIdx(prgIdx - 1);
      if (key.downArrow && prgIdx < PROGRESS_OPTIONS.length - 1) setPrgIdx(prgIdx + 1);
      if (key.return) {
        onUpdateProgress(task.id, PROGRESS_OPTIONS[prgIdx]!);
        setStep('menu');
      }
      return;
    }

    if (step === 'menu') {
      if (key.upArrow && menuIdx > 0) setMenuIdx(menuIdx - 1);
      if (key.downArrow && menuIdx < menuItems.length - 1) setMenuIdx(menuIdx + 1);
      if (key.return) {
        if (showNotes) {
          setShowNotes(false);
          return;
        }
        const item = menuItems[menuIdx];
        if (!item) return;
        switch (menuIdx) {
          case 0: setPrgIdx(PROGRESS_OPTIONS.indexOf(Math.round(pct / 10) * 10)); setStep('progress'); break;
          case 1: setNoteBuf(''); setStep('note'); break;
          case 2: onToggle(task.id); break;
          case 3:
            if (task.notes.length > 0) setShowNotes(true);
            break;
          case 4: onBack(); break;
        }
      }
      return;
    }
  });

  if (step === 'progress') {
    return (
      <Box flexDirection="column" padding={0}>
        <Text bold color="cyan">Set Progress</Text>
        <Box marginTop={0}>
          <Text color="gray">{task.title}</Text>
        </Box>
        <Box flexDirection="column" marginTop={0}>
          {PROGRESS_OPTIONS.map((p, i) => (
            <Box key={p}>
              <Text color={i === prgIdx ? 'cyan' : 'gray'}>
                {i === prgIdx ? '\u203A ' : '  '}
              </Text>
              <Text color={i === prgIdx ? 'white' : undefined}>{p}%</Text>
              {p === 100 && <Text color="green"> {'\u2713'}</Text>}
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Enter select  Esc back</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'note') {
    return (
      <Box flexDirection="column" padding={0}>
        <Text bold color="cyan">Add Note</Text>
        <Box marginTop={0}>
          <Text color="gray">Task: {task.title}</Text>
        </Box>
        <Box marginTop={0}>
          <Text color="gray">Type your note:</Text>
        </Box>
        <Box marginTop={0}>
          <Text color="cyan">{'\u203A '}</Text>
          <Text>{noteBuf || '\u2500'}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Enter confirm  Esc back</Text>
        </Box>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" padding={0}>
      <Text bold color="cyan">Task Detail</Text>
      <Box marginTop={0}>
        <Text bold>{task.title}</Text>
      </Box>
      <Box>
        <Text color={isDone ? 'green' : 'yellow'}>{isDone ? 'Completed' : 'Active'}</Text>
        {task.deadline && (
          <Text color="gray">  |  {formatDeadline(task.deadline)}</Text>
        )}
      </Box>

      <Box marginTop={0}>
        <Text color="gray">{bar} {pct}%</Text>
      </Box>

      <Box marginTop={0} flexDirection="column">
        <Text color="gray" bold>Activity</Text>
        <Box>
          <Box flexDirection="column" marginRight={0}>
            {WEEKDAYS.map(d => (
              <Text key={d} color="gray">{d}</Text>
            ))}
          </Box>
          <Box flexDirection="column" marginLeft={0}>
            {heatData.weeks[0]!.map((_, dayIdx) => (
              <Box key={dayIdx}>
                {heatData.weeks.map((week, wIdx) => {
                  const count = week[dayIdx] ?? 0;
                  const ch = heatChar(count);
                  const color = heatColor(count);
                  const todayDow = new Date().getDay();
                  const todayIdx = todayDow === 0 ? 6 : todayDow - 1;
                  const isToday = wIdx === HEAT_WEEKS - 1 && dayIdx === todayIdx
                    ? true
                    : false;
                  return (
                    <Text key={wIdx} color={isToday ? 'cyan' : color}>
                      {ch}{' '}
                    </Text>
                  );
                })}
              </Box>
            ))}
          </Box>
        </Box>
      </Box>

      <Box flexDirection="column" marginTop={0}>
        {menuItems.map((item, i) => (
          <Box key={i}>
            <Text color={i === menuIdx ? 'cyan' : 'gray'}>
              {i === menuIdx ? '\u203A ' : '  '}
            </Text>
            <Text color={i === menuIdx ? 'white' : undefined}>
              {item.label}
            </Text>
          </Box>
        ))}
      </Box>

      <Box marginTop={0}>
        <Text color="gray">{'\u2191\u2193 select  Enter choose  Esc back'}</Text>
      </Box>
    </Box>
  );
}
