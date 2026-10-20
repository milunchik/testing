import assert from 'node:assert/strict';
import console from 'node:console';
import { readFileSync } from 'node:fs';

const report = JSON.parse(readFileSync('coverage/coverage-final.json', 'utf8'));
const file = Object.values(report).find((entry) =>
  entry.path.endsWith('/src/order.ts'),
);
assert(file, 'Coverage for src/order.ts is missing. Run npm run coverage.');
const target = Object.values(file.fnMap).find(
  (entry) => entry.name === 'calcInstallment',
);
assert(target, 'Coverage for calcInstallment is missing.');
const start = target.loc.start.line;
const end = target.loc.end.line;
const branches = Object.entries(file.branchMap)
  .filter(
    ([, entry]) => entry.loc.start.line >= start && entry.loc.end.line <= end,
  )
  .flatMap(([id]) => file.b[id]);
assert(branches.length > 0, 'No branch counters found in calcInstallment.');
const covered = branches.filter((hits) => hits > 0).length;
const percent = (covered / branches.length) * 100;
console.log(
  JSON.stringify(
    {
      function: 'calcInstallment',
      start,
      end,
      covered,
      total: branches.length,
      percent,
    },
    null,
    2,
  ),
);
assert(
  percent >= 90,
  `calcInstallment branch coverage ${percent}% is below 90%.`,
);
