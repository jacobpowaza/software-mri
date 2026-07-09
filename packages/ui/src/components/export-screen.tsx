import React from 'react';
import { Text, Box } from 'ink';

interface ExportScreenProps {
  onExport: (format: 'json' | 'markdown' | 'html') => void;
  onBack: () => void;
  lastExport?: string;
}

export function ExportScreen({ onExport, onBack, lastExport }: ExportScreenProps) {
  return (
    <Box flexDirection="column" alignItems="center" padding={1}>
      <Text bold color="cyan">Export Report</Text>
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text>1. Export as JSON</Text>
        <Text>2. Export as Markdown</Text>
        <Text>3. Export as HTML</Text>
      </Box>
      {lastExport && (
        <Box marginTop={1}>
          <Text color="green">
            Exported: {lastExport}
          </Text>
        </Box>
      )}
      <Box marginTop={1}>
        <Text color="gray">Press 1-3 to export, Esc to go back</Text>
      </Box>
    </Box>
  );
}