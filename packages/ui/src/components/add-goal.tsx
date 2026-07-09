import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';
import type { CategoryId } from '@mri/core';

interface AddGoalScreenProps {
  onConfirm: (title: string, category: CategoryId, targetScore: number) => void;
  onBack: () => void;
}

const CATEGORIES: { id: CategoryId; label: string }[] = [
  { id: 'architecture', label: 'Architecture' },
  { id: 'dependencies', label: 'Dependencies' },
  { id: 'deadCode', label: 'Dead Code' },
  { id: 'duplicates', label: 'Duplicates' },
  { id: 'typeSafety', label: 'Type Safety' },
  { id: 'testCoverage', label: 'Test Coverage' },
  { id: 'configHealth', label: 'Config Health' },
  { id: 'securityHygiene', label: 'Security' },
  { id: 'performanceRisk', label: 'Performance' },
  { id: 'maintainability', label: 'Maintainability' },
];

const TARGETS = [50, 60, 70, 75, 80, 85, 90, 95, 100];

export function AddGoalScreen({ onConfirm, onBack }: AddGoalScreenProps) {
  const [step, setStep] = useState<'title' | 'category' | 'target'>('category');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<CategoryId>('typeSafety');
  const [targetScore, setTargetScore] = useState(80);
  const [catIdx, setCatIdx] = useState(0);
  const [targetIdx, setTargetIdx] = useState(4);

  useInput((input, key) => {
    if (key.escape) { onBack(); return; }

    if (step === 'category') {
      if (key.upArrow && catIdx > 0) setCatIdx(catIdx - 1);
      if (key.downArrow && catIdx < CATEGORIES.length - 1) setCatIdx(catIdx + 1);
      if (key.return) {
        const cat = CATEGORIES[catIdx];
        if (cat) {
          setCategory(cat.id);
          setTitle('Improve ' + cat.label);
          setStep('target');
        }
      }
      return;
    }

    if (step === 'target') {
      if (key.upArrow && targetIdx > 0) setTargetIdx(targetIdx - 1);
      if (key.downArrow && targetIdx < TARGETS.length - 1) setTargetIdx(targetIdx + 1);
      if (key.return) {
        const t = TARGETS[targetIdx];
        if (t) {
          setTargetScore(t);
          setStep('title');
        }
      }
      return;
    }

    if (step === 'title') {
      if (key.return) {
        onConfirm(title, category, targetScore);
        onBack();
      }
      return;
    }
  });

  if (step === 'category') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">Select Category</Text>
        {CATEGORIES.map((c, i) => (
          <Box key={c.id}>
            <Text color={i === catIdx ? 'cyan' : 'gray'}>
              {i === catIdx ? '\u203A ' : '  '}
            </Text>
            <Text color={i === catIdx ? 'white' : undefined}>{c.label}</Text>
          </Box>
        ))}
        <Box marginTop={1}>
          <Text color="gray">\u2191\u2193 select  Enter confirm  Esc back</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'target') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">Target Score</Text>
        {TARGETS.map((t, i) => (
          <Box key={t}>
            <Text color={i === targetIdx ? 'cyan' : 'gray'}>
              {i === targetIdx ? '\u203A ' : '  '}
            </Text>
            <Text color={i === targetIdx ? 'white' : undefined}>{t}%</Text>
          </Box>
        ))}
        <Box marginTop={1}>
          <Text color="gray">\u2191\u2193 select  Enter confirm  Esc back</Text>
        </Box>
      </Box>
    );
  }

  if (step === 'title') {
    return (
      <Box flexDirection="column" padding={1}>
        <Text bold color="cyan">Goal Created</Text>
        <Box marginTop={1}>
          <Text>{title} → {targetScore}%</Text>
        </Box>
        <Box marginTop={1}>
          <Text color="gray">Press Enter to save</Text>
        </Box>
      </Box>
    );
  }

  return null;
}