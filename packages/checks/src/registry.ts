import type { CheckRegistration, CheckContext, CheckFn } from './types.js';
import type { Issue, CategoryId } from '@mri/core';

export class CheckRegistry {
  private checks: Map<string, CheckRegistration> = new Map();

  register(check: CheckRegistration): void {
    this.checks.set(check.id, check);
  }

  registerMany(checks: CheckRegistration[]): void {
    for (const check of checks) {
      this.register(check);
    }
  }

  get(id: string): CheckRegistration | undefined {
    return this.checks.get(id);
  }

  getByCategory(category: CategoryId): CheckRegistration[] {
    return Array.from(this.checks.values()).filter(c => c.category === category);
  }

  getAll(): CheckRegistration[] {
    return Array.from(this.checks.values());
  }

  getEnabled(enabledChecks: string[]): CheckRegistration[] {
    if (enabledChecks.length === 0) return this.getAll();
    return this.getAll().filter(c => enabledChecks.includes(c.id));
  }

  async runAll(context: CheckContext, onProgress?: (check: CheckRegistration) => void): Promise<Issue[]> {
    const allIssues: Issue[] = [];
    for (const check of this.getAll()) {
      onProgress?.(check);
      try {
        const issues = await check.run(context);
        allIssues.push(...issues);
      } catch (error) {
        allIssues.push({
          id: `MRI-CHECK-FAIL-${check.id}`,
          title: `Check "${check.name}" failed to run`,
          description: error instanceof Error ? error.message : 'Unknown error',
          severity: 'info',
          category: check.category,
          confidence: 'low',
          files: [],
          scoreImpact: 0,
          canAutoFix: false,
          status: 'open',
          tips: ['Report this issue to the Software MRI maintainers'],
        });
      }
    }
    return allIssues;
  }
}

export const registry = new CheckRegistry();