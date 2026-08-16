import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    // These spawn the built binary rather than importing modules, so they cost
    // a real repo analysis each. Well above vitest's 5s default.
    testTimeout: 60_000,
  },
});
