import assert from 'node:assert/strict';
import console from 'node:console';
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync('coverage/coverage-final.json', 'utf8'));
const file = Object.values(report).find((entry) =>
  entry.path.endsWith('/src/insurance.ts'),
);
assert(file, 'Insurance coverage is missing; run npm run coverage.');
const hits = Object.values(file.b).flat();
assert(hits.length > 0, 'Insurance branch counters are missing.');
const covered = hits.filter((hit) => hit > 0).length;
const percent = (covered / hits.length) * 100;
console.log(
  JSON.stringify(
    {
      module: 'src/insurance.ts',
      covered,
      total: hits.length,
      percent,
      threshold: 90,
    },
    null,
    2,
  ),
);
assert(percent >= 90, `Insurance branch coverage ${percent}% is below 90%.`);
