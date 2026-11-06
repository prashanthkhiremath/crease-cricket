import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';

// ARTIFACT=1 inlines all JS and CSS into one HTML file for publishing as a claude.ai artifact.
export default defineConfig(() => ({
  base: './',
  plugins: process.env.ARTIFACT ? [viteSingleFile()] : [],
  build: { chunkSizeWarningLimit: 1500 },
}));
