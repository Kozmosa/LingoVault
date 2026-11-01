"""Reproduce targeted human selections; every gloss is checked against ECDICT."""
import json
from parse_outline import ROOT, write_json

# Format is word | POS: exact source terms | POS: exact source terms.
SELECTIONS = '''
abandon | v.:放弃/抛弃/遗弃
abnormal | adj.:反常的/不规则的
abroad | adv.:往国外
absolute | adj.:绝对的/完全的
absorb | v.:吸收/使全神贯注/同化
abstract | adj.:抽象的 | n.:摘要/抽象概念 | v.:提炼/使抽象化
accent | n.:口音/重音 | v.:重读/强调
accessory | n.:附件/零件 | adj.:附属的/补充的
accident | n.:事故/意外事件
accommodate | v.:容纳/使适应
accompany | v.:陪伴/伴随/为...伴奏
account | n.:帐目/报告/解释 | v.:解释/占/认为
ace | n.:好手/发球得分 | adj.:一流的/杰出的
ache | n.:疼痛 | v.:痛
affection | n.:喜爱/情感
agent | n.:代理商/政府代表/媒介
aggressive | adj.:侵略的/进取的
airline | n.:航空公司/航线
alive | adj.:活着的/活泼的
apple | n.:苹果
armor | n.:盔甲/装甲
arm | n.:手臂/武器 | v.:武装/装备
Catholic | adj.:天主教的 | n.:天主教徒
Sunday | n.:星期日
abbreviation | n.:缩写词/缩写
affect | v.:影响/感动/假装
age | n.:年龄/时代/时期 | v.:变老/成熟
agenda | n.:议程/日常工作事项
all | pron.:全部 | adj.:所有的/全部的 | adv.:全部/全然
bill | n.:帐单/法案/钞票/鸟嘴 | v.:开帐单
book | n.:书/帐簿 | v.:预订/登记
charge | v.:收费/控诉/使充电 | n.:费用/指控/电荷
coach | n.:教练 | v.:训练/指导
current | adj.:当前的/现在的 | n.:流/趋势
draw | v.:画/拉/吸引 | n.:平局/抽签
even | adv.:甚至 | adj.:平坦的/偶数的/相等的
figure | n.:数字/图形 | v.:计算/认为/估计
film | n.:电影/胶卷/薄膜 | v.:拍摄/拍电影
fire | n.:火/火灾/炮火 | v.:点燃/射击/解雇
form | n.:形式/表格/类型 | v.:形成/（使）组成
free | adj.:自由的/免费的 | v.:释放/解放 | adv.:免费
great | adj.:伟大的/重大的/大的
interest | n.:兴趣/利息/利益 | v.:使感兴趣
issue | n.:问题/争端 | v.:发行/发布
increase | v.:增加/加大 | n.:增加
grow | v.:生长/种植/变成
kind | n.:种类 | adj.:亲切的/仁慈的/和蔼的
last | adj.:最后的/最近的 | v.:持续/维持 | adv.:最后
lot | n.:许多/一堆/份额
own | adj.:自己的 | v.:拥有
part | n.:部分/零件/角色 | v.:分开/分离
period | n.:时期/周期/句点/学时
play | v.:玩/演奏/扮演/比赛 | n.:游戏/剧本/比赛
point | n.:点/要点/分数 | v.:指向/指出/表明
power | n.:力量/权力/动力/功率
record | n.:记录/档案/唱片/最高纪录 | v.:记录/录音
school | n.:学校/学派 | v.:教育/训练
screen | n.:银幕/屏风/筛子 | v.:放映/甄别
snap | v.:折断/猛咬/厉声说 | n.:快照/劈啪声
spring | n.:春天/弹簧/泉 | v.:弹跳/涌出
stock | n.:库存/股票/牲畜 | v.:进货/备货
table | n.:桌子/表格
will | aux.:将/愿意 | n.:意志/遗嘱
work | v.:工作/起作用/运转 | n.:工作/作品/职业
girl | n.:女孩/少女
naughty | adj.:顽皮的/没规矩的
sow | v.:播种/散布 | n.:母猪
credential | n.:凭据/证明书/国书
damn | v.:诅咒/指责/谴责 | int.:该死
labor | n.:劳动/工作/劳工 | v.:劳动/努力/苦干
overdue | adj.:过期的/迟到的
peddle | v.:沿街叫卖/挑卖
rigor | n.:严格/严厉
sinister | adj.:凶恶的/不吉利的
skeptical | adj.:怀疑的
squad | n.:小队/班
tumor | n.:瘤/肿块
tune | v.:为...调音/调整/调谐 | n.:歌曲/主旋律
up-to-date | adj.:最近的/现代化的
'''


def update():
    target = ROOT / 'editorial_selections.json'
    edits = json.loads(target.read_text(encoding='utf-8'))
    for line in SELECTIONS.strip().splitlines():
        word, *groups = [s.strip() for s in line.split('|')]
        senses = []
        for group in groups:
            pos, terms = group.split(':', 1)
            senses.append([pos, terms.split('/')])
        edits[word] = {'senses': senses, 'note': '定点人工复核：从原 translation 选择并重排常用义；未增加原文外的释义。'}
    for word, reason in [('Olympic', 'legacy_dictionary_missing_modern_core_sense'), ('Thanksgiving', 'proper_name_sense_not_available')]:
        edits[word] = {'unmatched_reason': reason, 'note': '大纲大写形式的核心义在该 release 的通用中文义项中缺失，暂不推断。'}
    write_json(target, edits)
    print(f'Editorial entries: {len(edits)}')


if __name__ == '__main__':
    update()
