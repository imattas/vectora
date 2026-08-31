import { defineConfig } from 'vitest/config';

// Tests live beside the reusable core implementation.
export default defineConfig({
  test: {
    include: ['src/**/*.test.ts'],
  },
});
