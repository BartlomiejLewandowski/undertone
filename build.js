import * as esbuild from 'esbuild';

const watch = process.argv.includes('--watch');

const ctx = await esbuild.context({
  entryPoints: ['src/main.ts'],
  bundle: true,
  outfile: 'dist/bundle.js',
  target: 'es2020',
  platform: 'browser',
  sourcemap: true,
});

if (watch) {
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: '.' });
  console.log(`Dev server → http://localhost:${port}`);
} else {
  await ctx.rebuild();
  await ctx.dispose();
  console.log('Build complete → dist/bundle.js');
}
