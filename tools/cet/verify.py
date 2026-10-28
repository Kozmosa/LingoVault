"""Check counts, IDs, text noise, and meaning coverage/length."""
from collections import Counter
import json
import re
import sys
import unicodedata

from parse_outline import OUT
from build_dataset import DATA


def main():
    data = json.loads(DATA.read_text(encoding='utf-8'))
    unmatched = json.loads((OUT / 'unmatched.json').read_text(encoding='utf-8'))
    levels = Counter(w['level'] for w in data)
    lengths = [len(w['meaning']) for w in data]
    empty = {w['id'] for w in data if not w['meaning']}
    text = json.dumps(data, ensure_ascii=False)
    checks = {
        'counts': len(data) == 5377 and levels == {4: 4114, 6: 1263},
        'continuous_ids': [w['id'] for w in data] == [f'cet-{i:04d}' for i in range(1, len(data)+1)],
        'clean_text': all(w['word'].strip() for w in data)
            and not re.search(r'[０-９Ｇ]|全国大学英语|=====PAGE', text)
            and not any(unicodedata.category(c) == 'Co' for c in text),
        'meaning_coverage': len(unmatched) <= 5 and empty == {w['id'] for w in unmatched}
            and all(w['reason'] for w in unmatched),
        'meaning_length': max(lengths) <= 28 and all('\n' not in w['meaning'] for w in data),
    }
    lines = [f'INFO printed_total=5418; accepted_actual={len(data)}; delta={len(data)-5418:+d}']
    lines.extend(f'{"PASS" if ok else "FAIL"} {name}' for name, ok in checks.items())
    lines.append(f'total={len(data)}; CET4={levels[4]}; CET6/stars={levels[6]}')
    for field in ('meaning', 'phonetic'):
        count = sum(bool(w.get(field)) for w in data)
        lines.append(f'{field}_coverage={count}/{len(data)} ({count/len(data):.2%})')
    lines.append(f'unmatched={len(unmatched)}; ' + json.dumps(unmatched, ensure_ascii=False))
    lines.append('meaning_length_distribution=' + json.dumps(dict(sorted(Counter(lengths).items()))))
    lines.append(f'meaning_max={max(lengths)}; over_28={sum(n > 28 for n in lengths)}')
    failed = sum(not ok for ok in checks.values())
    lines.append(f'RESULT={"FAIL" if failed else "PASS"}; failed_checks={failed}; exit_code={int(bool(failed))}')
    output = '\n'.join(lines) + '\n'
    (OUT / 'verify.txt').write_text(output, encoding='utf-8')
    print(output, end='')
    return int(bool(failed))


if __name__ == '__main__':
    sys.exit(main())
