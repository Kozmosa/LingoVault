"""Refresh the established 80-word stratified sample without changing its IDs."""
import json
from build_dataset import DATA
from parse_outline import OUT


def wordkey(word):
    return word['word'] + (f'#{word["homograph"]}' if 'homograph' in word else '')


def frequency(word):
    rank = word.get('freq', 0)
    return '高频' if 0 < rank <= 3000 else '低频' if rank >= 10000 else '中频' if rank else '无频次'


def sense_count(word):
    return sum(len(s['text'].split('；')) for s in word.get('senses', []))


def make_sample():
    data = json.loads(DATA.read_text(encoding='utf-8'))
    chosen = set(json.loads((OUT / 'review_sample_ids.json').read_text(encoding='utf-8')))
    sample = [w for w in data if w['id'] in chosen]
    assert len(sample) == 80
    lines = ['# CET 释义人工复核样本（80 词）', '',
             '四级 40 条、六级 40 条。沿用首轮的 80 个固定 id，便于对比修订前后措辞；原样本含 28 条固定风险词，其余按级别、BNC 频段、单义/多义分层抽取。按大纲顺序展示。', '',
             '高频：BNC ≤3000；低频：BNC ≥10000；无频次不等于生僻。单义/多义指当前保留的义项数。curated.json 的人工释义与英式音标优先于 ECDICT；同形异义按编号分别展示。', '',
             '| 词（层） | 音标 | meaning | senses 摘要 |',
             '|---|---|---|---|']
    for word in sample:
        tags = [str(word['level']) + '级', frequency(word)]
        if 'homograph' in word:
            tags.append('同形异义')
        elif not word['meaning']:
            tags.append('未匹配')
        else:
            tags.append('多义' if sense_count(word) > 1 else '单义')
        shown = wordkey(word)
        if word.get('alts'):
            shown += ' / ' + ' / '.join(word['alts'])
            tags.append('双写/别名')
        senses = ' / '.join((s['pos'] + ' ' + s['text']).strip() for s in word.get('senses', [])) or '—（见 unmatched 原因）'
        cells = [shown + '（' + '，'.join(tags) + '）', word.get('phonetic') or '—', word['meaning'] or '—', senses]
        lines.append('| ' + ' | '.join(c.replace('|', '\\|').replace('\n', ' ') for c in cells) + ' |')
    lines += ['', '复核重点：同形异义的编号与读音、多义词常用义排序，以及中文措辞是否简明易懂。', '']
    (OUT / 'review_sample.md').write_text('\n'.join(lines), encoding='utf-8')
    print('review_sample.md: 80 rows; CET4=40; CET6=40; homographs=' + str(sum('homograph' in w for w in sample)))


if __name__ == '__main__':
    make_sample()
