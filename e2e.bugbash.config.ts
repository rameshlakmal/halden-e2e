// The bug-bash config: the project's config, pointed at one shop the bug-bash script starts and prepares,
// so parallel explorers share it instead of each starting (and reseeding) their own.
import { web } from '@e2e-dev/web';
import type { E2EConfig } from 'e2e';
import base from './e2e.config.ts';
import { baseUrl } from './utils/env.ts';

const shared: E2EConfig = base;

export default {
  ...shared,
  // The setup tests that save the explorers' sessions, plus the repro tests that prove each finding.
  tests: ['tests/auth.setup.e2e.ts', 'tests/bugbash/**/*.e2e.ts'],
  targets: [{ name: 'chromium', engine: web(), app: { url: baseUrl } }],
  retries: 0,
  reporters: ['list', 'markdown'],
} satisfies E2EConfig;
