"""Parse official headwords in source/outline.txt with verified PDF column geometry.

Plain-text extraction discards the distinction between headwords and derivatives.
Every PDF text line must equal the source text before its coordinates can be used.
No row is inserted or dropped to match the printed summary.
"""
from collections import Counter, defaultdict
import hashlib
import json
from pathlib import Path
import re
import unicodedata

from inspect_layout import layout_rows

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'out'
# Exact typographic substitutions, not additional entries. Evidence: cited PDF rows.
PHRASES = {'accordingto': 'according to', 'oughtto': 'ought to'}
SUFFIXES = {'ise': ('ize', 'ise'), 'yse': ('yze', 'yse'), 'tre': ('ter', 'tre'),
            'ce': ('se', 'ce'), 'xion': ('ction', 'xion'), 'sy': ('zy', 'sy'),
            'ice': ('ise', 'ice'), 're': ('er', 're'), 'cius': ('sius', 'cius'),
            'bre': ('ber', 'bre'), 'er': ('or', 'er')}


def normalize(raw):
    level = 6 if raw.startswith('★') else 4
    s = raw.lstrip('★').replace('Ｇ', '-').replace('\U001001b3', "'")
    if any(unicodedata.category(c) == 'Co' for c in s):
        raise ValueError(f'Unrecognized private-use character in lexical cell: {raw}')
    s = unicodedata.normalize('NFKC', s)
    homographs = re.findall(r'\d+', s)
    s = re.sub(r'\d+', '', s)
    parts = s.split('/')
    forms = []
    for part in parts:
        if part.startswith('-'):
            suffix = part[1:]
            old, new = SUFFIXES[suffix]
            primary = forms[0]
            if not primary.endswith(old):
                raise ValueError(f'Unrecognized suffix {raw}')
            forms.append(primary[:-len(old)] + new)
        elif '(' in part:
            short = re.sub(r'\([^)]*\)', '', part)
            long = part.replace('(', '').replace(')', '')
            # The parenthesized phrase is a long-form alternative, not an infix.
            if part.startswith('coup('):
                long = 'coup ' + part[5:-1]
            forms.extend([short, long])
        else:
            forms.append(part)
    forms = list(dict.fromkeys(PHRASES.get(x, x) for x in forms))
    record = {'word': forms[0], 'level': level}
    if len(forms) > 1:
        record['alts'] = forms[1:]
    if homographs:
        if len(homographs) != 1:
            raise ValueError(raw)
        record['homograph'] = int(homographs[0])
    if not re.fullmatch(r"[A-Za-zÀ-ž][A-Za-zÀ-ž .'-]*", record['word']):
        raise ValueError(f'Invalid word: {record}')
    return record


def parse():
    rows = layout_rows()
    records, provenance, derivatives = [], [], []
    for i, row in enumerate(rows, 1):
        raw = row['cells'][0]
        record = {'id': f'cet-{i:04d}', **normalize(raw)}
        records.append(record)
        provenance.append({'id': record['id'], 'page': row['page'], 'baseline': round(row['y'], 3), 'raw': raw})
        for raw_derivative in row['cells'][1:]:
            derivatives.append({'parent_id': record['id'], 'page': row['page'], 'raw': raw_derivative})
    stats = {'printed_total': 5418, 'parsed_total': len(records), 'difference': len(records) - 5418,
             'stars': sum(w['level'] == 6 for w in records), 'level4': sum(w['level'] == 4 for w in records),
             'right_column_cells': len(derivatives), 'printed_right_column_total': 2551,
             'by_page': dict(sorted(Counter(r['page'] for r in rows).items())),
             'homograph_entries': sum('homograph' in w for w in records),
             'alternative_entries': sum('alts' in w for w in records),
             'source_sha256': hashlib.sha256((ROOT / 'source/outline.txt').read_bytes()).hexdigest(),
             'pdf_sha256': hashlib.sha256((ROOT / 'source/outline.pdf').read_bytes()).hexdigest()}
    return records, provenance, derivatives, stats


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


if __name__ == '__main__':
    records, provenance, derivatives, stats = parse()
    for name, data in [('wordlist', records), ('source_rows', provenance), ('excluded_derivatives', derivatives), ('parse_stats', stats)]:
        write_json(OUT / f'{name}.json', data)
    print(json.dumps({k:v for k,v in stats.items() if k != 'by_page'}, ensure_ascii=False, indent=2))
    print('Source discrepancy retained; no synthetic entries added.' if stats['difference'] else 'Printed total matches.')
