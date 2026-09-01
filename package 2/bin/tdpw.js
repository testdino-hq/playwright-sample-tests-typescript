#!/usr/bin/env node

/**
 * TestDino Playwright CLI Entry Point
 * Imports and runs the CLI from the built dist directory
 */

// Import CLI from built ESM (.mjs) for proper module resolution (e.g., chalk dependency)
import('../dist/cli/index.mjs').catch((error) => {
  console.error('Failed to load CLI:', error.message);
  process.exit(1);
});
