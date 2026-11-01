import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

async function buildExtensionScripts() {
  console.log('⚡ Building background and content scripts with esbuild...');
  try {
    // 1. Build background service worker (ES module format)
    await esbuild.build({
      entryPoints: [path.resolve(rootDir, 'src/background/index.ts')],
      outfile: path.resolve(rootDir, 'dist/background.js'),
      bundle: true,
      format: 'esm',
      platform: 'browser',
      target: ['chrome100'],
      sourcemap: false,
      minify: false,
    });
    console.log('✔ background.js built successfully.');

    // 2. Build content script (IIFE format so it doesn't pollute or require modules)
    await esbuild.build({
      entryPoints: [path.resolve(rootDir, 'src/content/index.ts')],
      outfile: path.resolve(rootDir, 'dist/content.js'),
      bundle: true,
      format: 'iife',
      platform: 'browser',
      target: ['chrome100'],
      sourcemap: false,
      minify: false,
    });
    console.log('✔ content.js built successfully.');

    // 3. Ensure dist/manifest.json exists
    const publicManifest = path.resolve(rootDir, 'public/manifest.json');
    const distManifest = path.resolve(rootDir, 'dist/manifest.json');
    if (!fs.existsSync(distManifest) && fs.existsSync(publicManifest)) {
      fs.copyFileSync(publicManifest, distManifest);
      console.log('✔ Copied manifest.json to dist/');
    }

    // 4. Ensure root icons exist
    const publicIcons = path.resolve(rootDir, 'public/icons');
    const rootIcons = path.resolve(rootDir, 'icons');
    if (fs.existsSync(publicIcons) && !fs.existsSync(rootIcons)) {
      fs.cpSync(publicIcons, rootIcons, { recursive: true });
    }

    console.log('🎉 All extension scripts built successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildExtensionScripts();
