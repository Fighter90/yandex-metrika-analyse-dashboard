#!/usr/bin/env node
// Propagate the root package.json version into the version markers embedded in docs.
// Zero-dependency (plain Node ESM). Two modes:
//   node scripts/sync-versions.mjs          → rewrite files in place
//   node scripts/sync-versions.mjs --check  → exit 1 if any file is out of sync (CI/hook)
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const { version } = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

// Each target rewrites only the version token inside one specific marker line,
// leaving CHANGELOG tables, release links and dates untouched.
const TARGETS = [
  { file: 'docs/architecture.md', marker: /(\*\*Текущая версия:\*\* v)\d+\.\d+\.\d+/ },
  { file: 'CLAUDE.md', marker: /(Текущий релиз — \*\*v)\d+\.\d+\.\d+/ },
  { file: 'README.md', marker: /(Статус: рабочий продукт v)\d+\.\d+\.\d+/ },
  { file: 'README.en.md', marker: /(Status: working product v)\d+\.\d+\.\d+/ },
];

const check = process.argv.includes('--check');
const stale = [];

for (const { file, marker } of TARGETS) {
  const path = join(root, file);
  const original = readFileSync(path, 'utf8');
  if (!marker.test(original)) {
    console.error(`sync-versions: marker not found in ${file}`);
    process.exitCode = 1;
    continue;
  }
  const updated = original.replace(marker, (_m, prefix) => `${prefix}${version}`);
  if (updated !== original) {
    stale.push(file);
    if (!check) writeFileSync(path, updated);
  }
}

if (check && stale.length > 0) {
  console.error(
    `sync-versions: out of date with package.json v${version}: ${stale.join(', ')}\n` +
      `Run "pnpm sync-versions" and commit the result.`,
  );
  process.exit(1);
}

if (!check && stale.length > 0) {
  console.log(`sync-versions: updated to v${version}: ${stale.join(', ')}`);
} else if (!check) {
  console.log(`sync-versions: all docs already at v${version}`);
}
