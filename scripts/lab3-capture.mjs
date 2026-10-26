import { createServer } from 'node:http';
import {
  readFileSync,
  writeFileSync,
  mkdirSync,
  readdirSync,
  statSync,
} from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import process from 'node:process';

const runtime =
  process.env.CODEX_ARTIFACT_RUNTIME ??
  '/Users/mila/.cache/codex-runtimes/codex-primary-runtime';
const require = createRequire(
  `${runtime}/dependencies/node/node_modules/playwright/package.json`,
);
const { chromium } = require('playwright');
const root = process.cwd();
const out = 'report/lab3/screenshots';
mkdirSync(out, { recursive: true });
const escape = (s) =>
  s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const server = createServer((req, res) => {
  const file = path.resolve(root, `.${decodeURIComponent(req.url)}`);
  if (!file.startsWith(root + path.sep)) {
    res.writeHead(403).end();
    return;
  }
  try {
    const ext = path.extname(file);
    res.setHeader(
      'Content-Type',
      {
        '.html': 'text/html; charset=utf-8',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.png': 'image/png',
      }[ext] ?? 'text/plain; charset=utf-8',
    );
    res.end(readFileSync(file));
  } catch {
    res.writeHead(404).end();
  }
});
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ headless: true, channel: 'chrome' });
try {
  const page = await browser.newPage({
    viewport: { width: 1120, height: 800 },
    deviceScaleFactor: 2,
  });
  const capture = async (name, title, text, meta = '') => {
    const file = `report/lab3/evidence/${name}.html`;
    writeFileSync(
      file,
      `<!doctype html><meta charset="utf-8"><title>${escape(title)}</title><style>body{margin:24px;color:#111;background:white;font:16px Arial}h1{font-size:22px}p{line-height:1.5}pre{font:15px/1.4 monospace;white-space:pre-wrap;overflow-wrap:anywhere;border:1px solid #777;padding:16px}</style><h1>${escape(title)}</h1><p>Execution-log viewer — original captured process output, not a terminal emulator.</p><p>${escape(meta)}</p><pre>${escape(text).replace(/^\n/, '&#10;\n')}</pre>`,
    );
    await page.goto(`${base}/${file}`);
    const shown = await page.locator('pre').textContent();
    if (shown !== text)
      throw new Error(`Viewer changed source output: ${name}`);
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    if (name === 'git-history') {
      await page.screenshot({ path: `${out}/git-history-head.png` });
    }
  };
  for (const dir of readdirSync('report/lab3/evidence').filter((s) =>
    /^(parking|insurance)-\d{2}$/.test(s),
  )) {
    for (const phase of ['red', 'green', 'refactor']) {
      const prefix = `report/lab3/evidence/${dir}/${phase}`;
      try {
        statSync(`${prefix}.json`);
      } catch {
        continue;
      }
      const record = JSON.parse(readFileSync(`${prefix}.json`, 'utf8'));
      const stdout = readFileSync(`${prefix}.stdout.txt`, 'utf8');
      const stderr = readFileSync(`${prefix}.stderr.txt`, 'utf8');
      await capture(
        `${dir}-${phase}`,
        `${dir} ${phase.toUpperCase()}`,
        stdout + stderr,
        `$ ${record.command} | exit ${record.exitCode} | ${record.started} | stdout followed by stderr`,
      );
    }
  }
  for (const file of readdirSync('report/lab3/evidence').filter((s) =>
    s.endsWith('.json'),
  )) {
    const name = file.slice(0, -5);
    if (
      name === 'metrics' ||
      name === 'history-audit' ||
      name === 'coverage-summary' ||
      name === 'coverage-final' ||
      name === 'github'
    )
      continue;
    let record;
    try {
      record = JSON.parse(readFileSync(`report/lab3/evidence/${file}`, 'utf8'));
    } catch {
      continue;
    }
    if (!record.command || !record.stdout) continue;
    await capture(
      name,
      name,
      readFileSync(`report/lab3/evidence/${record.stdout}`, 'utf8') +
        readFileSync(`report/lab3/evidence/${record.stderr}`, 'utf8'),
      `$ ${record.command} | exit ${record.exitCode} | ${record.started}`,
    );
  }
  for (const [name, file] of [
    ['refactor-before', 'insurance-03/green.source.txt'],
    ['refactor-after', 'insurance-03/refactor.source.txt'],
  ]) {
    await capture(
      name,
      `Insurance cycle 03 ${name}`,
      readFileSync(`report/lab3/evidence/${file}`, 'utf8'),
      `Exact source snapshot: ${file}`,
    );
  }
  for (const [name, file] of [
    ['coverage-summary', 'index.html'],
    ['insurance-branch-coverage', 'insurance.ts.html'],
  ]) {
    try {
      statSync(`coverage/${file}`);
    } catch {
      continue;
    }
    await page.goto(`${base}/coverage/${file}`);
    await page.screenshot({ path: `${out}/${name}.png`, fullPage: true });
    if (name === 'insurance-branch-coverage') {
      await page.screenshot({
        path: `${out}/insurance-branch-coverage-top.png`,
      });
    }
  }
  writeFileSync(
    'report/lab3/evidence/screenshot-manifest.txt',
    readdirSync(out)
      .filter((x) => x.endsWith('.png'))
      .sort()
      .join('\n') + '\n',
  );
  process.stdout.write(`Playwright screenshots captured in ${out}\n`);
} finally {
  await browser.close();
  server.close();
}
