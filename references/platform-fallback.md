# 平台兜底：渲染不出来时怎么办

Windows / macOS / Linux 是**受支持并每次 CI 验证**的三个系统。但真实环境里有 WSL、Alpine、FreeBSD、Termux、锁定权限的公司电脑、只有 Safari 的 Mac——这份文档是给 Agent 的决策链：**按顺序试，每一层失败就换下一层，最后一定要交付，不能卡死。**

## 总原则

1. **PDF 是包装，不是内容。** 任务是"把英语材料转成中文分析"，不是"必须产出 PDF"。渲染彻底失败时，交付 HTML 并告诉用户怎么打印，**任务仍然算完成**。
2. **不许静默降级。** 用了哪个引擎、质量是否有差异，必须写进回复。用 weasyprint 出的版式和 Chrome 不同，用户有权知道。
3. **不许假装成功。** PDF 必须校验：文件存在、大小 > 2 KB、头部是 `%PDF`。空文件或 0 字节一律视为失败。
4. **显式路径找不到就报错**，不要悄悄换一个浏览器跑。

## 决策链（按顺序执行）

### 第 0 层：先自检

```bash
python3 scripts/render_pdf.py --check
```

看 `status:` 那一行：

| status | 含义 | 下一步 |
|---|---|---|
| `ready for PDF rendering` | Chrome 系可用 | 直接渲染，结束 |
| `ready, but DEGRADED` | 只有 weasyprint / wkhtmltopdf | 渲染，但在回复里声明版式可能有差异 |
| `NO RENDERER` | 一个都没有 | 从第 1 层开始试 |

### 第 1 层：换个路径而已（最常见）

用户机器上其实装了浏览器，只是不在默认位置：

```bash
# 指定具体可执行文件
python3 scripts/render_pdf.py in.html out.pdf --chrome "/opt/brave.com/brave/brave"

# 或通过环境变量（适合容器 / CI）
export RENDER_PDF_BROWSER="C:\Program Files\Google\Chrome\Application\chrome.exe"
```

先问用户在哪，或者按下面的位置表一个个找：

| 系统 | 常见位置 |
|---|---|
| Windows | `C:\Program Files\Google\Chrome\Application\chrome.exe`、`C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe`、`%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe` |
| macOS | `/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`、`~/Applications/...` |
| Linux | `/usr/bin/google-chrome`、`/usr/bin/chromium`、`/snap/bin/chromium`、`/usr/bin/microsoft-edge`、`/usr/bin/brave-browser`、`/opt/brave.com/brave/brave` |

### 第 2 层：装一个引擎

**能装就装，这是质量最高的兜底**（版式与 Chrome 一致）：

```bash
# macOS
brew install --cask google-chrome        # 或 chromium

# Debian / Ubuntu
sudo apt-get install -y chromium

# Alpine
apk add chromium

# 任意系统，只要有 Python
pip install weasyprint                    # 由第 3 层接住

# Node 环境已有，直接用 Playwright 自带的 Chromium
npx playwright install chromium
python3 scripts/render_pdf.py in.html out.pdf \
  --chrome "$(npx playwright install --dry-run chromium >/dev/null 2>&1; echo ~/.cache/ms-playwright/chromium-*/chrome-linux/chrome)"
```

装不了（公司电脑、无 sudo、无网络）就走第 3 层。

### 第 3 层：降级引擎

脚本已内置两个后备引擎，会自动尝试，也可以强制指定：

```bash
python3 scripts/render_pdf.py in.html out.pdf --engine weasyprint
python3 scripts/render_pdf.py in.html out.pdf --engine wkhtmltopdf
```

安装方式：

```bash
pip install weasyprint              # 需要系统库 pango/cairo；Alpine: apk add pango cairo
apt-get install -y wkhtmltopdf      # 老但分布广
```

**代价**：两者对 `@page`、`break-inside` 的支持不如 Chrome，可能出现段落跨页、卡片被切开。所以：

- 交付后必须看一眼页数和分页
- 在回复里声明："PDF 由 weasyprint 生成，分页与 Chrome 有差异，建议核对后再打印"

### 第 4 层：交付 HTML（最终兜底）

到此为止还原不出来，就**不要继续折腾 PDF**。HTML 本身就是完整可用的产物：

```bash
# 让 skill 正常产出 HTML，只是跳过渲染这一步
```

在回复里给出可操作的指引：

> 已生成 `分析.html`，在你的浏览器里打开后按 **Ctrl+P**（macOS 为 **⌘P**），目标选择"另存为 PDF"，纸张选 A4、边距选"默认"，即可得到打印版。页面已按 A4 排版。

## 各环境的具体建议

| 环境 | 建议路径 |
|---|---|
| **WSL** | 优先 `sudo apt install chromium`（原生 Linux 渲染，路径最省事）。也可用 Windows 侧 Chrome：`--chrome "/mnt/c/Program Files/Google/Chrome/Application/chrome.exe"`，但**输出路径必须是 Windows 路径**（如 `/mnt/c/Users/你/Desktop/out.pdf`），否则 Chrome 写不进去。 |
| **Alpine / 精简容器** | `apk add chromium`（体积大）或 `pip install weasyprint` + `apk add pango cairo`（更小）。无外网时用第 4 层。 |
| **FreeBSD / OpenBSD** | 无官方 Chrome。`pkg install chromium` 通常可用；否则 `pip install weasyprint`；再不行第 4 层。 |
| **ARM Linux / 树莓派** | `apt install chromium` 可用；Chromium 官方无 linux-arm 预编译包，别去下。 |
| **Android / Termux** | `pkg install chromium` 不稳定。直接走第 4 层：生成 HTML，用手机浏览器"打印 → 另存为 PDF"。 |
| **只有 Safari 的 Mac** | Safari 没有命令行打印开关。装 Chrome，或用 `weasyprint`，或第 4 层。 |
| **锁定的公司电脑** | 通常无法装东西。先试第 1 层（系统里多半已有 Edge/Chrome），不行就第 4 层，并说明这是环境限制而非 skill 缺陷。 |
| **远程 / CI 无浏览器** | 容器里 `apt-get install -y chromium` 最稳；或在本地渲染后上传产物。 |

## 给 Agent 的收尾模板

无论走到哪一层，回复里都要交代清楚：

- 走通了：`PDF 已生成（引擎：chrome / weasyprint），共 N 页。`
- 降级了：`PDF 已生成，引擎为 weasyprint，分页可能与 Chrome 有差异，建议打印前核对。`
- 兜底了：`本机没有可用的渲染引擎（已尝试：默认路径、PATH、weasyprint、wkhtmltopdf）。已交付 HTML；在浏览器中按 Ctrl+P 另存为 PDF 即可，页面已按 A4 排版。`

## 退出码（脚本可机读）

| 码 | 含义 | Agent 应该做什么 |
|---|---|---|
| 0 | 成功 | 继续，按上面的模板说明引擎 |
| 2 | 输入 HTML 不存在 | 检查路径，别重试 |
| 3 | 找不到任何引擎 | 按本文件第 1→4 层逐级尝试 |
| 4 | 渲染超时 | 加 `--timeout`，或换第 4 层 |
| 5 | 没产出 PDF | 读 stderr，换引擎；仍失败走第 4 层 |
