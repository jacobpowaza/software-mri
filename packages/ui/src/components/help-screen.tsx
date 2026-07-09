import React from 'react';
import { Text, Box } from 'ink';

interface HelpScreenProps {
  onBack: () => void;
}

export function HelpScreen({ onBack }: HelpScreenProps) {
  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Keyboard Shortcuts</Text>
      <Box marginTop={1} flexDirection="column">
        <Text>  {'\u2191'} / {'\u2193'}  Navigate issues</Text>
        <Text>  {'\u2190'} / {'\u2192'}  Switch categories</Text>
        <Text>  Enter        Open selected issue</Text>
        <Text>  Esc          Go back</Text>
        <Text>  /            Search issues</Text>
        <Text>  g            Open goals</Text>
        <Text>  Ctrl+K       Command palette</Text>
        <Text>  r            Rescan project</Text>
        <Text>  e            Export report</Text>
        <Text>  ?            Toggle this help</Text>
        <Text>  q            Quit</Text>
      </Box>
      <Box marginTop={1} flexDirection="column">
        <Text bold color="cyan">Commands</Text>
        <Text color="gray">  mri scan         Run production scan</Text>
        <Text color="gray">  mri report       View last report</Text>
        <Text color="gray">  mri doctor       Fix common issues</Text>
        <Text color="gray">  mri goals        Manage productivity goals</Text>
        <Text color="gray">  mri explain id  Explain an issue</Text>
        <Text color="gray">  mri export       Export report</Text>
        <Text color="gray">  mri init         Create config</Text>
        <Text color="gray">  mri config       Edit config</Text>
      </Box>
      <Box marginTop={1}>
        <Text color="gray">Press Esc to go back</Text>
      </Box>
    </Box>
  );
}