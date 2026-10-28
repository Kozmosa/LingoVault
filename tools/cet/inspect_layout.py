"""Local layout investigation; all artifacts stay in tools/cet."""
from pathlib import Path
import json
import re
import pymupdf

ROOT = Path(__file__).resolve().parent


def layout_rows():
    text = (ROOT / 'source/outline.txt').read_text(encoding='utf-8')
    pages = {int(n): s for n, s in re.findall(r'=====PAGE (\d+)=====([\s\S]*?)(?======PAGE |\Z)', text)}
    result = []
    with pymupdf.open(ROOT / 'source/outline.pdf') as pdf:
        for number in range(21, 150):
            page = pdf[number - 1]
            # The lexical input remains outline.txt. PDF supplies coordinates only.
            source_lines = [s for s in pages[number].splitlines() if s.strip()]
            raw_lines = [line for b in page.get_text('rawdict')['blocks'] if 'lines' in b for line in b['lines']]
            pdf_lines = [''.join(c['c'] for s in line['spans'] for c in s['chars']) for line in raw_lines]
            nonempty = [s for s in pdf_lines if s.strip()]
            if nonempty != source_lines:
                raise ValueError(f'PDF/text mismatch on page {number}')
            anchors = []
            for line, content in zip(raw_lines, pdf_lines):
                if line['bbox'][0] < 100 and 68 < line['bbox'][1] < 675 and re.search('[a-zA-Z]', content):
                    chars = [c for span in line['spans'] for c in span['chars']]
                    baseline = next(c['origin'][1] for c in chars if c['c'].isascii() and c['c'].isalpha())
                    anchors.append({'page': number, 'y': baseline, 'chars': []})
            source_iter = iter(source_lines)
            for line, content in zip(raw_lines, pdf_lines):
                source = next(source_iter) if content.strip() else content
                if not 68 < line['bbox'][1] < 675 or line['bbox'][0] > 470:
                    continue
                offset = 0
                for span in line['spans']:
                    for char in span['chars']:
                        char = dict(char, c=source[offset])
                        offset += 1
                        row = min(anchors, key=lambda r: abs(r['y'] - char['origin'][1]))
                        if abs(row['y'] - char['origin'][1]) < 8:
                            row['chars'].append(char)
            for row in anchors:
                cells = ['']
                positions = []
                previous = None
                for c in sorted(row.pop('chars'), key=lambda c: c['origin'][0]):
                    x = c['origin'][0]
                    if previous is not None and x > 155 and x - previous > 11:
                        cells.append('')
                        positions.append(round(x, 2))
                    cells[-1] += c['c']
                    previous = x
                row['cells'] = [token for c in cells for token in c.split()]
                row['break_x'] = positions
                result.append(row)
    return result


if __name__ == '__main__':
    rows = layout_rows()
    (ROOT / 'out/layout_rows.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print('rows:', len(rows), 'stars:', sum('★' in r['cells'][0] for r in rows), 'other cells:', sum(len(r['cells'])-1 for r in rows))
    print('\n'.join(str(r) for r in rows if '(' in r['cells'][0] or '/' in r['cells'][0] or ' ' in r['cells'][0]))
