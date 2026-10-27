import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    setupFiles: ['tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json', 'json-summary'],
      include: ['src/**/*.ts'],
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 100,
        'src/order.ts': {
          branches: 90,
        },
        'src/insurance.ts': {
          branches: 90,
        },
      },
    },
  },
});
