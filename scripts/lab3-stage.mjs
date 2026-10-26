import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const [module, cycle, phase, reason, message] = process.argv.slice(2);
if (
  !['parking', 'insurance'].includes(module) ||
  !/^\d{2}$/.test(cycle) ||
  !['red', 'green', 'refactor'].includes(phase)
) {
  throw new Error(
    'Usage: lab3-stage.mjs module NN phase expected-output-regex message',
  );
}
const dir = `report/lab3/evidence/${module}-${cycle}`;
mkdirSync(dir, { recursive: true });
const args =
  phase === 'red' ? ['test', '--', `tests/${module}.test.ts`] : ['test'];
const started = new Date().toISOString();
const run = spawnSync('npm', args, {
  encoding: 'utf8',
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
});
// Preserve each stream exactly; the displayed log is stdout followed by stderr.
writeFileSync(`${dir}/${phase}.stdout.txt`, run.stdout);
writeFileSync(`${dir}/${phase}.stderr.txt`, run.stderr);
const output = run.stdout + run.stderr;
process.stdout.write(output);
if (
  (phase === 'red' ? run.status === 0 : run.status !== 0) ||
  !new RegExp(reason).test(output)
) {
  throw new Error(
    `Unexpected ${phase} result: ${run.status}; no commit created`,
  );
}
const source = `src/${module}.ts`;
if (existsSync(source))
  writeFileSync(`${dir}/${phase}.source.txt`, readFileSync(source));
writeFileSync(
  `${dir}/${phase}.test.txt`,
  readFileSync(`tests/${module}.test.ts`),
);
const git = (...argv) => {
  const result = spawnSync('git', argv, { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr);
  return result.stdout.trim();
};
const record = {
  module,
  cycle,
  phase,
  command: `npm ${args.join(' ')}`,
  started,
  finished: new Date().toISOString(),
  exitCode: run.status,
  reason,
  parent: git('rev-parse', 'HEAD'),
  stdout: path.basename(`${phase}.stdout.txt`),
  stderr: path.basename(`${phase}.stderr.txt`),
};
writeFileSync(`${dir}/${phase}.json`, JSON.stringify(record, null, 2) + '\n');
const files = [`tests/${module}.test.ts`, dir];
if (existsSync(source)) files.push(source);
git('add', '--', ...files);
process.stdout.write(
  git('commit', '-m', `${phase}: ${module} ${cycle} ${message}`) + '\n',
);
