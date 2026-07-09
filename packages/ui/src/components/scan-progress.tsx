import React from 'react';
import { Text, Box } from 'ink';
import type { ScanProgress } from '@mri/core';

interface ScanProgressViewProps {
  progress: ScanProgress;
}

export function ScanProgressView({ progress }: ScanProgressViewProps) {
  const barWidth = 20;
  const progressFraction = progress.totalFiles > 0
    ? progress.filesScanned / progress.totalFiles
    : 0;
  const filled = Math.round(progressFraction * barWidth);
  const empty = barWidth - filled;

  const phaseColors: Record<string, string> = {
    detecting: 'yellow',
    scanning: 'cyan',
    analyzing: 'magenta',
    scoring: 'blue',
    complete: 'green',
    error: 'red',
  };

  return (
    <Box flexDirection="column" alignItems="center" padding={1}>
      <Text bold color={phaseColors[progress.phase] || 'cyan'}>
        {progress.phase === 'detecting' && 'Detecting project...'}
        {progress.phase === 'scanning' && 'Scanning files...'}
        {progress.phase === 'analyzing' && 'Analyzing codebase...'}
        {progress.phase === 'scoring' && 'Calculating scores...'}
        {progress.phase === 'complete' && 'Complete!'}
        {progress.phase === 'error' && 'Error!'}
      </Text>

      <Box marginY={1}>
        <Text color="cyan">{'█'.repeat(filled)}</Text>
        <Text color="gray">{'░'.repeat(empty)}</Text>
      </Box>

      <Text color="gray">
        {progress.filesScanned}/{progress.totalFiles} files
      </Text>

      {progress.currentFile && (
        <Text color="gray" wrap="truncate">
          {progress.currentFile}
        </Text>
      )}
    </Box>
  );
}