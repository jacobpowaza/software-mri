import React from 'react';
import { Text, Box, useInput } from 'ink';
import type { Issue } from '@mri/core';
import { useTerminalSize } from '../hooks/use-terminal-size.js';

interface IssueDetailProps {
  issue: Issue;
  onBack: () => void;
  onDismiss?: (issueId: string) => void;
}

export function IssueDetail({ issue, onBack, onDismiss }: IssueDetailProps) {
  const { columns } = useTerminalSize();
  const sevColor = issue.severity === 'critical' || issue.severity === 'high' ? 'red' :
    issue.severity === 'medium' ? 'yellow' : 'green';

  useInput((_input, key) => {
    if (key.escape) { onBack(); return; }
    if (key.return) { onBack(); return; }
    if (_input === 'f' && onDismiss) { onDismiss(issue.id); onBack(); }
  });

  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold>Issue: </Text>
        <Text bold color={sevColor}>{issue.title}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text>Severity: <Text color={sevColor}>{issue.severity.toUpperCase()}</Text></Text>
        <Text>Category: <Text color="cyan">{getCategoryLabel(issue.category)}</Text></Text>
        <Text>Confidence: <Text color={issue.confidence === 'high' ? 'green' : issue.confidence === 'medium' ? 'yellow' : 'gray'}>{issue.confidence}</Text></Text>
        <Text>Score impact: <Text color="red">-{issue.scoreImpact}%</Text></Text>
      </Box>

      {issue.files.length > 0 && (
        <Box flexDirection="column" marginBottom={1}>
          <Text bold>Affected files:</Text>
          {issue.files.slice(0, 5).map((f, i) => (
            <Text key={i} color="gray">  {f}</Text>
          ))}
          {issue.files.length > 5 && (
            <Text color="gray">  ... and {issue.files.length - 5} more</Text>
          )}
        </Box>
      )}

      <Box flexDirection="column" marginBottom={1}>
        <Text>Why this matters:</Text>
        <Text color="gray">{issue.description}</Text>
      </Box>

      <Box flexDirection="column" marginBottom={1}>
        <Text bold>How to fix:</Text>
        {issue.tips.map((tip, i) => (
          <Text key={i} color="cyan">
            {i + 1}. {tip}
          </Text>
        ))}
      </Box>

      <Box marginTop={1}>
        <Text color="gray">Esc back  f dismiss/flag as false positive</Text>
      </Box>
    </Box>
  );
}

function getCategoryLabel(id: string): string {
  const labels: Record<string, string> = {
    architecture: 'Architecture', dependencies: 'Dependencies', deadCode: 'Dead Code',
    duplicates: 'Duplicates', typeSafety: 'Type Safety', testCoverage: 'Test Coverage',
    configHealth: 'Config Health', securityHygiene: 'Security', performanceRisk: 'Performance',
    maintainability: 'Maintainability',
  };
  return labels[id] || id;
}