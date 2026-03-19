import * as esbuild from 'esbuild';
import { copyFileSync, mkdirSync } from 'fs';

const watch = process.argv.includes('--watch');

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'public/bundle.js',
  target: 'es2020',
  platform: 'browser',
  sourcemap: true,
});

if (watch) {
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: 'public' });
  console.log(`Dev server → http://localhost:${port}`);
} else {
  mkdirSync('public', { recursive: true });
  await ctx.rebuild();
  await ctx.dispose();
  copyFileSync('index.html', 'public/index.html');
  copyFileSync('example.html', 'public/example.html');
  console.log('Build complete → public/');
}
