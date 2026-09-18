#!/usr/bin/env node
/**
 * Padmanabh Ayurvedics — Vercel Config Validator
 * Run: node scripts/validate-vercel.js
 * 
 * Checks for the most common deployment-breaking mistakes in vercel.json
 */

const fs = require('fs');
const path = require('path');

const VERCEL_JSON = path.join(__dirname, '..', 'vercel.json');

let passed = 0;
let failed = 0;

function check(label, condition, fixHint) {
  if (condition) {
    console.log(`  ✅ ${label}`);
    passed++;
  } else {
    console.error(`  ❌ ${label}`);
    console.error(`     Fix: ${fixHint}`);
    failed++;
  }
}

console.log('\n🔍 Validating vercel.json...\n');

// 1. File exists
if (!fs.existsSync(VERCEL_JSON)) {
  console.error('❌ FATAL: vercel.json not found!');
  process.exit(1);
}

// 2. Valid JSON
let config;
try {
  config = JSON.parse(fs.readFileSync(VERCEL_JSON, 'utf8'));
  console.log('  ✅ Valid JSON syntax');
  passed++;
} catch (e) {
  console.error(`  ❌ Invalid JSON: ${e.message}`);
  process.exit(1);
}

const routes = config.routes || [];

// 3. Has filesystem handler
check(
  '"handle": "filesystem" is present (prevents CSS/JS from being swallowed by SPA route)',
  routes.some(r => r.handle === 'filesystem'),
  'Add { "handle": "filesystem" } BEFORE the catch-all { "src": "/(.*)", "dest": "/index.html" } route'
);

// 4. filesystem handle comes before catch-all
const fsIdx = routes.findIndex(r => r.handle === 'filesystem');
const spaIdx = routes.findIndex(r => r.src === '/(.*)'  && r.dest === '/index.html');
if (fsIdx !== -1 && spaIdx !== -1) {
  check(
    '"handle: filesystem" appears BEFORE the SPA catch-all route',
    fsIdx < spaIdx,
    'Move { "handle": "filesystem" } above the { "src": "/(.*)", "dest": "/index.html" } route'
  );
}

// 5. SPA catch-all exists
check(
  'SPA catch-all route exists',
  routes.some(r => r.src === '/(.*)'  && r.dest === '/index.html'),
  'Add { "src": "/(.*)", "dest": "/index.html" } as the LAST route'
);

// 6. API routes present
check(
  'API proxy route exists',
  routes.some(r => r.src && r.src.includes('/api/')),
  'Add { "src": "/api/(.*)", "dest": "/api/$1" } for serverless functions'
);

// 7. SPA catch-all is LAST
const lastRoute = routes[routes.length - 1];
check(
  'SPA catch-all is the last route',
  lastRoute && lastRoute.src === '/(.*)'  && lastRoute.dest === '/index.html',
  'Move the { "src": "/(.*)", "dest": "/index.html" } route to the very bottom'
);

console.log(`\n${ failed === 0 ? '🎉 All checks passed!' : `⚠️  ${failed} check(s) failed.` } (${passed} passed, ${failed} failed)\n`);

process.exit(failed > 0 ? 1 : 0);
