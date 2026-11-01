# CET 数据来源

词形、★ 级别、顺序及同形异义编号来自教育部考试中心《全国大学英语四、六级考试大纲（2016 年修订版）》词表，使用仓库提供的 outline.pdf / outline.txt（PDF 第 20–149 页）。

大纲标称 5418，实际印刷主词行数 5377；本数据按用户确认的实际计数交付：四级 4114、★ 六级新增 1263。原大纲不包含释义或音标。

## 词典与人工覆盖

- 基础中文释义、音标、词形和 BNC 排名来自 [skywind3000/ECDICT](https://github.com/skywind3000/ECDICT) 的 [1.0.28 SQLite release](https://github.com/skywind3000/ECDICT/releases/tag/1.0.28)，使用 MIT 许可。
- `tools/cet/curated.json` 含 342 条由 Codex 按用户要求运用英语知识编写的中文释义与英式音标，包含全部 154 条同形异义记录。此层优先于 ECDICT，并非官方大纲释义或 ECDICT 原文。
- ECDICT 基础数据经过领域义删除、去重、词性分组及长度控制。各条实际来源见 `tools/cet/out/match_audit.json`。
- 大纲内容权利归原权利人；ECDICT 的 MIT 许可适用于其自身数据，不代表大纲 PDF 的许可。
- 下载包 SHA-256：`ea01f76a3b3351021ce47077e89234465cc9441c8793054495320d06c0c3f3f6`。

上游 [LICENSE](https://github.com/skywind3000/ECDICT/blob/master/LICENSE) 原文：

```text
MIT License

Copyright (c) 2025 Linwei

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
