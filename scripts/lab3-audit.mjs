import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const git = (...args) => {
  const r = spawnSync('git', args, { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  return r.stdout;
};
const commits = git('log', '--reverse', '--format=%H %s', '3219dc2..HEAD')
  .trim()
  .split('\n');
const tdd = commits.filter((s) => /^[a-f0-9]+ (red|green|refactor):/.test(s));
assert.equal(tdd.length, 48);
const cycles = [];
for (const module of ['parking', 'insurance']) {
  for (let i = 1; i <= 8; i++) {
    const cycle = String(i).padStart(2, '0');
    const stages = [];
    for (const phase of ['red', 'green', 'refactor']) {
      const matches = tdd.filter((s) =>
        s.includes(` ${phase}: ${module} ${cycle} `),
      );
      assert.equal(matches.length, 1);
      const hash = matches[0].split(' ')[0];
      const prefix = `report/lab3/evidence/${module}-${cycle}/${phase}`;
      const record = JSON.parse(readFileSync(`${prefix}.json`, 'utf8'));
      assert.equal(record.exitCode, phase === 'red' ? 1 : 0);
      assert.equal(git('rev-parse', `${hash}^`).trim(), record.parent);
      assert.equal(
        readFileSync(`${prefix}.test.txt`, 'utf8'),
        git('show', `${hash}:tests/${module}.test.ts`),
      );
      if (phase === 'red') {
        const changed = git(
          'diff-tree',
          '--no-commit-id',
          '--name-only',
          '-r',
          hash,
        )
          .trim()
          .split('\n');
        assert(
          !changed.includes(`src/${module}.ts`),
          `${hash} changes production in Red`,
        );
      } else {
        assert.equal(
          readFileSync(`${prefix}.source.txt`, 'utf8'),
          git('show', `${hash}:src/${module}.ts`),
        );
        if (phase === 'green') {
          assert.equal(
            git('show', `${hash}:tests/${module}.test.ts`),
            git('show', `${hash}^:tests/${module}.test.ts`),
          );
        }
      }
      stages.push({
        phase,
        hash,
        exitCode: record.exitCode,
        tests: (readFileSync(`${prefix}.stdout.txt`, 'utf8').match(
          /Tests\s+([^\n]+)/,
        ) ?? [])[1],
      });
    }
    assert(
      commits.findIndex((s) => s.startsWith(stages[0].hash)) <
        commits.findIndex((s) => s.startsWith(stages[1].hash)),
    );
    assert(
      commits.findIndex((s) => s.startsWith(stages[1].hash)) <
        commits.findIndex((s) => s.startsWith(stages[2].hash)),
    );
    cycles.push({ module, cycle, stages });
  }
}
assert.equal(
  git(
    'diff',
    '3219dc2',
    '--',
    'src/order.ts',
    'src/average.ts',
    'src/temperature.ts',
    'tests/order.test.ts',
    'tests/order-example.test.ts',
    'tests/average.test.ts',
    'tests/temperature.test.ts',
  ),
  '',
);
const coverage = JSON.parse(
  readFileSync('coverage/coverage-summary.json', 'utf8'),
);
const modules = Object.fromEntries(
  ['parking', 'insurance'].map((module) => {
    const code = readFileSync(`src/${module}.ts`, 'utf8').trimEnd().split('\n');
    const summary = Object.entries(coverage).find(([p]) =>
      p.endsWith(`/src/${module}.ts`),
    )[1];
    return [
      module,
      {
        physicalLines: code.length,
        nonblankLines: code.filter((s) => s.trim()).length,
        coverage: summary,
      },
    ];
  }),
);
const result = {
  baseline: '3219dc2',
  branch: git('branch', '--show-current').trim(),
  tddCommits: tdd.length,
  red: 16,
  green: 16,
  refactor: 16,
  cycles,
  modules,
  totalCoverage: coverage.total,
  previousLabsUnchanged: true,
};
writeFileSync(
  'report/lab3/evidence/history-audit.json',
  JSON.stringify(result, null, 2) + '\n',
);
process.stdout.write(
  `Audit passed: 16 chronological Red–Green–Refactor cycles, 48 stage commits, no production changes in Red, unchanged tests in Green, all 32 Green/Refactor runs passed. Labs 1/2 unchanged.\n${JSON.stringify(modules, null, 2)}\n`,
);
