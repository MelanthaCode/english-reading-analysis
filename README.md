# English Reading Analysis · 英语阅读分析

一个给 AI Agent 用的技能：把一篇英语文章或一份英语试卷，整理成**可打印的双语分析文档**——全文翻译、题目选项答案、作答对错分析、长难句句法拆解，输出 A4 PDF。

适用于 Claude Code、Codex、DeepSeek Harness 等支持 Agent Skills（`SKILL.md` + 资源目录）的工具。

## 输出结构

每篇文章独立成块，块内顺序固定：

```
文章 1：<主题>
  1. 原文 + 译文          逐段对照，先原文后译文
  2. 题目 · 选项 · 答案    题干与选项中英对照、答案、原文定位解析
  3. 作答对错分析          仅在提供作答时：逐题对错、错因归类、纠正提示
  4. 长难句拆解            左栏句法框架 / 右栏原词，彩色下划线标成分
```

多篇文章按同样结构逐篇重复；没有的环节直接省略。

## 特点

- **单次呈现**：一个长句只出现一次，左侧标句子/从句级框架，右侧保留原词序，词下用彩色下划线标出主谓宾与从句角色——不重复三遍同一句话。
- **四段式**：文章 → 题目答案 → 对错分析 → 长难句，逐篇成块。
- **可直接打印**：HTML + headless Chrome 渲染 A4 PDF，卡片和题块不会跨页断开，标题不会孤行。
- **无身份噪声**：标题、页脚、文件名只写文章主题，不带学校、考试名称、原卷页码。

## 安装

把整个目录放到你的 Agent 技能目录下（目录名即技能名）：

```bash
git clone <this-repo> ~/.claude/skills/english-reading-analysis   # Claude Code
# 或
git clone <this-repo> ~/.codex/skills/english-reading-analysis    # Codex
# 或
git clone <this-repo> ~/.dsh/skills/english-reading-analysis      # DeepSeek Harness
```

通用做法：放在项目根的 `.agents/skills/english-reading-analysis`（大多数支持 Agent Skills 约定的工具会扫描该路径）。

## 依赖

| 用途 | 需要 |
|---|---|
| 渲染 PDF | Google Chrome / Chromium / Edge（任一） |
| 读取扫描件 | `pdftoppm`（poppler） |
| 运行脚本 | Python 3.9+ |

```bash
brew install poppler            # macOS 读扫描件用
python3 scripts/render_pdf.py 输入.html 输出.pdf
```

## 用法示例

> 把这篇英语文章全文翻译，复杂长难句高亮，文末单独拆解。

> 这份期中英语试卷（扫描件）：逐篇翻译，题目和选项都要中英对照，给出答案和解析，再按每篇做长难句分析。

> 这是我批改过的卷子，帮我把错题分析一下，错因归类，再针对每篇的难句做拆解。

## 目录

```
english-reading-analysis/
├── SKILL.md                       # 入口：结构、流程、验收清单
├── references/
│   ├── sentence-analysis.md       # 长难句：分析顺序、从句分类、展示规则、范例
│   ├── paper-workflow.md          # 试卷：题块字段、题型解法、干扰项、错因分类
│   └── layout-pdf.md              # 版式：CSS、分页、渲染命令、排错
├── assets/
│   └── template.html              # 可直接套用的 HTML 模板
└── scripts/
    └── render_pdf.py              # HTML → A4 PDF
```

## 设计取舍

- **为什么不用 Word**：高亮、词下彩色下划线、卡片级分页控制在 Word 里很难稳定，HTML + 打印更可控。
- **为什么段落不跨页**：英文原文与中文译文必须在一起看，拆到两页会打断对照阅读。
- **为什么句法框架只到句子/从句级**：把名词短语内部也拆成层级会让左栏膨胀，反而看不清主干。

## License

MIT
