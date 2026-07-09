import React, { useState } from 'react';
import { Text, Box } from 'ink';

interface GoalNoteScreenProps {
  goalTitle: string;
  onSave: (note: string) => void;
  onBack: () => void;
}

const PRESETS = [
  'Fixed some issues',
  'Need to investigate further',
  'Score improved this session',
  'Will fix next sprint',
  'Blocked on dependency update',
];

export function GoalNoteScreen({ goalTitle, onSave, onBack }: GoalNoteScreenProps) {
  const [selected, setSelected] = useState(0);

  return (
    <Box flexDirection="column" padding={1}>
      <Text bold color="cyan">Add Note</Text>
      <Box marginTop={1}><Text color="gray">Goal: {goalTitle}</Text></Box>
      <Box marginTop={1} flexDirection="column">
        {PRESETS.map((p, i) => (
          <Box key={p}>
            <Text color={i === selected ? 'cyan' : 'gray'}>
              {i === selected ? '\u203A ' : '  '}
            </Text>
            <Text color={i === selected ? 'white' : undefined}>{p}</Text>
          </Box>
        ))}
      </Box>
      <Box marginTop={1}>
        <Text color="gray">\u2191\u2193 select  Enter save  Esc back</Text>
      </Box>
    </Box>
  );
}