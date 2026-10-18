import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const evidence = 'output/lab2/evidence';
const testFile = 'tests/order-example.test.ts';
const original = readFileSync(testFile, 'utf8');
const temporaryTest = `
it('виклик без перевірки результату', () => {
  calcOrderTotal([item(100)], 'silver');
});
`;
mkdirSync(evidence, { recursive: true });

function measure(stage) {
  const result = spawnSync('npm', ['run', 'coverage'], { encoding: 'utf8' });
  const output = result.stdout + result.stderr;
  writeFileSync(`${evidence}/${stage}.txt`, output);
  process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Coverage failed at ${stage}.`);
  for (const [source, suffix] of [
    ['coverage-summary.json', 'summary.json'],
    ['coverage-final.json', 'coverage.json'],
  ]) {
    copyFileSync(`coverage/${source}`, `${evidence}/${stage}-${suffix}`);
  }
}

measure('before');
try {
  writeFileSync(testFile, original + temporaryTest);
  writeFileSync(
    `${evidence}/temporary-test.ts.txt`,
    temporaryTest.trim() + '\n',
  );
  measure('after');
} finally {
  writeFileSync(testFile, original);
}
measure('final');
