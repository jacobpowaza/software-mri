import React, { useState } from 'react';
import { Text, Box, useInput } from 'ink';
import type { Goal, CategoryId } from '@software-mri/core';
import { mapScoreToGoalStatus } from '@software-mri/core';
import { useTerminalSize } from '../hooks/use-terminal-size.js';

interface GoalsScreenProps {
  goals: Goal[];
  onToggle: (goalId: string) => void;
  onDelete: (goalId: string) => void;
  onAdd: () => void;
  onBack: () => void;
  onEditNote: (goalId: string) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  architecture: 'cyan', dependencies: 'yellow', deadCode: 'red',
  duplicates: 'magenta', typeSafety: 'blue', testCoverage: 'green',
  configHealth: 'yellow', securityHygiene: 'red', performanceRisk: 'cyan',
  maintainability: 'green',
};

export function GoalsScreen({ goals, onToggle, onDelete, onBack, onAdd, onEditNote }: GoalsScreenProps) {
  const { isCompact } = useTerminalSize();
  const [selected, setSelected] = useState(0);
  const activeGoals = goals.filter(g => g.status !== 'archived');

  useInput((input, key) => {
    if (key.escape) { onBack(); return; }
    if (key.upArrow && selected > 0) { setSelected(selected - 1); return; }
    if (key.downArrow && selected < activeGoals.length - 1) { setSelected(selected + 1); return; }
    if (key.return) {
      const goal = activeGoals[selected];
      if (goal) onToggle(goal.id);
      return;
    }
    if (input === 'd') {
      const goal = activeGoals[selected];
      if (goal) onDelete(goal.id);
      return;
    }
    if (input === 'n') { onAdd(); return; }
    if (input === 'e') {
      const goal = activeGoals[selected];
      if (goal) onEditNote(goal.id);
    }
  });

  if (activeGoals.length === 0) {
    return (
      <Box flexDirection="column" padding={1} alignItems="center">
        <Text bold color="cyan">Productivity Goals</Text>
        <Box marginY={1}>
          <Text color="gray">No goals yet. Press <Text color="cyan">n</Text> to create one.</Text>
        </Box>
        <Text color="gray">n new  Esc back</Text>
      </Box>
    );
  }

  const maxDisplay = isCompact ? 6 : 12;
  const displayed = activeGoals.slice(0, maxDisplay);

  return (
    <Box flexDirection="column" minHeight={10} padding={0}>
      <Box justifyContent="space-between" marginBottom={0}>
        <Text bold color="cyan">Productivity Goals</Text>
        <Text color="gray">{activeGoals.filter(g => g.status === 'completed').length}/{activeGoals.length} done</Text>
      </Box>

      {displayed.map((goal, i) => {
        const isSel = i === selected;
        const status = goal.status === 'completed' ? 'reached' : mapScoreToGoalStatus(goal.currentScore, goal.targetScore);
        const color = CATEGORY_COLORS[goal.category] || 'white';
        const barWidth = isCompact ? 15 : 20;
        const filled = Math.round((goal.currentScore / goal.targetScore) * barWidth);
        const bar = goal.status === 'completed'
          ? '✓'.repeat(Math.min(barWidth, 15))
          : '\u2588'.repeat(Math.min(filled, barWidth)) + '\u2591'.repeat(Math.max(0, barWidth - filled));

        return (
          <Box key={goal.id} flexDirection="column" marginBottom={0}>
            <Box>
              <Text color={isSel ? 'cyan' : 'gray'}>
                {isSel ? '\u203A ' : '  '}
              </Text>
              <Text color={isSel ? 'white' : undefined}>
                <Text bold color={color}>{goal.title}</Text>
              </Text>
              <Text color="gray">  {goal.currentScore}%/{goal.targetScore}%</Text>
              {goal.status === 'completed' && <Text color="green">  ✓</Text>}
            </Box>
            <Box marginLeft={2}>
              <Text color={status === 'reached' ? 'green' : status === 'close' ? 'yellow' : 'gray'}>
                {bar}
              </Text>
            </Box>
          </Box>
        );
      })}

      {isCompact && activeGoals.length > maxDisplay && (
        <Text color="gray">  ...{activeGoals.length - maxDisplay} more goals</Text>
      )}

      <Box justifyContent="center" marginTop={0}>
        <Box gap={1}>
          <Text color="gray">\u2191\u2193 select</Text>
          <Text color="gray">Enter toggle</Text>
          <Text color="gray">n add</Text>
          <Text color="gray">d delete</Text>
          <Text color="gray">e note</Text>
          <Text color="gray">Esc back</Text>
        </Box>
      </Box>
    </Box>
  );
}

function center<T>(items: T[], width: number): T[] {
  return items;
}

export function GoalProgressBar({ current, target }: { current: number; target: number }) {
  const barWidth = 15;
  const filled = Math.round((current / target) * barWidth);
  const bar = '\u2588'.repeat(Math.min(filled, barWidth)) + '\u2591'.repeat(Math.max(0, barWidth - filled));
  return <Text>{bar} {current}%/{target}%</Text>;
}