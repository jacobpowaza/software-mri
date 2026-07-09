import { useState, useEffect } from 'react';

export interface TerminalSize {
  columns: number;
  rows: number;
  isCompact: boolean;
  isWide: boolean;
}

export function useTerminalSize(): TerminalSize {
  const [size, setSize] = useState<TerminalSize>(() => {
    const columns = process.stdout.columns || 80;
    const rows = process.stdout.rows || 24;
    return {
      columns,
      rows,
      isCompact: columns < 80,
      isWide: columns >= 120,
    };
  });

  useEffect(() => {
    function onResize() {
      const columns = process.stdout.columns || 80;
      const rows = process.stdout.rows || 24;
      setSize({
        columns,
        rows,
        isCompact: columns < 80,
        isWide: columns >= 120,
      });
    }

    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
    };
  }, []);

  return size;
}