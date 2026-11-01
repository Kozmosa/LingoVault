"""Refresh README statistics and attribution after building and verifying."""
import json
from parse_outline import ROOT, OUT


def write_docs():
    stats = json.loads((OUT / 'build_stats.json').read_text(encoding='utf-8'))
    curated = json.loads((ROOT / 'curated.json').read_text(encoding='utf-8'))
    verify = (OUT / 'verify.txt').read_text(encoding='utf-8').strip()
    license_text = (ROOT / '.cache/LICENSE').read_text(encoding='utf-8').strip()
    archive = json.loads((ROOT / '.cache/download_manifest.json').read_text(encoding='utf-8'))[0]
    total = stats['total']
    readme = f'''# CET 词表数据

## 结果

- 实际词目 **{total}**：四级 **{stats['level4']}**、★ 六级新增 **{stats['level6']}**。
- meaning：**{stats['meaning_count']}/{total}（{stats['meaning_count']/total:.2%}）**；phonetic：**{stats['phonetic_count']}/{total}（{stats['phonetic_count']/total:.2%}）**。
- unmatched：**{stats['unmatched_count']}**。全部记录见 [unmatched.json](out/unmatched.json)。
- 人工覆盖 **{len(curated)}** 条，其中同形异义 **154** 条（75 组）。复核表保留原来的 80 个 id，四级、六级各 40，见 [review_sample.md](out/review_sample.md)。

## 大纲计数

大纲说明与末页标称 5418；PDF 左列实际为 **5377 个印刷行**：第 21–148 页每页 42 行，末页 1 行。PyMuPDF 与 pypdf 独立计数一致。按用户确认，以 5377 为准；verify 仅提示标称差异，不再判失败。

右侧是派生词列，末页 2551 位于右列下方，并非六级数量。★ 在词表内实际出现 1263 次。右列单元解析为 2519，另存审计，不作为主词加入。

解析从 outline.txt 读取词形，以同目录 PDF 补回文本丢失的列位置和上标关系。双拼写归入 alts；同形异义分列且保留原编号。完整证据见 [逐页统计](out/parse_stats.json)、[独立计数](out/pypdf_counts.json)、[主词原行](out/source_rows.json)、[派生词清单](out/excluded_derivatives.json)、[差异记录](out/source_discrepancy.md)。

## 运行

Python 3.11+；解析依赖已有的 pymupdf、pypdf。从仓库根目录用 PowerShell 7 执行：

```powershell
# 首次准备源数据
python -X utf8 tools/cet/download_ecdict.py
python -X utf8 tools/cet/parse_outline.py
python -X utf8 tools/cet/audit_layout.py

# 编辑 curated.json 后，运行这四步
python -X utf8 tools/cet/build_dataset.py
python -X utf8 tools/cet/make_review_sample.py
python -X utf8 tools/cet/verify.py
python -X utf8 tools/cet/write_docs.py
```

已有缓存时可以离线重建。下载位于 .cache/，原 .gitignore 保留。没有应用运行时依赖，也不执行 git 操作。

## 合并与字段

优先级：**curated.json → ECDICT + editorial_selections.json**。

- curated.json 是人工编写的覆盖层，以 `(word, homograph)` 区分记录；普通词省略 homograph。每条只含 word、可选 homograph、phonetic、meaning、senses。匹配后直接使用这三个展示字段，不再受 ECDICT 旧词义或领域标签限制。
- 154 条同形异义根据大纲相邻派生词、常见词典顺序及英语知识编写，如 lie#1→liar、patient#1→patience、lead#1→leader；wind#1 风 / wind#2 缠绕，minute#1 分钟 / minute#2 微小的。编号与 id 保持不变。这是人工语义编排，并非大纲给出的释义。
- 其余人工补全覆盖 app、am、cliché、résumé、Internet、smartphone 等；也修正旧词义和样本措辞，例如 commend→表扬/推荐，Medicare→美国老年人等的公共医疗保险，jetlag→时差反应，coup→政变，portray→描绘/刻画/扮演。
- 常用义覆盖还包括 commit→犯（罪）/承诺/投入、schedule→日程表/计划/安排、truck→卡车、zip→拉链/拉上拉链/快速移动。样本同步修正 abnormal、labor、overdue、rigor 等的中文措辞，以及 coconut、overdue 的英式读音。
- 扩查修正 feature→特征/特色、refer→提及/参考/指的是、harness→利用/驾驭、outlaw→宣布非法/禁止等常用义；精简 preface、combat、plead、respond 等的重复释义。discourse 保留话语/论述/交谈，删除旧词典中妨碍理解的冷僻释义与冗长描述。
- ECDICT 匹配：精确小写（含源词表 alts）→ exchange 反查 → 去连字符/括号变体。人工词条直接覆盖，不必为其缺失拼写扫描词典。
- ECDICT 释义删除带领域/网络标签的义项及续行，合并词性，去除英文交叉引用、古旧标签及重复义项，再按词性频率和定点选择排序。
- meaning 包括词性、空格、标点在内最多 28 字符；senses 按词性分组，每组最多 4 义。括号统一为全角。
- curated 的音标统一采用英式 IPA，不带两侧斜杠；其余沿用 ECDICT 英式优先字段并统一旧符号。
- freq 采用 ECDICT 的 BNC 正整数排名。exchange 只用于 ECDICT 条目，按保留词性选取；curated 不继承可能混淆同形异义的词形变化。
- 原有 94 条 editorial_selections 为 ECDICT 义项筛选；curated 覆盖同名记录。日常修改直接编辑 curated.json，无需执行旧的 refine_editorial.py。

数据来源区分见 [match_audit.json](out/match_audit.json)。未覆盖部分仍继承旧词典的措辞和义项排序，后续可继续用 curated 精修。

## 来源

ECDICT 使用官方 [1.0.28 SQLite release](https://github.com/skywind3000/ECDICT/releases/tag/1.0.28)。压缩包 SHA-256：`{archive['sha256']}`。另缓存的官方 master CSV 只用于首轮对照，没有合并进产物。下载清单保存在 .cache/。

[ATTRIBUTION.md](../../public/data/ATTRIBUTION.md) 保留 ECDICT MIT 全文，并说明人工覆盖与官方词表各自的来源。

## 校验输出

verify 只保留 5 项：实际总数与 ★ 数、id 连续、文本噪音、释义覆盖（最多 5 条未匹配且有原因）、释义长度。音标覆盖率只输出统计；5418 与实际 5377 的差异仅作提示。

```text
{verify}
```
'''
    (ROOT / 'README.md').write_text(readme, encoding='utf-8')
    attribution = f'''# CET 数据来源

词形、★ 级别、顺序及同形异义编号来自教育部考试中心《全国大学英语四、六级考试大纲（2016 年修订版）》词表，使用仓库提供的 outline.pdf / outline.txt（PDF 第 20–149 页）。

大纲标称 5418，实际印刷主词行数 5377；本数据按用户确认的实际计数交付：四级 4114、★ 六级新增 1263。原大纲不包含释义或音标。

## 词典与人工覆盖

- 基础中文释义、音标、词形和 BNC 排名来自 [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT) 的 [1.0.28 SQLite release](https://github.com/skywind3000/ECDICT/releases/tag/1.0.28)，使用 MIT 许可。
- `tools/cet/curated.json` 含 {len(curated)} 条由 Codex 按用户要求运用英语知识编写的中文释义与英式音标，包含全部 154 条同形异义记录。此层优先于 ECDICT，并非官方大纲释义或 ECDICT 原文。
- ECDICT 基础数据经过领域义删除、去重、词性分组及长度控制。各条实际来源见 `tools/cet/out/match_audit.json`。
- 大纲内容权利归原权利人；ECDICT 的 MIT 许可适用于其自身数据，不代表大纲 PDF 的许可。
- 下载包 SHA-256：`{archive['sha256']}`。

上游 [LICENSE](https://github.com/skywind3000/ECDICT/blob/master/LICENSE) 原文：

```text
{license_text}
```
'''
    (ROOT.parents[1] / 'public/data/ATTRIBUTION.md').write_text(attribution, encoding='utf-8')
    print('Updated README.md and public/data/ATTRIBUTION.md')


if __name__ == '__main__':
    write_docs()
