import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export function baseViteConfig() {
  return defineConfig({
    plugins: [tsconfigPaths()],
    build: { target: 'es2022', sourcemap: true },
    resolve: { alias: { '@': '/src' } },
  });
}
