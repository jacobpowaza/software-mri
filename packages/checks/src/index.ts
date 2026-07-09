import { CheckRegistry } from './registry.js';
import { architectureChecks } from './checks/architecture.js';
import { comprehensiveChecks } from './checks/comprehensive.js';
import { dependencyChecks } from './checks/dependencies.js';
import { typescriptChecks } from './checks/typescript.js';
import { testChecks } from './checks/test.js';
import { securityChecks } from './checks/security.js';
import { performanceChecks } from './checks/performance.js';
import { envChecks } from './checks/env.js';
import { maintainabilityChecks } from './checks/maintainability.js';
import { duplicateChecks } from './checks/duplicates.js';

export function createCheckRegistry(): CheckRegistry {
  const registry = new CheckRegistry();

  registry.registerMany(architectureChecks);
  registry.registerMany(dependencyChecks);
  registry.registerMany(typescriptChecks);
  registry.registerMany(testChecks);
  registry.registerMany(securityChecks);
  registry.registerMany(performanceChecks);
  registry.registerMany(envChecks);
  registry.registerMany(maintainabilityChecks);
  registry.registerMany(duplicateChecks);
  registry.registerMany(comprehensiveChecks);

  return registry;
}

export { CheckRegistry } from './registry.js';
export type { CheckRegistration, CheckContext, CheckFn } from './types.js';