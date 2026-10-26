"""Publish only the requested Lab 3 branch; never print credential values."""
import json
import os
from pathlib import Path
import subprocess
import sys
from urllib.request import Request, urlopen
from urllib.error import HTTPError

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'report/lab3/evidence/github.json'
REPO = 'milunchik/testing'
BRANCH = 'feature/lab3-tdd-insurance'
BASE = 'feature/lab2-vitest-installment'
env = dict(os.environ, GIT_TERMINAL_PROMPT='0')
credential = subprocess.run(['git', 'credential', 'fill'], input='protocol=https\nhost=github.com\n\n', text=True, capture_output=True, env=env)
fields = dict(line.split('=', 1) for line in credential.stdout.splitlines() if '=' in line)
token = fields.get('password')
if not token:
    OUT.write_text(json.dumps({'repository': f'https://github.com/{REPO}', 'authenticated': False, 'reason': 'SSH public-key authentication failed; no HTTPS credential available.'}, indent=2) + '\n')
    print('No HTTPS GitHub credential is available. No push or PR attempted.')
    sys.exit(0)

def api(route, body=None):
    request = Request('https://api.github.com' + route, data=None if body is None else json.dumps(body).encode(), headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/vnd.github+json', 'User-Agent': 'Lab3-TDD-report'})
    with urlopen(request, timeout=30) as response:
        return json.load(response)

try:
    user = api('/user')
    result = {'repository': f'https://github.com/{REPO}', 'authenticated': True, 'login': user['login'], 'branch': BRANCH, 'base': BASE}
    print('Authenticated GitHub user:', user['login'])
    if '--publish' in sys.argv:
        pushed = subprocess.run(['git', '-c', f'remote.origin.url=https://github.com/{REPO}.git', 'push', '-u', 'origin', BRANCH], text=True, capture_output=True, env=env)
        print(pushed.stdout, pushed.stderr)
        result['pushExitCode'] = pushed.returncode
        if pushed.returncode != 0:
            raise RuntimeError('GitHub branch push failed')
        existing = api(f'/repos/{REPO}/pulls?head=milunchik:{BRANCH}&state=open')
        if existing:
            pr = existing[0]
        else:
            pr = api(f'/repos/{REPO}/pulls', {'title': 'Lab 3: parking and insurance calculators through genuine TDD', 'head': BRANCH, 'base': BASE, 'body': (ROOT / 'report/lab3/PR_BODY.md').read_text(), 'draft': True})
        result['pullRequest'] = pr['html_url']
        result['pushedCommit'] = subprocess.check_output(['git', 'rev-parse', 'HEAD'], text=True).strip()
        print('Pull Request:', pr['html_url'])
    OUT.write_text(json.dumps(result, indent=2) + '\n')
except (HTTPError, RuntimeError) as error:
    print('GitHub publication unavailable:', type(error).__name__, getattr(error, 'code', ''))
    OUT.write_text(json.dumps({'repository': f'https://github.com/{REPO}', 'authenticated': False, 'reason': type(error).__name__, 'httpStatus': getattr(error, 'code', None)}, indent=2) + '\n')
    sys.exit(1)
