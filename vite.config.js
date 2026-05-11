import { defineConfig } from 'vite';

export default defineConfig({
  base: '/pollenhaters/',
  test: {
    environment: 'node',
    include: ['tests/**/*.test.js', 'src/**/*.test.js'],
  },
});
