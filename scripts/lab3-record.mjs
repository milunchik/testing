import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import process from 'node:process';

const [name, command, ...args] = process.argv.slice(2);
if (!/^[a-z0-9-]+$/.test(name) || !command)
  throw new Error('Usage: lab3-record.mjs name command ...args');
const dir = 'report/lab3/evidence';
mkdirSync(dir, { recursive: true });
const started = new Date().toISOString();
const result = spawnSync(command, args, {
  encoding: 'utf8',
  env: { ...process.env, NO_COLOR: '1', FORCE_COLOR: '0' },
});
writeFileSync(`${dir}/${name}.stdout.txt`, result.stdout ?? '');
writeFileSync(`${dir}/${name}.stderr.txt`, result.stderr ?? '');
writeFileSync(
  `${dir}/${name}.json`,
  JSON.stringify(
    {
      command: [command, ...args].join(' '),
      started,
      finished: new Date().toISOString(),
      exitCode: result.status,
      stdout: `${name}.stdout.txt`,
      stderr: `${name}.stderr.txt`,
    },
    null,
    2,
  ) + '\n',
);
process.stdout.write(result.stdout ?? '');
process.stderr.write(result.stderr ?? '');
process.exitCode = result.status ?? 1;
