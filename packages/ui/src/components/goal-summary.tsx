import React from 'react';
import { Text, Box } from 'ink';
import type { Goal } from '@software-mri/core';
import { useTerminalSize } from '../hooks/use-terminal-size.js';

interface GoalSummaryProps {
  goals: Goal[];
  onOpenGoals: () => void;
}

export function GoalSummary({ goals, onOpenGoals }: GoalSummaryProps) {
  const { isCompact } = useTerminalSize();
  const active = goals.filter(g => g.status === 'active');
  const completed = goals.filter(g => g.status === 'completed');
  if (active.length === 0 && completed.length === 0) return null;

  if (isCompact) {
    return (
      <Box marginTop={0} justifyContent="space-between">
        <Text color="gray">Goals: <Text color="cyan">{active.length} active</Text> <Text color="green">{completed.length} done</Text></Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" marginTop={0} marginBottom={0}>
      <Box justifyContent="space-between">
        <Text bold color="cyan">Goals</Text>
        <Text color="gray">{completed.length}/{goals.length} done  g open</Text>
      </Box>
      {active.slice(0, 3).map(goal => {
        const barWidth = 10;
        const filled = Math.round((goal.currentScore / goal.targetScore) * barWidth);
        const bar = '\u2588'.repeat(Math.min(filled, barWidth)) + '\u2591'.repeat(Math.max(0, barWidth - filled));
        const color = goal.currentScore >= goal.targetScore ? 'green' : goal.currentScore >= goal.targetScore * 0.75 ? 'yellow' : 'gray';
        return (
          <Box key={goal.id} justifyContent="space-between">
            <Text>{goal.title}</Text>
            <Text color={color}>{bar} {goal.currentScore}%/{goal.targetScore}%</Text>
          </Box>
        );
      })}
    </Box>
  );
}