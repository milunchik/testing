import { spawnSync } from 'node:child_process';
import { copyFileSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import process from 'node:process';

// Supplemental installment experiment; not the prescribed calcOrderTotal case.
const evidence = 'docs/lab2/evidence';
const temporaryTest = 'tests/installment-experiment.test.ts';
mkdirSync(evidence, { recursive: true });

function measure(stage) {
  const result = spawnSync('npm', ['run', 'coverage'], { encoding: 'utf8' });
  const output = result.stdout + result.stderr;
  writeFileSync(`${evidence}/${stage}.txt`, output);
  process.stdout.write(output);
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Coverage failed at ${stage}.`);
  copyFileSync(
    'coverage/coverage-summary.json',
    `${evidence}/${stage}-summary.json`,
  );
  copyFileSync(
    'coverage/coverage-final.json',
    `${evidence}/${stage}-coverage.json`,
  );
}

measure('before');
writeFileSync(
  temporaryTest,
  "import { it } from 'vitest';\n" +
    "import { calcInstallment } from '../src/order';\n\n" +
    "it('виклик без перевірки результату', () => {\n" +
    '  calcInstallment(100, 3);\n' +
    '});\n',
  { flag: 'wx' },
);
try {
  measure('after');
} finally {
  unlinkSync(temporaryTest);
}
measure('final');
