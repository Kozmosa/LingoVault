"""Independent pypdf baseline count; no lexical corrections and no network."""
from collections import Counter
import re
import pymupdf
from pypdf import PdfReader
from parse_outline import ROOT, OUT, write_json


def audit():
    # pypdf's optional AES backend is absent in this environment. PyMuPDF rewrites
    # the locally readable source without encryption; original source is untouched.
    target = ROOT / '.cache/outline-layout-check.pdf'
    if not target.exists():
        with pymupdf.open(ROOT / 'source/outline.pdf') as pdf:
            pdf.save(target, encryption=pymupdf.PDF_ENCRYPT_NONE)
    reader = PdfReader(target)
    results = []
    for index in range(20, 149):
        baselines = set()

        def visit(text, cm, tm, font, size):
            x = tm[4] * cm[0] + tm[5] * cm[2] + cm[4]
            y = tm[4] * cm[1] + tm[5] * cm[3] + cm[5]
            if re.search('[A-Za-z]', text) and 65 <= x < 100:
                baselines.add(round(y, 1))

        reader.pages[index].extract_text(visitor_text=visit)
        # Font changes have slightly different baselines on the same printed row;
        # actual rows are about 14.17 pt apart, so cluster only within 5 pt.
        rows = []
        for y in sorted(baselines):
            if not rows or y - rows[-1] > 5:
                rows.append(y)
        results.append({'page': index + 1, 'left_column_baselines': len(rows)})
    write_json(OUT / 'pypdf_counts.json', results)
    print('Independent pypdf baseline distribution:', dict(Counter(r['left_column_baselines'] for r in results)))
    print('Total:', sum(r['left_column_baselines'] for r in results))


if __name__ == '__main__':
    audit()
