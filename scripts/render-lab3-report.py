"""Render with the bundled document runtime and the installed Times New Roman."""
import os
from pathlib import Path
import subprocess
import sys
import tempfile

ROOT = Path(__file__).resolve().parents[1]
RUNTIME = Path(os.environ.get('CODEX_ARTIFACT_RUNTIME', '/Users/mila/.cache/codex-runtimes/codex-primary-runtime'))
SKILL = Path('/Users/mila/.codex/plugins/cache/openai-primary-runtime/documents/26.915.20218/skills/documents')
OUT = Path(sys.argv[1]) if len(sys.argv) > 1 else Path('/private/tmp/lab3-report-render-times')
with tempfile.TemporaryDirectory(prefix='lab3-fonts-') as temp:
    config = Path(temp) / 'fonts.conf'
    config.write_text(f'''<?xml version="1.0"?>
<!DOCTYPE fontconfig SYSTEM "urn:fontconfig:fonts.dtd">
<fontconfig>
  <dir>/System/Library/Fonts/Supplemental</dir>
  <cachedir>{temp}/cache</cachedir>
</fontconfig>
''')
    env = dict(os.environ, FONTCONFIG_FILE=str(config), FONTCONFIG_PATH=temp, SAL_FONTPATH='/System/Library/Fonts/Supplemental')
    subprocess.run([str(RUNTIME / 'dependencies/python/bin/python'), str(SKILL / 'render_docx.py'), str(ROOT / 'Лабораторна_робота_№3_TDD_Граб.docx'), '--output_dir', str(OUT), '--emit_pdf', '--dpi', '110'], env=env, check=True)
