# 版式与 PDF 输出

## 0. 文档元信息

标题、副标题、页脚、文件名**只写文章主题与用途**，不携带来源身份信息：

| 不要写 | 改成 |
|---|---|
| 某中学 2025–2026 学年第一学期期中测试 · 初三英语 | 英语阅读分析：社交比较与量子计算 |
| 页脚：某中学 · 初三英语 · 补充阅读 E/F | 页脚：英语阅读分析 · 文章翻译与长难句拆解 |
| 文件名：某分校期中英语_…pdf | 文件名：英语阅读分析-文章主题.pdf |

原卷页码（如「第 11 页/共 13 页」）、考场须知、校徽一律不出现在成品里。篇号（Passage A/B 或第一篇/第二篇）与题号可以保留，因为它们是定位锚点。

## 1. 页面规格

| 项 | 值 |
|---|---|
| 纸张 | A4 210×297mm |
| 页边距 | 13mm（上下 12–13mm） |
| 中文 | Songti SC / PingFang SC / Noto Serif CJK SC，正文 10.2–10.5pt，行高 1.55–1.6 |
| 英文 | Georgia / Times New Roman，10–10.2pt，行高 1.6–1.7 |
| 高亮 | 底 `#ffe9a8` + 序号角标 |
| 成分下划线 | 主语蓝、谓语绿、宾语橙、定语从句紫、状语/引导红 |
| 页脚 | 文档标识；可选页码 |

## 2. CSS 骨架

```css
@page { size: A4; margin: 13mm; }
body{font-family:"Songti SC","PingFang SC",serif; font-size:10.4pt; line-height:1.56;}
mark{background:#ffe9a8; box-shadow:inset 0 -1px 0 #e8c65a;}
sup.no{font-size:7.4pt; background:#ffe9a8; border:1px solid #e8c65a; border-radius:50%;}

/* 原文段落：整段不跨页，避免英文与译文被拆到两页 */
.para{break-inside:avoid;}

/* 句中成分：浅底 + 文字标签 */
.seg{display:inline-flex; flex-direction:column; align-items:center; margin:0 3.4px 5px 0;}
.seg .t{padding:0 1px 1px; border-bottom:2px solid #999; white-space:nowrap; font-size:9pt;}
.seg .l{font-family:"PingFang SC",sans-serif; font-size:6.8pt; color:#6b7078; margin-top:1.5px; white-space:nowrap;}
.c-s .t{border-bottom-color:#2f6fdb} .c-v .t{border-bottom-color:#0f9d58}
.c-o .t{border-bottom-color:#e8710a} .c-d .t{border-bottom-color:#8e44ad}
.c-a .t{border-bottom-color:#d93025} .c-l .t{border-bottom-color:#00838f}

/* 框架表：fixed 布局是防溢出的关键 */
table.fr{width:100%; border-collapse:collapse; table-layout:fixed;}
table.fr th{width:29mm; text-align:right; font-size:8.1pt; line-height:1.24;
            border-right:2px solid #c9ced6; padding:1.1mm 2mm 1.1mm 0;}
table.fr td{padding:0.75mm 2mm 0.75mm 2.6mm; font-size:9pt;}

/* 卡片与题块 */
.card,.q{border:1px solid #d9dde3; border-radius:4px; padding:2.2mm 3mm;
         margin:0 0 2.6mm; break-inside:avoid;}

/* 标题不要孤行 */
h3.blk{break-after:avoid; page-break-after:avoid; border-bottom:1.5px solid #c9ced6;}
h2.part{break-before:page;}
```

完整可套用的骨架见 `assets/template.html`。

## 3. 分页配方

- 第一篇的 `h2` **不要**加 `break-before: page`，否则首页只剩标题。
- 第二篇及其后加 `break-before: page`，让每篇文章各起一页。
- 卡片、题块 `break-inside: avoid`；小节标题 `break-after: avoid`。
- 段落 `break-inside: avoid`，避免英文与译文分居两页；但整页尾部出现大面积空白时，说明该段确实放不下，此时宁可让整段移到下一页，也不要拆分句子。
- 页面出现"只剩一段说明"的孤页时，把该说明移到所属文章末尾，而不是加更多分页。

## 4. 渲染

```bash
python3 scripts/render_pdf.py 输入.html 输出.pdf
```

先自检浏览器是否被识别（macOS / Linux / Windows 通用）：

```bash
python3 scripts/render_pdf.py --check
```

输出形如 `browser: C:\Program Files\Google\Chrome\Application\chrome.exe` 即可渲染；若为 `NOT FOUND`，用 `--chrome` 显式指定：

```bash
python3 scripts/render_pdf.py 输入.html 输出.pdf --chrome "C:\Program Files\Google\Chrome\Application\chrome.exe"
```

脚本会依次尝试：Windows 注册表 App Paths → `Program Files` / `Program Files (x86)` / `%LOCALAPPDATA%` 下的 Chrome、Edge、Chromium、Brave → PATH 里的 `chrome.exe` / `msedge.exe`。**Chrome 装在默认位置时通常不在 PATH，靠的就是前两步。**

等价手动命令（macOS）：

```bash
mkdir -p /tmp/chrome-headless
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --headless=new --disable-gpu --no-sandbox \
  --user-data-dir=/tmp/chrome-headless \
  --no-pdf-header-footer --virtual-time-budget=8000 \
  --print-to-pdf=输出.pdf "file:///绝对路径/输入.html"
```

等价手动命令（Windows，PowerShell）：

```powershell
New-Item -ItemType Directory -Force "$env:TEMP\chrome-headless" | Out-Null
& "C:\Program Files\Google\Chrome\Application\chrome.exe" `
  --headless=new --disable-gpu --no-sandbox `
  --user-data-dir="$env:TEMP\chrome-headless" `
  --no-pdf-header-footer --virtual-time-budget=8000 `
  --print-to-pdf="输出.pdf" "file:///C:/绝对路径/输入.html"
```

Windows 的 `file://` URI 必须是 `file:///C:/...` 形式（三个斜杠 + 正斜杠），中文与空格会被百分号编码；直接传 `C:\...` 给 Chrome 会打不开。

等价手动命令（Linux）：

```bash
mkdir -p /tmp/chrome-headless
google-chrome \
  --headless=new --disable-gpu --no-sandbox \
  --user-data-dir=/tmp/chrome-headless \
  --no-pdf-header-footer --virtual-time-budget=8000 \
  --print-to-pdf=输出.pdf "file:///绝对路径/输入.html"
```

## 5. 已知坑

| 现象 | 原因 | 处理 |
|---|---|---|
| `Failed to create a unique user data directory` | 无头模式没有可用用户目录 | 显式传 `--user-data-dir=/tmp/chrome-headless` |
| `no Chrome/Chromium/Edge found`（Windows 最常见） | Chrome/Edge 默认安装位置不在 PATH | 脚本已内置 Windows 路径探测；仍失败则 `--chrome "C:\...\chrome.exe"` |
| 表格内容超出右边框被裁 | auto 布局下 `nowrap` 片段把表撑宽 | `table-layout: fixed` + `td` 右侧留 padding |
| 标题孤零零留在页底 | 缺少 break-after | `break-after: avoid` |
| 首页只剩标题/图例 | 第一篇也加了 break-before | 只给第二篇起加 |
| 英文与译文被拆到两页 | 段落未设 break-inside | 段落 `break-inside: avoid` |
| 某页几乎空白 | 卡片或段落过高，avoid 导致整体下移 | 微调内边距/行高（0.2–0.4mm 级）后重渲染 |
| `Bad bounding box in Type 3 glyph` 警告 | 圈号等特殊字形 | 无害，可忽略 |

## 6. 验收

1. `pdfinfo`：页数符合预期，页面 A4。
2. `pdftoppm -png -r 100` 逐页转图，人工检查：无溢出、无裁切、无孤行标题、无大面积空白页。
3. `pdftotext` 搜索关键句，确认文字没有被图片化或丢失。
