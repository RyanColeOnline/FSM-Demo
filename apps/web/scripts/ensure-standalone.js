const fs = require('fs');
const path = require('path');

const webDir = path.resolve(__dirname, '..');
const standaloneDir = path.join(webDir, '.next', 'standalone');
const nestedWebDir = path.join(standaloneDir, 'apps', 'web');

console.log('[ensure-standalone] Verifying standalone directory structure...');

if (!fs.existsSync(standaloneDir)) {
  fs.mkdirSync(standaloneDir, { recursive: true });
}

// 1. If Next.js placed standalone output in .next/standalone/apps/web, copy items up
if (fs.existsSync(nestedWebDir)) {
  console.log('[ensure-standalone] Found nested standalone at apps/web, copying entries...');
  const items = fs.readdirSync(nestedWebDir);
  for (const item of items) {
    const srcPath = path.join(nestedWebDir, item);
    const destPath = path.join(standaloneDir, item);
    if (!fs.existsSync(destPath)) {
      try {
        fs.cpSync(srcPath, destPath, { recursive: true });
        console.log(`[ensure-standalone] Copied ${item} to standalone root`);
      } catch (e) {
        console.warn(`[ensure-standalone] Failed to copy ${item}:`, e.message);
      }
    }
  }
}

// 2. Ensure .next/routes-manifest.json exists in standalone/.next
const destRoutesManifest = path.join(standaloneDir, '.next', 'routes-manifest.json');
if (!fs.existsSync(destRoutesManifest)) {
  const possibleSources = [
    path.join(nestedWebDir, '.next', 'routes-manifest.json'),
    path.join(webDir, '.next', 'routes-manifest.json'),
  ];
  for (const src of possibleSources) {
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(destRoutesManifest), { recursive: true });
      fs.copyFileSync(src, destRoutesManifest);
      console.log(`[ensure-standalone] Copied routes-manifest.json from ${src}`);
      break;
    }
  }
}

// 3. Ensure .next/server/middleware-manifest.json exists in standalone/.next/server
const destMiddlewareManifest = path.join(standaloneDir, '.next', 'server', 'middleware-manifest.json');
if (!fs.existsSync(destMiddlewareManifest)) {
  const possibleSources = [
    path.join(nestedWebDir, '.next', 'server', 'middleware-manifest.json'),
    path.join(webDir, '.next', 'server', 'middleware-manifest.json'),
  ];
  for (const src of possibleSources) {
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(destMiddlewareManifest), { recursive: true });
      fs.copyFileSync(src, destMiddlewareManifest);
      console.log(`[ensure-standalone] Copied middleware-manifest.json from ${src}`);
      break;
    }
  }
}

// 4. Ensure server.js exists in standalone root
const destServerJs = path.join(standaloneDir, 'server.js');
if (!fs.existsSync(destServerJs)) {
  const possibleSources = [
    path.join(nestedWebDir, 'server.js'),
    path.join(standaloneDir, 'apps', 'web', 'server.js'),
  ];
  for (const src of possibleSources) {
    if (fs.existsSync(src)) {
      fs.copyFileSync(src, destServerJs);
      console.log(`[ensure-standalone] Copied server.js from ${src}`);
      break;
    }
  }
}

console.log('[ensure-standalone] Standalone verification complete.');
