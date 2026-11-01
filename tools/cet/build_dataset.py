"""Build CET data: curated entries override cleaned ECDICT definitions."""
from collections import Counter, defaultdict
import json
import re
import sqlite3
import unicodedata

from parse_outline import ROOT, OUT, write_json

DATA = ROOT.parents[1] / 'public/data/cet-words.json'
POS_MAP = {'a': 'adj.', 'adj': 'adj.', 's': 'adj.', 'n': 'n.', 'v': 'v.', 'vt': 'v.', 'vi': 'v.',
           'adv': 'adv.', 'ad': 'adv.', 'pron': 'pron.', 'prep': 'prep.', 'conj': 'conj.',
           'interj': 'int.', 'int': 'int.', 'num': 'num.', 'art': 'art.', 'aux': 'aux.',
           'modal': 'aux.', 'det': 'det.', 'pl': 'n.'}
CORPUS_POS = {'j': 'adj.', 'n': 'n.', 'v': 'v.', 'r': 'adv.', 'p': 'pron.', 'i': 'prep.',
              'c': 'conj.', 'a': 'art.', 'm': 'num.', 'u': 'int.'}
POS_RE = re.compile(r'(?<![A-Za-z])(' + '|'.join(sorted(POS_MAP, key=len, reverse=True)) + r')\.')
HAN = re.compile(r'[\u3400-\u9fff]')
BAD_REGISTER = re.compile(r'古语|古义|古用|废语|罕用|罕见|俚语|粗俗|网络|人名|姓氏|姓\)|姓）|音译|地名|方言|口语|贬义|<|>')
LABEL = re.compile(r'\[[^\]]*\]|【[^】]*】|［[^］]*］|<[^>]*>|〈[^〉]*〉')
EXCHANGE_LABELS = {'p': '过去式', 'd': '过去分词', 'i': '现在分词', '3': '第三人称单数',
                   'r': '比较级', 't': '最高级', 's': '复数'}
# Small, explicit synonym clusters, used only for redundancy removal.
SYNONYMS = [set(s.split('/')) for s in ['跑/奔跑/跑步', '增加/增多/增大/增长', '开始/开端/起始',
            '组织/组织起来', '仔细的/细心的/仔细', '快的/快速的/迅速的', '正确的/对的',
            '允许/准许/许可', '巨大/庞大/巨大无比', '放/放置/安置', '结束/终结/完结']]


def db_open():
    path = ROOT / '.cache/stardict.db'
    db = sqlite3.connect(path.as_uri() + '?mode=ro', uri=True)
    db.row_factory = sqlite3.Row
    return db


def clean_term(term):
    term = term.strip(' ,，;；。\t\r\n').replace('(', '（').replace(')', '）')
    if not term or not HAN.search(term) or BAD_REGISTER.search(term):
        return None
    if re.search(r'\([^)]*$', term) or term.count('（') != term.count('）'):
        return None
    # English glosses and cross references are not Chinese definitions.
    latin_check = re.sub(r'X(?=射线|光)', '', term)
    if re.search('[A-Za-z]', latin_check) or re.search(r'过去式|过去分词|现在分词|第三人称|的复数|的单数|同上|参见|见上|的缩写|异体', term):
        return None
    # Explanatory parentheticals may be removed as a unit; never cut a definition.
    if len(term) > 18:
        term = re.sub(r'（[^（）]*）', '', term)
    if len(term) > 18 or any(unicodedata.category(c) == 'Co' for c in term):
        return None
    return term


def candidate_senses(row):
    groups = defaultdict(list)
    translation = (row.get('translation') or '').replace('\\r\\n', '\n').replace('\\n', '\n').replace('\r', '')
    domain_continuation = False
    for line in translation.splitlines():
        line = line.replace('(', '（').replace(')', '）')
        if domain_continuation and not POS_RE.match(line.strip()):
            continue
        domain_continuation = bool(LABEL.search(line))
        # Discard a domain label and the rest of its labelled segment, never just the label.
        line = LABEL.split(line, maxsplit=1)[0].strip()
        if not line:
            continue
        matches = list(POS_RE.finditer(line))
        segments = [(POS_MAP[m.group(1)], line[m.end():matches[i+1].start() if i+1 < len(matches) else len(line)])
                    for i, m in enumerate(matches)]
        if not segments:
            # Only use an explicit unambiguous corpus POS; otherwise leave the POS empty.
            weights = [p for p in (row.get('pos') or '').split('/') if p]
            pos = CORPUS_POS.get(weights[0].split(':')[0], '') if len(weights) == 1 else ''
            segments = [(pos, line)]
        for pos, body in segments:
            for item in re.split(r'[,，;；、](?![^（）]*）)', body):
                term = clean_term(item)
                if term and term not in groups[pos]:
                    groups[pos].append(term)
    return dict(groups)


def distinct(terms):
    kept = []
    for term in terms:
        if any(term in group and any(t in group for t in kept) for group in SYNONYMS):
            continue
        kept.append(term)
    return kept


def rank_senses(groups, row):
    weights = {CORPUS_POS.get(k, ''): int(v) for k, v in re.findall(r'([a-z]):(\d+)', row.get('pos') or '')}
    weights['aux.'] = weights.get('v.', 0)
    return sorted(groups, key=lambda p: -weights.get(p, 0))


def refine(row, selection=None):
    groups = candidate_senses(row)
    if selection is not None:
        groups = dict(selection)
        order = list(groups)
    else:
        weights = {CORPUS_POS.get(k, ''): int(v) for k, v in re.findall(r'([a-z]):(\d+)', row.get('pos') or '')}
        # Rare POS branches are a major source of archaic and technical senses.
        retained = {p: ts for p, ts in groups.items() if not weights or weights.get(p, 0) >= 5 or p == 'aux.' and weights.get('v.', 0) >= 5}
        if retained:
            groups = retained
        groups = {p: distinct(ts)[:4] for p, ts in groups.items() if ts}
        order = rank_senses(groups, row)
    senses = [{'pos': p, 'text': '；'.join(groups[p][:4])} for p in order if groups[p]]
    # Choose whole glosses, never truncate a term or a parenthesis.
    front = []
    for sense in senses[:2]:
        prefix = sense['pos'] + ' ' if sense['pos'] else ''
        terms = sense['text'].split('；')
        first = prefix + terms[0]
        if len('  '.join(front + [first])) <= 28:
            front.append(first)
    # Add up to two more terms per POS without sacrificing the second POS.
    for i in range(len(front)):
        for term in senses[i]['text'].split('；')[1:3]:
            expanded = front.copy()
            expanded[i] += '；' + term
            if len('  '.join(expanded)) <= 28:
                front = expanded
    return '  '.join(front), senses


def phonetic(raw):
    value = (raw or '').strip().strip('/[] ')
    # The source is primarily British. Choose the first listed variant consistently.
    value = re.split(r'\.\s+|,\s+|[;；]|\s*/\s*', value)[0].strip()
    if not value or re.search(r'[\u3400-\u9fff\[\]()^~{}\\=]', value) or any(c.isdigit() for c in value) or value.endswith('-'):
        return None
    for old, new in [('ɒ:', 'ɔː'), ('ә:', 'ɜː'), ('ә', 'ə'), ('є', 'e'), ('g', 'ɡ'), (':', 'ː'),
                     ('ei', 'eɪ'), ('ai', 'aɪ'), ('au', 'aʊ'), ('oi', 'ɔɪ'), ('ou', 'əʊ'),
                     ('əu', 'əʊ'), ('iə', 'ɪə'), ('uə', 'ʊə'), ("'", 'ˈ'), ('.', 'ˌ'), (',', 'ˌ')]:
        value = value.replace(old, new)
    value = re.sub(r'i(?!ː|$)', 'ɪ', value)
    value = re.sub(r'u(?!ː)', 'ʊ', value)
    return value.strip()


def lookup(db, word):
    found = db.execute('SELECT * FROM stardict WHERE word=?', (word.lower(),)).fetchone()
    return dict(found) if found else None


def key_variant(word):
    return re.sub(r'[-()\s]', '', word.lower())


def match_entries(db, words, curated):
    matches, missing = {}, []
    for entry in words:
        for form in [entry['word'], *entry.get('alts', [])]:
            row = lookup(db, form)
            if row:
                matches[entry['id']] = (row, 'exact_lower' if form == entry['word'] else 'explicit_alternative')
                break
        else:
            if (entry['word'], entry.get('homograph')) not in curated:
                missing.append(entry)
    if not missing:
        return matches
    wanted = {form.lower() for e in missing for form in [e['word'], *e.get('alts', [])]}
    reverse = defaultdict(set)
    for row in db.execute("SELECT word,exchange FROM stardict WHERE exchange IS NOT NULL AND exchange<>''"):
        for part in row['exchange'].split('/'):
            if ':' not in part:
                continue
            code, forms = part.split(':', 1)
            if code in EXCHANGE_LABELS:
                for form in forms.split(','):
                    if form.lower() in wanted:
                        reverse[form.lower()].add(row['word'])
    for entry in missing:
        candidates = set().union(*(reverse[f.lower()] for f in [entry['word'], *entry.get('alts', [])]))
        if len(candidates) == 1:
            matches[entry['id']] = (lookup(db, candidates.pop()), 'exchange_reverse')
            continue
        variants = {key_variant(f) for f in [entry['word'], *entry.get('alts', [])]}
        candidates = {r['word']: dict(r) for variant in variants for r in db.execute('SELECT * FROM stardict WHERE sw=?', (variant,))
                      if key_variant(r['word']) == variant}
        if len(candidates) == 1:
            matches[entry['id']] = (next(iter(candidates.values())), 'hyphen_parenthesis_variant')
    return matches


def exchanges(row, senses):
    pos = {s['pos'] for s in senses}
    codes = set()
    if pos & {'v.', 'aux.'}:
        codes.update('pdi3')
    if 'n.' in pos:
        codes.add('s')
    if pos & {'adj.', 'adv.'}:
        codes.update('rt')
    result = []
    for code, forms in re.findall(r'(\w):([^/]+)', row.get('exchange') or ''):
        if code in codes:
            result.extend({'label': EXCHANGE_LABELS[code], 'form': form}
                          for form in forms.split(',') if form.lower() != row['word'].lower())
    return result


def build():
    words = json.loads((OUT / 'wordlist.json').read_text(encoding='utf-8'))
    selections = json.loads((ROOT / 'editorial_selections.json').read_text(encoding='utf-8'))
    curated = {(w['word'], w.get('homograph')): w for w in json.loads((ROOT / 'curated.json').read_text(encoding='utf-8'))}
    db = db_open()
    matches = match_entries(db, words, curated)
    data, unmatched, audit, candidates = [], [], [], []
    for entry in words:
        item = dict(entry, meaning='')
        match = matches.get(entry['id'])
        trace = {'id': entry['id'], 'word': entry['word']}
        edit = curated.get((entry['word'], entry.get('homograph')))
        if match:
            row, method = match
            trace.update({'dictionary_word': row['word'], 'dictionary_id': row['id'], 'match_method': method})
            if row.get('bnc') and row['bnc'] > 0:
                item['freq'] = row['bnc']
        if edit:
            item.update(edit)
            trace['source'] = 'curated'
        elif match:
            selection = selections.get(entry['word'], {})
            item['meaning'], item['senses'] = refine(row, selection.get('senses'))
            ipa = phonetic(selection.get('phonetic_source', row.get('phonetic')))
            if ipa:
                item['phonetic'] = ipa
            forms = exchanges(row, item['senses']) if entry['word'].islower() else []
            if forms:
                item['exchange'] = forms
            trace['source'] = 'ecdict'
            candidates.append({'id': entry['id'], 'word': entry['word'], 'candidates': candidate_senses(row)})
        if not item['meaning']:
            reason = 'no_general_chinese_sense' if match else 'dictionary_not_found'
            unmatched.append({**entry, 'reason': reason, 'dictionary_word': match[0]['word'] if match else None})
            trace['unmatched_reason'] = reason
        audit.append(trace)
        data.append(item)
    write_json(DATA, data)
    write_json(OUT / 'unmatched.json', unmatched)
    write_json(OUT / 'match_audit.json', audit)
    write_json(OUT / 'sense_candidates.json', candidates)
    summary = {'total': len(data), 'level4': sum(x['level'] == 4 for x in data), 'level6': sum(x['level'] == 6 for x in data),
               'meaning_count': sum(bool(x['meaning']) for x in data), 'phonetic_count': sum(bool(x.get('phonetic')) for x in data),
               'unmatched_count': len(unmatched), 'unmatched_reasons': dict(Counter(x['reason'] for x in unmatched)),
               'sources': dict(Counter(x.get('source', 'unmatched') for x in audit)),
               'match_methods': dict(Counter(x.get('match_method', 'none') for x in audit)),
               'meaning_lengths': dict(sorted(Counter(len(x['meaning']) for x in data).items()))}
    write_json(OUT / 'build_stats.json', summary)
    print(json.dumps(summary, ensure_ascii=False, indent=2))
    db.close()
    return data


if __name__ == '__main__':
    build()
