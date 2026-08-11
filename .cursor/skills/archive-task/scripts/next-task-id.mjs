import { readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const area = process.argv[2];
const major = process.argv[3] ?? '1';

if (!area || !['frontend', 'backend'].includes(area)) {
	console.error('Usage: node next-task-id.mjs <frontend|backend> [major]');
	process.exit(1);
}

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', '..');
const areaDir = join(repoRoot, 'docs', 'tasks', area);

let maxMinor = 0;

if (existsSync(areaDir)) {
	for (const name of readdirSync(areaDir, { withFileTypes: true })) {
		if (!name.isDirectory()) continue;
		const match = name.name.match(/^(\d+)\.(\d+)-/);
		if (match && match[1] === major) {
			maxMinor = Math.max(maxMinor, Number.parseInt(match[2], 10));
		}
	}
}

const nextMinor = maxMinor + 1;
const id = `${major}.${String(nextMinor).padStart(2, '0')}`;
console.log(id);
