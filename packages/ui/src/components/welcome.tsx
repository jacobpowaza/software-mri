import React from 'react';
import { Text, Box } from 'ink';

interface WelcomeScreenProps {
  projectName?: string;
  frameworks?: string[];
  packageManager?: string;
}

export function WelcomeScreen({ projectName, frameworks, packageManager }: WelcomeScreenProps) {
  return (
    <Box flexDirection="column" alignItems="center" justifyContent="center" paddingY={1}>
      <Text bold color="cyan">
        Software MRI
      </Text>
      <Text color="gray">
        Production Readiness Scanner
      </Text>
      <Box marginTop={1} flexDirection="column">
        {projectName && (
          <Text>
            Project: <Text bold>{projectName}</Text>
          </Text>
        )}
        {frameworks && frameworks.length > 0 && (
          <Text>
            Frameworks: <Text bold>{frameworks.join(', ')}</Text>
          </Text>
        )}
        {packageManager && (
          <Text>
            Package Manager: <Text bold>{packageManager}</Text>
          </Text>
        )}
      </Box>
      <Box marginTop={1} flexDirection="column" alignItems="center">
        <Text color="green">Press Enter to start scanning</Text>
        <Text color="gray">or 'q' to quit</Text>
      </Box>
    </Box>
  );
}