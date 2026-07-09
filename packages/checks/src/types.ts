import type { Issue, CategoryId, MriConfig, ProjectInfo } from '@software-mri/core';
import type { ScanContext } from '@software-mri/scanner';

export type CheckFn = (context: CheckContext) => Promise<Issue[]>;

export interface CheckRegistration {
  id: string;
  name: string;
  category: CategoryId;
  description: string;
  run: CheckFn;
  enabled: boolean;
}

export interface CheckContext {
  scan: ScanContext;
  project: ProjectInfo;
  config: MriConfig;
}