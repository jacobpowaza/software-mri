import React, { useState, useMemo } from 'react';
import { Text, Box, useInput } from 'ink';
import type { ScanResult, CategoryScore, Issue } from '@mri/core';
import { useTerminalSize } from '../hooks/use-terminal-size.js';
import { execSync } from 'node:child_process';

interface DashboardProps {
  result: ScanResult;
  onSelectIssue: (issue: Issue) => void;
  onCategoryChange: (category: string | null) => void;
  onRescan: () => void;
  onExport: () => void;
  onHelp: () => void;
  onQuit: () => void;
  onTasks?: () => void;
}

export function getPageStart(selectedIndex: number, total: number, pageSize = 8): number {
  if (total <= pageSize) return 0;
  const pageFloor = Math.floor(selectedIndex / pageSize) * pageSize;
  const maxStart = Math.max(0, total - pageSize);
  return Math.min(pageFloor, maxStart);
}

export function Dashboard({
  result,
  onSelectIssue,
  onCategoryChange,
  onRescan,
  onExport,
  onHelp,
  onQuit,
  onTasks,
}: DashboardProps) {
  const { columns, isCompact, isWide } = useTerminalSize();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategoryIdx, setSelectedCategoryIdx] = useState(-1);
  const [notification, setNotification] = useState<string | null>(null);
  const allIssues = useMemo(() => {
    const raw = result.categories.flatMap(c => c.issues).filter(i => i.status !== 'dismissed');

    const seen = new Set<string>();
    const result_: Issue[] = [];

    for (const issue of raw) {
      if (seen.has(issue.id)) continue;
      seen.add(issue.id);
      result_.push(issue);
    }

    const rank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
    return result_.sort((a: Issue, b: Issue) => {
      const sev = (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0);
      if (sev !== 0) return sev;
      return a.files.length - b.files.length;
    });
  }, [result]);

  useInput((input, key) => {
    if (key.upArrow) {
      if (selectedCategoryIdx >= 0) {
        setSelectedCategoryIdx(-1);
        setSelectedIndex(0);
      } else if (selectedIndex > 0) {
        setSelectedIndex(selectedIndex - 1);
      }
    }
    if (key.downArrow) {
      if (selectedIndex < allIssues.length - 1) {
        if (selectedCategoryIdx >= 0) {
          setSelectedCategoryIdx(-1);
          setSelectedIndex(0);
        } else {
          setSelectedIndex(selectedIndex + 1);
        }
      }
    }
    if (key.leftArrow) {
      onCategoryChange(null);
      setSelectedCategoryIdx(-1);
    }
    if (key.rightArrow) {
      if (selectedCategoryIdx + 1 < result.categories.length) {
        const next = selectedCategoryIdx + 1;
        setSelectedCategoryIdx(next);
        onCategoryChange(result.categories[next]?.category || null);
      }
    }
    if (key.return) {
      const issue = allIssues[selectedIndex];
      if (issue) onSelectIssue(issue);
    }
    if (input === 'r') { showNotification('Rescanning...'); onRescan(); }
    if (input === 'e') { showNotification('Exporting...'); onExport(); }
    if (input === '?') onHelp();
    if (input === 'q') onQuit();
    if (input === 'g' && onTasks) onTasks();
    if (input === 'c') {
      const text = formatIssuesForClipboard(allIssues, result);
      try {
        execSync(process.platform === 'darwin' ? 'pbcopy' : 'clip', { input: text });
        showNotification('Copied all issues to clipboard');
      } catch {
        showNotification('Clipboard not available on this system');
      }
    }
  });

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  return (
    <Box flexDirection="column">
      {notification && (
        <Box justifyContent="center" marginBottom={0}>
          <Text color="green">{notification}</Text>
        </Box>
      )}
      <ScoreHeader result={result} columns={columns} />
      <CategoryScore categories={result.categories} isCompact={isCompact} isWide={isWide} />
      <IssueList
        issues={allIssues}
        selectedIndex={selectedIndex}
        isCompact={isCompact}
      />
      <CommandBar />
    </Box>
  );
}

function ScoreHeader({ result, columns }: { result: ScanResult; columns: number }) {
  const barWidth = Math.min(columns - 12, 40);
  const filled = Math.round((result.totalScore / 100) * barWidth);
  const empty = barWidth - filled;
  const scoreColor = result.totalScore >= 80 ? 'green' : result.totalScore >= 50 ? 'yellow' : 'red';

  return (
    <Box flexDirection="column" marginBottom={0}>
      <Box justifyContent="space-between">
        <Text bold>Production Readiness</Text>
        <Text bold color={scoreColor}>{result.totalScore}%</Text>
      </Box>
      <Box>
        <Text color={scoreColor}>{'█'.repeat(filled)}</Text>
        <Text color="gray">{'░'.repeat(empty)}</Text>
      </Box>
      <Box justifyContent="space-between">
        <Text color="gray">{result.project.frameworks.join(', ')}</Text>
        <Text color="gray">{result.totalIssues} issues</Text>
      </Box>
    </Box>
  );
}

function CategoryScore({ categories, isCompact, isWide }: {
  categories: CategoryScore[];
  isCompact: boolean;
  isWide: boolean;
}) {
  const maxCategories = isCompact ? 5 : categories.length;
  const displayCategories = categories.slice(0, maxCategories);

  return (
    <Box flexDirection="column" marginTop={0} marginBottom={0}>
      {displayCategories.map(cat => {
        const color = cat.status === 'pass' ? 'green' : cat.status === 'warn' ? 'yellow' : 'red';
        return (
          <Box key={cat.category} justifyContent="space-between">
            <Text>{getCategoryLabel(cat.category)}</Text>
            <Text color={color}>
              {Math.round(cat.score)}% <Text color="gray">{cat.status}</Text>
            </Text>
          </Box>
        );
      })}
    </Box>
  );
}

function IssueList({ issues, selectedIndex, isCompact }: {
  issues: Issue[];
  selectedIndex: number;
  isCompact: boolean;
}) {
  const PAGE_SIZE = 8;

  if (issues.length === 0) {
    return (
      <Box marginTop={1}>
        <Text color="green">No issues found! Great job!</Text>
      </Box>
    );
  }

  // Compute the page-aligned viewport start.
  // selectedIndex 0-7 -> pageStart 0, selectedIndex 8-15 -> pageStart 8, etc.
  const pageStart = Math.min(
    Math.floor(selectedIndex / PAGE_SIZE) * PAGE_SIZE,
    Math.max(0, issues.length - PAGE_SIZE),
  );
  const visible = issues.slice(pageStart, pageStart + PAGE_SIZE);
  const itemsAbove = pageStart;
  const itemsBelow = Math.max(0, issues.length - (pageStart + PAGE_SIZE));

  return (
    <Box flexDirection="column">
      <Text bold color="gray">{issues.length} issues found</Text>
      {itemsAbove > 0 && (
        <Text color="gray">  ... {itemsAbove} more above</Text>
      )}
      <Box flexDirection="column" minHeight={PAGE_SIZE}>
        {visible.map((issue: Issue, index: number) => {
        const actualIdx = pageStart + index;
        const isSel = actualIdx === selectedIndex;
        const severityColor = issue.severity === 'critical' ? 'red' :
          issue.severity === 'high' ? 'red' :
          issue.severity === 'medium' ? 'yellow' : 'green';
        const file = issue.files[0];
        const location = file ? file.split('/').pop() : '';
        return (
          <Box key={issue.id}>
            <Text color={isSel ? 'cyan' : 'gray'}>
              {isSel ? '\u203A ' : '  '}
            </Text>
            <Box flexDirection="column">
              <Text color={isSel ? 'white' : undefined}>
                <Text color={severityColor}>{severityLabel(issue.severity)}</Text>
                {' '}{issue.title}
              </Text>
              {location && (
                <Text color="gray" wrap="truncate">
                  {'    '}{location}
                </Text>
              )}
            </Box>
          </Box>
        );
      })}
      </Box>
      {itemsBelow > 0 && (
        <Text color="gray">  ... {itemsBelow} more below</Text>
      )}
      <Text color="gray">
        {selectedIndex + 1}/{issues.length}
      </Text>
    </Box>
  );
}

function CommandBar() {
  return (
    <Box borderStyle="single" borderColor="gray" marginTop={0} justifyContent="center">
      <Box gap={1}>
        <Text color="gray">{'\u2191\u2193 select'}</Text>
        <Text color="gray">Enter open</Text>
        <Text color="gray">/ search</Text>
        <Text color="gray">g tasks</Text>
        <Text color="gray">c copy</Text>
        <Text color="gray">e export</Text>
        <Text color="gray">r rescan</Text>
        <Text color="gray">? help</Text>
        <Text color="gray">q quit</Text>
      </Box>
    </Box>
  );
}

function severityLabel(s: string): string {
  const labels: Record<string, string> = {
    critical: 'CRIT', high: 'HIGH', medium: 'MED', low: 'LOW', info: 'INFO',
  };
  return labels[s] || s;
}

function getCategoryLabel(id: string): string {
  const labels: Record<string, string> = {
    architecture: 'Architecture',
    dependencies: 'Dependencies',
    deadCode: 'Dead Code',
    duplicates: 'Duplicates',
    typeSafety: 'Type Safety',
    testCoverage: 'Tests',
    configHealth: 'Config',
    securityHygiene: 'Security',
    performanceRisk: 'Performance',
    maintainability: 'Maintainability',
  };
  return labels[id] || id;
}

function formatIssuesForClipboard(issues: Issue[], result: ScanResult): string {
  const lines: string[] = [];
  lines.push(`# MRI Scan Report — ${result.project.name}`);
  lines.push(`Score: ${result.totalScore}% — ${result.totalIssues} issues found`);
  lines.push(`Scanned ${result.scannedFiles} files in ${result.scanDurationMs}ms`);
  lines.push(`Frameworks: ${result.project.frameworks.join(', ')}`);
  lines.push('');

  const rank = { critical: 4, high: 3, medium: 2, low: 1, info: 0 };
  const sorted = [...issues].sort((a, b) => (rank[b.severity] ?? 0) - (rank[a.severity] ?? 0));

  for (const issue of sorted) {
    lines.push(`## [${issue.severity.toUpperCase()}] ${issue.title}`);
    lines.push(`**Category:** ${getCategoryLabel(issue.category)}  `);
    lines.push(`**Score Impact:** -${issue.scoreImpact}%  `);
    lines.push(`**Confidence:** ${issue.confidence}  `);
    if (issue.files.length > 0) {
      lines.push(`**Files:** ${issue.files.slice(0, 8).join(', ')}${issue.files.length > 8 ? ` (+${issue.files.length - 8} more)` : ''}  `);
    }
    lines.push('');
    lines.push(issue.description);
    lines.push('');
    if (issue.tips.length > 0) {
      lines.push('**Recommendations:**');
      for (const tip of issue.tips) {
        lines.push(`- ${tip}`);
      }
      lines.push('');
    }
  }

  lines.push('---');
  lines.push('Generated by MRI — Production Readiness Scanner');
  return lines.join('\n');
}