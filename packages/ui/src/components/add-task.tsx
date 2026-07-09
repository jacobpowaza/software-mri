import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';

interface AddTaskScreenProps {
  onConfirm: (title: string, deadline?: string, progress?: number, note?: string) => void;
  onBack: () => void;
}

type Step = 'title' | 'typing' | 'deadline' | 'progress' | 'note' | 'confirm';

const TITLE_PRESETS = [
  'Finish the auth module',
  'Refactor the API layer',
  'Write unit tests for ...',
  'Fix build pipeline',
  'Review PRs',
  'Deploy to staging',
  'Custom...',
];

const DEADLINE_OPTIONS: { label: string; days?: number }[] = [
  { label: 'No deadline' },
  { label: 'Today', days: 0 },
  { label: 'Tomorrow', days: 1 },
  { label: 'This week (Fri)', days: undefined },
  { label: 'Next week (Fri)', days: undefined },
  { label: 'This month', days: undefined },
];

const PROGRESS_OPTIONS = [0, 25, 50, 75, 100];

function computeDate(opt: { label: string; days?: number }): string | undefined {
  if (opt.days !== undefined) {
    const d = new Date();
    d.setDate(d.getDate() + opt.days);
    return d.toISOString();
  }
  const now = new Date();
  if (opt.label.includes('This week')) {
    const day = now.getDay();
    const daysToFri = day <= 5 ? 5 - day : 6;
    const d = new Date(now);
    d.setDate(d.getDate() + daysToFri);
    return d.toISOString();
  }
  if (opt.label.includes('Next week')) {
    const day = now.getDay();
    const daysToNextFri = day <= 5 ? (5 - day) + 7 : 6 + 7;
    const d = new Date(now);
    d.setDate(d.getDate() + daysToNextFri);
    return d.toISOString();
  }
  if (opt.label.includes('This month')) {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return d.toISOString();
  }
  return undefined;
}

export function AddTaskScreen({ onConfirm, onBack }: AddTaskScreenProps) {
  const [step, setStep] = useState<Step>('title');
  const [title, setTitle] = useState('');
  const [titleIdx, setTitleIdx] = useState(0);
  const [dlIdx, setDlIdx] = useState(0);
  const [prgIdx, setPrgIdx] = useState(0);
  const [noteText, setNoteText] = useState('');
  const [inputBuf, setInputBuf] = useState('');

  useInput((input, key) => {
    if (key.escape) {
      if (step === 'typing' || step === 'note') {
        setStep('title');
        return;
      }
      if (step === 'deadline') { setStep('title'); return; }
      if (step === 'progress') { setStep('deadline'); return; }
      if (step === 'confirm') { setStep('note'); return; }
      onBack();
      return;
    }

    if (step === 'title') {
      if (key.upArrow && titleIdx > 0) setTitleIdx(titleIdx - 1);
      if (key.downArrow && titleIdx < TITLE_PRESETS.length - 1) setTitleIdx(titleIdx + 1);
      if (key.return) {
        const selected = TITLE_PRESETS[titleIdx];
        if (!selected) return;
        if (selected === 'Custom...') {
          setInputBuf('');
          setStep('typing');
        } else {
          setTitle(selected);
          setStep('deadline');
        }
      }
      return;
    }

    if (step === 'typing') {
      if (key.return && inputBuf.trim()) {
        setTitle(inputBuf.trim());
        setStep('deadline');
        return;
      }
      if (key.backspace || key.delete) {
        setInputBuf(inputBuf.slice(0, -1));
        return;
      }
      if (input && input.length === 1 && input.charCodeAt(0) >= 32) {
        setInputBuf(inputBuf + input);
      }
      return;
    }

    if (step === 'deadline') {
      if (key.upArrow && dlIdx > 0) setDlIdx(dlIdx - 1);
      if (key.downArrow && dlIdx < DEADLINE_OPTIONS.length - 1) setDlIdx(dlIdx + 1);
      if (key.return) setStep('progress');
      return;
    }

    if (step === 'progress') {
      if (key.upArrow && prgIdx > 0) setPrgIdx(prgIdx - 1);
      if (key.downArrow && prgIdx < PROGRESS_OPTIONS.length - 1) setPrgIdx(prgIdx + 1);
      if (key.return) { setNoteText(''); setStep('note'); }
      return;
    }

    if (step === 'note') {
      if (key.return) {
        if (inputBuf.trim()) {
          setNoteText(inputBuf.trim());
        }
        setStep('confirm');
        return;
      }
      if (key.backspace || key.delete) {
        setInputBuf(inputBuf.slice(0, -1));
        return;
      }
      if (input && input.length === 1 && input.charCodeAt(0) >= 32) {
        setInputBuf(inputBuf + input);
      }
      return;
    }

    if (step === 'confirm') {
      if (key.return) {
        const opt = DEADLINE_OPTIONS[dlIdx]!;
        const deadline = opt.label === 'No deadline' ? undefined : computeDate(opt);
        const progress = PROGRESS_OPTIONS[prgIdx]!;
        onConfirm(title, deadline, progress, noteText || undefined);
        onBack();
      }
      return;
    }
  });

  if (step === 'title') {
    return (
      <Box flexDirection="column" padding={0}>
        <Text bold color="cyan">New Task</Text>
        <Box marginTop={0}>
          <Text color="gray">Pick a title:</Text>
        </Box>
        <Box flexDirection="column">
          {TITLE_PRESETS.map((t, i) => (
            <Box key={t}>
              <Text color={i === titleIdx ? 'cyan' : 'gray'}>
                {i === titleIdx ? '\u203A ' : '  '}
              </Text>
              <Text color={i === titleIdx ? 'white' : undefined}>{t}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">{'\u2191\u2193 select  Enter confirm  Esc back'}</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'typing') {
    return (
      <Box flexDirection="column" padding={0}>
        <Text bold color="cyan">New Task</Text>
        <Box marginTop={0}>
          <Text color="gray">Type your task title:</Text>
        </Box>
        <Box marginTop={0}>
          <Text color="cyan">{'\u203A '}</Text>
          <Text>{inputBuf || '\u2500'}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Enter confirm  Esc back</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'deadline') {
    return (
      <Box flexDirection="column" padding={0}>
        <Text bold color="cyan">Set Deadline</Text>
        <Box marginTop={0}>
          <Text color="gray">Task: {title}</Text>
        </Box>
        <Box flexDirection="column">
          {DEADLINE_OPTIONS.map((o, i) => (
            <Box key={o.label}>
              <Text color={i === dlIdx ? 'cyan' : 'gray'}>
                {i === dlIdx ? '\u203A ' : '  '}
              </Text>
              <Text color={i === dlIdx ? 'white' : undefined}>{o.label}</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">{'\u2191\u2193 select  Enter confirm  Esc back'}</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'progress') {
    return (
      <Box flexDirection="column" padding={0}>
        <Text bold color="cyan">Set Progress</Text>
        <Box marginTop={0}>
          <Text color="gray">Task: {title}</Text>
        </Box>
        <Box flexDirection="column">
          {PROGRESS_OPTIONS.map((p, i) => (
            <Box key={p}>
              <Text color={i === prgIdx ? 'cyan' : 'gray'}>
                {i === prgIdx ? '\u203A ' : '  '}
              </Text>
              <Text color={i === prgIdx ? 'white' : undefined}>{p}%</Text>
            </Box>
          ))}
        </Box>
        <Box marginTop={1}>
          <Text color="gray">{'\u2191\u2193 select  Enter confirm  Esc back'}</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'note') {
    return (
      <Box flexDirection="column" padding={0}>
        <Text bold color="cyan">Add Note</Text>
        <Box marginTop={0}>
          <Text color="gray">Task: {title}</Text>
        </Box>
        <Box marginTop={0}>
          <Text color="gray">Optional note (or leave empty):</Text>
        </Box>
        <Box marginTop={0}>
          <Text color="cyan">{'\u203A '}</Text>
          <Text>{inputBuf || '\u2500'}</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Enter confirm (empty to skip)  Esc back</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'confirm') {
    const deadlineLabel = DEADLINE_OPTIONS[dlIdx]?.label ?? 'No deadline';
    const progress = PROGRESS_OPTIONS[prgIdx] ?? 0;
    return (
      <Box flexDirection="column" padding={0}>
        <Text bold color="cyan">Confirm Task</Text>
        <Box marginTop={0}>
          <Text>Title:     <Text color="white">{title}</Text></Text>
        </Box>
        <Box>
          <Text>Deadline:  <Text color="white">{deadlineLabel}</Text></Text>
        </Box>
        <Box>
          <Text>Progress:  <Text color="white">{progress}%</Text></Text>
        </Box>
        {noteText && (
          <Box>
            <Text>Note:      <Text color="white">{noteText}</Text></Text>
          </Box>
        )}
        <Box marginTop={1}>
          <Text color="gray">Enter to create  Esc back</Text>
        </Box>
      </Box>
    );
  }

  return null;
}
