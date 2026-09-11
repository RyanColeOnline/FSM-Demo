const fs = require('fs');
const path = require('path');

const webDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(webDir, '.next', 'standalone');
const nestedWebDir = path.join(standaloneDir, 'apps', 'web');

console.log('[ensure-standalone] Verifying standalone directory structure...');

if (!fs.existsSync(standaloneDir)) {
  console.log('[ensure-standalone] No .next/standalone directory found, creating it.');
  fs.mkdirSync(standaloneDir, { recursive: true });
}

// 1. If Next.js nested the standalone build under apps/web, flatten it
if (fs.existsSync(nestedWebDir)) {
  console.log('[ensure-standalone] Flattening standalone structure from apps/web to standalone root...');
  fs.cpSync(nestedWebDir, standaloneDir, { recursive: true, force: true });
}

// 2. Ensure .next/routes-manifest.json exists in standalone/.next
const destRoutesManifest = path.join(standaloneDir, '.next', 'routes-manifest.json');
if (!fs.existsSync(destRoutesManifest)) {
  const srcRoutesManifest = path.join(webDir, '.next', 'routes-manifest.json');
  if (fs.existsSync(srcRoutesManifest)) {
    fs.mkdirSync(path.dirname(destRoutesManifest), { recursive: true });
    fs.copyFileSync(srcRoutesManifest, destRoutesManifest);
    console.log('[ensure-standalone] Copied routes-manifest.json to standalone/.next');
  }
}

// 3. Ensure .next/server/middleware-manifest.json exists in standalone/.next/server
const destMiddlewareManifest = path.join(standaloneDir, '.next', 'server', 'middleware-manifest.json');
if (!fs.existsSync(destMiddlewareManifest)) {
  const srcMiddlewareManifest = path.join(webDir, '.next', 'server', 'middleware-manifest.json');
  if (fs.existsSync(srcMiddlewareManifest)) {
    fs.mkdirSync(path.dirname(destMiddlewareManifest), { recursive: true });
    fs.copyFileSync(srcMiddlewareManifest, destMiddlewareManifest);
    console.log('[ensure-standalone] Copied middleware-manifest.json to standalone/.next/server');
  }
}

// 4. Ensure server.js exists in standalone root
const destServerJs = path.join(standaloneDir, 'server.js');
if (!fs.existsSync(destServerJs)) {
  const nestedServerJs = path.join(nestedWebDir, 'server.js');
  if (fs.existsSync(nestedServerJs)) {
    fs.copyFileSync(nestedServerJs, destServerJs);
    console.log('[ensure-standalone] Copied server.js from nested apps/web to standalone root');
  }
}

console.log('[ensure-standalone] Standalone verification complete.');
