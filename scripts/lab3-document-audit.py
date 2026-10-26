"""Check the final academic DOCX/PDF and retain measured artifact metadata."""
import hashlib
import json
from pathlib import Path
import sys

from docx import Document
from docx.oxml.ns import qn
from docx.shared import Pt
import pdfplumber

ROOT = Path(__file__).resolve().parents[1]
DOCX = ROOT / 'Лабораторна_робота_№3_TDD_Граб.docx'
PDF = ROOT / 'Лабораторна_робота_№3_TDD_Граб.pdf'
doc = Document(DOCX)
pdf = pdfplumber.open(PDF)
assert len(pdf.pages) == 37
assert len(doc.tables) == 9
assert len(doc.inline_shapes) == 14
assert len([p for p in doc.paragraphs if p.style.name == 'Heading 1']) == 10
expected = []
for file in ['src/parking.ts', 'tests/parking.test.ts', 'src/insurance.ts', 'tests/insurance.test.ts']:
    expected.extend((ROOT / file).read_text().splitlines())
assert [p.text for p in doc.paragraphs if p.style.name == 'Source Listing'] == expected
for name in ['Normal', 'Title', 'Heading 1', 'Heading 2', 'Caption', 'Source Listing']:
    assert doc.styles[name].font.name == 'Times New Roman'
    assert doc.styles[name].font.size == Pt(14)
    assert doc.styles[name].paragraph_format.line_spacing == 1.5
assert not list(doc.styles.element.iter(qn('w:pBdr')))
for table in doc.tables:
    assert not list(table._tbl.iter(qn('w:shd')))
    assert all(border.get(qn('w:color')) == '000000' for borders in table._tbl.iter(qn('w:tblBorders')) for border in borders)
pages = []
fonts = set()
for index, page in enumerate(pdf.pages, 1):
    assert abs(page.width - 595.28) < 1 and abs(page.height - 841.89) < 1
    text = page.extract_text() or ''
    assert len(text) > 100 or page.images, f'Blank page {index}'
    assert '\ufffd' not in text
    for c in page.chars:
        assert 'TimesNewRoman' in c['fontname'], c['fontname']
        assert abs(c['size'] - 14) < 0.1
        assert 40 < c['x0'] < c['x1'] < page.width - 35
        assert c['non_stroking_color'] in [(0, 0, 0), (0.0, 0.0, 0.0), 0], c['non_stroking_color']
        fonts.add(c['fontname'])
    for im in page.images:
        assert 35 < im['x0'] < im['x1'] < page.width - 35
        assert 45 < im['top'] < im['bottom'] < page.height - 50
    pages.append({'page': index, 'textCharacters': len(text), 'images': len(page.images), 'a4': True})
screenshots = sorted((ROOT / 'report/lab3/screenshots').glob('*.png'))
result = {'pages': len(pdf.pages), 'allPagesRenderedAndVisuallyReviewed': '--visual-review-complete' in sys.argv, 'fonts': sorted(fonts), 'fontSizePt': 14, 'requiredSections': 10, 'numberedTables': 9, 'numberedFigures': 14, 'completeListingLines': len(expected), 'screenshots': len(screenshots), 'pageChecks': pages, 'sha256': {p.name: hashlib.sha256(p.read_bytes()).hexdigest() for p in [DOCX, PDF]}}
(ROOT / 'report/lab3/evidence/document-audit.json').write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n')
(ROOT / 'report/lab3/evidence/screenshots-sha256.txt').write_text(''.join(f'{hashlib.sha256(p.read_bytes()).hexdigest()}  {p.name}\n' for p in screenshots))
print(json.dumps({k: v for k, v in result.items() if k != 'pageChecks'}, ensure_ascii=False, indent=2))
