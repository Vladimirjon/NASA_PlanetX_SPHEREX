import { cpSync, createReadStream, existsSync, statSync } from 'node:fs';
import { dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { defineConfig, type Plugin } from 'vite';

const root = dirname(fileURLToPath(import.meta.url));
const copernixRoot = resolve(root, 'copernix');
const demoSrc = resolve(root, 'public/demo');
const outDir = resolve(root, 'dist-copernix');

const MIME: Record<string, string> = {
  '.json': 'application/json',
  '.f32': 'application/octet-stream',
  '.bin': 'application/octet-stream',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

function sendDemoFile(req: IncomingMessage, res: ServerResponse, next: () => void): void {
  const url = req.url ?? '';
  if (!url.startsWith('/demo')) {
    next();
    return;
  }
  const pathOnly = url.split('?')[0] ?? url;
  const rel = pathOnly.replace(/^\/demo\/?/, '');
  const filePath = resolve(demoSrc, rel || 'manifest.json');
  if (!filePath.startsWith(demoSrc) || !existsSync(filePath) || !statSync(filePath).isFile()) {
    res.statusCode = 404;
    res.end('Not found');
    return;
  }
  res.setHeader('Content-Type', MIME[extname(filePath)] ?? 'application/octet-stream');
  res.setHeader('Cache-Control', 'no-store');
  createReadStream(filePath).pipe(res);
}

function demoAssetsPlugin(): Plugin {
  return {
    name: 'copernix-demo-assets',
    configureServer(server) {
      server.middlewares.use(sendDemoFile);
    },
    closeBundle() {
      if (existsSync(demoSrc)) {
        cpSync(demoSrc, join(outDir, 'demo'), { recursive: true });
      }
    },
  };
}

export default defineConfig({
  root: copernixRoot,
  base: '/viewer/',
  publicDir: resolve(copernixRoot, 'public'),
  build: {
    outDir,
    emptyOutDir: true,
  },
  server: {
    fs: {
      allow: [root, resolve(root, '..')],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_API_PROXY ?? 'http://127.0.0.1:8000',
        changeOrigin: true,
      },
    },
  },
  plugins: [demoAssetsPlugin()],
});
