# Contributing to Software MRI

## Development Setup

1. Clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```

3. Build all packages:
   ```bash
   pnpm build
   ```

## Project Structure

```
packages/
  core/       - Shared types and utilities
  config/     - Configuration loading and validation
  scanner/    - Filesystem scanning and project detection
  checks/     - Analysis checks (deps, TS, security, etc.)
  scoring/    - Scoring engine
  reporter/   - Report generation (JSON, MD, HTML)
  ui/         - Ink-based terminal UI components
  cli/        - CLI entry point and commands
```

## Commands

- `pnpm build` - Build all packages
- `pnpm test` - Run tests across all packages
- `pnpm lint` - Run linting
- `pnpm typecheck` - TypeScript type checking

## Adding a New Check

1. Create a new check file in `packages/checks/src/checks/`
2. Export it from `packages/checks/src/checks/index.ts`
3. Register it in `packages/checks/src/index.ts`

Each check must implement the `CheckRegistration` interface:

```typescript
{
  id: string;
  name: string;
  category: CategoryId;
  description: string;
  enabled: boolean;
  run: (context: CheckContext) => Promise<Issue[]>;
}
```

## Guidelines

- No AI or external API dependencies
- All analysis must be deterministic and rule-based
- Never write to files during a scan (read-only by default)
- Always mask secrets in output
- Add tests for new checks
- Follow the existing code style