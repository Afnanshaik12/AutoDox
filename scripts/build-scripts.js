import esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildScripts() {
  console.log('Building background and content scripts with esbuild...');

  try {
    // 1. Build Background Service Worker
    await esbuild.build({
      entryPoints: [path.resolve(__dirname, '../src/background/index.js')],
      outfile: path.resolve(__dirname, '../dist/background.js'),
      bundle: true,
      minify: false,
      sourcemap: false,
      target: ['chrome110'],
      format: 'iife',
    });
    console.log('✓ Successfully bundled dist/background.js');

    // 2. Build Content Script (IIFE for complete browser sandbox isolation)
    await esbuild.build({
      entryPoints: [path.resolve(__dirname, '../src/content/index.js')],
      outfile: path.resolve(__dirname, '../dist/content.js'),
      bundle: true,
      minify: false,
      sourcemap: false,
      target: ['chrome110'],
      format: 'iife',
    });
    console.log('✓ Successfully bundled dist/content.js');
  } catch (error) {
    console.error('Build scripts error:', error);
    process.exit(1);
  }
}

buildScripts();
