import React from 'react';
import { Box, Text } from 'ink';
import { useTerminalSize } from '../hooks/use-terminal-size.js';

interface LayoutProps {
  children: React.ReactNode;
  statusBar?: React.ReactNode;
  title?: string;
  project?: string;
}

export function Layout({ children, statusBar, title, project }: LayoutProps) {
  const { columns } = useTerminalSize();
  const borderWidth = Math.min(columns - 2, 120);

  return (
    <Box flexDirection="column" height="100%" paddingX={1}>
      <Box borderStyle="round" borderColor="cyan" flexDirection="column" paddingX={1} paddingY={0}>
        <Box justifyContent="space-between">
          <Text bold color="cyan">
            {title || 'Software MRI'}
          </Text>
          {project && (
            <Text color="gray">
              {project}
            </Text>
          )}
        </Box>
        <Box borderStyle="single" borderColor="gray" marginTop={0} marginBottom={0}>
          {children}
        </Box>
        {statusBar && (
          <Box borderStyle="single" borderColor="gray" marginTop={0}>
            {statusBar}
          </Box>
        )}
      </Box>
    </Box>
  );
}