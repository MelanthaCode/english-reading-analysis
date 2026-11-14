// Host half of dsh-skill-english-reading.
//
// Two jobs:
//   1. Register the skill into the Harness skill catalog.
//   2. Serve same-origin HTTP routes the panel calls directly:
//        GET  /x-english-reading/health  -> registration probe
//        POST /x-english-reading/analyze -> streams Markdown as SSE
//        POST /x-english-reading/pdf     -> renders an A4 PDF, on demand
//
// Why HTTP routes: a hand-written JS plugin cannot register a Typert Remote
// endpoint (those descriptors are code-generated), but the Host's web server is
// an ordinary Node HTTP carrier the panel can fetch from the same origin.

import { spawn } from 'node:child_process'
import { readFileSync, writeFileSync } from 'node:fs'
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const packageDir = dirname(fileURLToPath(import.meta.url))
const skillDir = join(packageDir, 'skills', 'english-reading-analysis')
const ROUTE_PREFIX = '/x-english-reading'
const PYTHON = process.platform === 'win32' ? 'python' : 'python3'
const BOOT_REPORT = '/tmp/english-reading-boot.json'
const EXT_TEXT = ['txt', 'md', 'markdown', 'text', 'csv']

// Only services that must exist for apply() to be meaningful go here.
// `webServer` is acquired with ctx.inject() below: that callback form is what the
// shipped community plugins use, and it waits for the service without turning a
// missing one into a plugin that can never load.
export const inject = ['skills']

function parseFrontmatter(raw) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?/.exec(raw)
  if (!match) return { meta: {}, body: raw }
  const meta = {}
  for (const line of match[1].split(/\r?\n/)) {
    const entry = /^([A-Za-z0-9_-]+):\s*(.*)$/.exec(line)
    if (!entry) continue
    let value = entry[2].trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    meta[entry[1]] = value
  }
  return { meta, body: raw.slice(match[0].length) }
}

function readBody(req, limit = 8 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const chunks = []
    let size = 0
    req.on('data', (chunk) => {
      size += chunk.length
      if (size > limit) {
        reject(new Error('body too large'))
        req.destroy()
        return
      }
      chunks.push(chunk)
    })
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')))
    req.on('error', reject)
  })
}

function sendJson(res, status, payload) {
  res.writeHead(status, {
    'content-type': 'application/json; charset=utf-8',
    'cache-control': 'no-store',
  })
  res.end(JSON.stringify(payload))
}

/** The default-model selection has no single documented field spelling; accept both. */
function resolveModel(selection) {
  if (!selection) return null
  const provider = selection.provider ?? selection.providerId
  const model = selection.model ?? selection.modelId
  if (!provider || !model) return null
  return { provider, model, reasoningEffort: selection.reasoningEffort }
}

/** The skill's own print stylesheet: the panel and the PDF must share it. */
function readTemplateCss() {
  const raw = readFileSync(join(skillDir, 'assets', 'template.html'), 'utf8')
  const match = /<style>([\s\S]*?)<\/style>/i.exec(raw)
  return match ? match[1] : ''
}

const HTML_CONTRACT = `
## 输出格式（必须严格遵守）

只输出一个 **HTML 片段**，不要 \`\`\` 代码围栏、不要 <html>/<head>/<body>、不要 Markdown。
样式已经由模板提供，你只需要用下面这些现成的 class：

- 篇标题：<h2>文章 N<span class="en">主题（中文）</span></h2>
- 每段：<div class="para"><p class="en">英文原文</p><p class="zh">中文译文</p></div>
- 长难句在原文里用 <mark>句子</mark><sup class="no">①</sup> 标出，编号与后面卡片对应
- 分块小标题：<h3 class="blk">题目 · 选项 · 答案<span class="n">1–3</span></h3>
- 题目卡片：
  <div class="q">
    <div class="q-h"><span class="qn">1</span><span class="q-en">题干英文</span></div>
    <div class="q-zh">题干中文</div>
    <div class="opts">
      <div class="opt"><b>A</b>选项英文　<i>选项中文</i></div>
      ... B C D
    </div>
    <div class="ans"><span class="key">答案 A</span>定位与解析</div>
  </div>
- 作答对错表：<table class="dat"> 表头 题号/作答/参考答案/判定/错因；勾用 <td class="ok">✓</td>，叉用 <td class="no">✗</td>
- 长难句卡片（结构固定，不得增删层级）：
  <div class="card">
    <div class="card-h"><div class="num">1</div><div class="where">第 N 段 ｜ N 词 ｜ 结构类型</div></div>
    <div class="src">原句照录</div>
    <table class="fr">
      <tr><th>主句</th><td>
        <span class="seg c-s"><span class="t">主语</span><span class="l">主语</span></span>
        <span class="seg c-v"><span class="t">谓语</span><span class="l">谓语</span></span>
        <span class="seg c-o"><span class="t">宾语</span><span class="l">宾语</span></span>
      </td></tr>
      <tr><th>定语从句</th><td>
        <span class="seg c-d"><span class="t">从句原词</span><span class="l">定语从句</span></span>
      </td></tr>
    </table>
    <p class="zhs">整句中文</p>
    <p class="note"><b>要点</b>结构要点</p>
    <div class="kp"><b>高频考点</b>考点</div>
  </div>

  卡片固定规则：
  1. table.fr 第一行的 th 必须是「主句」；之后每行对应句子里的一层从属或并列结构，th 写层级名（定语从句 / 宾语从句 / 状语从句 / 同位语从句 / 并列分句 …），顺序与这些结构在原句中的先后一致。
  2. 每行内按意群切分：一个意群一个 .seg，.t 是原词（顺序不变、不改写），.l 是成分名。
  3. .seg 的 class 对应成分：c-s 主语 / c-v 谓语 / c-o 宾语或表语 / c-d 定语从句 / c-a 状语或插入语 / c-l 补语。
  4. 只拆到意群级别，不要把名词短语、介词短语内部再拆成多个 .seg。
  5. .src 照录原句，整句在正文里只出现一次（正文用 <mark> 标出并配 <sup class="no"> 编号）。
  6. 同一份材料重复分析时，卡片数、层级顺序、标签用词必须保持一致。

没有作答信息时不要输出作答对错表；没有题目时不要输出题目块。
`

const SYSTEM_PROMPT = (skillBody, sentenceRules) => `${skillBody}
${HTML_CONTRACT}

## 长难句拆解细则（必须遵守）

${sentenceRules}

## 结构固定性（重要）

同一段材料反复分析，产出的结构必须一致：卡片数、左栏层级顺序、成分标签用词都按上面的细则来，不要每次换一种切分方式或换一套标签。
## 本次调用方式

你在一个面板里被直接调用：用户看不到对话过程，只会看到你的输出被渲染成和打印稿一样的版式。
- 第一行就从 <h2> 开始，结尾不要加解释、不要说"以上"。
- 不要提"已生成 PDF"或"是否下载"，导出由用户自己决定。`

export function apply(ctx) {
  const readSkill = () => readFileSync(join(skillDir, 'SKILL.md'), 'utf8')
  // The long-sentence rules are what actually stabilise the card structure:
  // without them every run invented its own table layout.
  const readReference = (name) => {
    try {
      return readFileSync(join(skillDir, 'references', name), 'utf8')
    } catch {
      return ''
    }
  }
  // Built per request so editing SKILL.md or the references needs no restart.
  const buildSystemPrompt = () =>
    SYSTEM_PROMPT(parseFrontmatter(readSkill()).body, readReference('sentence-analysis.md'))

  ctx.effect(() => {
    const { meta, body } = parseFrontmatter(readSkill())
    return ctx.skills.register({
      name: meta.name || 'english-reading-analysis',
      description: meta.description || '把英语阅读材料转成中文分析。',
      content: body,
      source: 'custom',
      resourceBase: { kind: 'directory', path: skillDir },
      invocation: { modelInvocable: true, userInvocable: true },
    })
  })

  const getService = (name) => {
    try {
      return typeof ctx.get === 'function' ? ctx.get(name) : undefined
    } catch {
      return undefined
    }
  }

  const bootReport = {
    at: new Date().toISOString(),
    plugin: 'dsh-skill-english-reading',
    hasGet: typeof ctx.get === 'function',
    hasInject: typeof ctx.inject === 'function',
    skillDir,
    skillRegistered: true,
    routesRegistered: 0,
  }

  const writeReport = () => {
    try {
      writeFileSync(BOOT_REPORT, JSON.stringify(bootReport, null, 2))
    } catch {
      /* diagnostics are best-effort */
    }
  }

  const llmService = () => getService('llm')
  const modelService = () => getService('agentDefaultModel')

  const analyze = async (req, res) => {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' })

    let payload
    try {
      payload = JSON.parse(await readBody(req))
    } catch {
      return sendJson(res, 400, { error: 'invalid JSON body' })
    }

    const text = String(payload?.text || '').trim()
    if (!text) return sendJson(res, 400, { error: 'empty text' })

    const llm = llmService()
    const model = modelService()
    if (!llm || !model) return sendJson(res, 503, { error: 'model services unavailable' })

    let selection
    try {
      selection = resolveModel(model.currentSelection())
    } catch (error) {
      return sendJson(res, 503, { error: `cannot read default model: ${error?.message || error}` })
    }
    if (!selection) return sendJson(res, 503, { error: 'no default model configured' })

    res.writeHead(200, {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-store',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    })

    const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`)
    const controller = new AbortController()
    req.on('close', () => controller.abort())

    try {
      const options = {
        provider: selection.provider,
        model: selection.model,
        system: buildSystemPrompt(),
        messages: [{ role: 'user', content: [{ type: 'text', text: `材料如下：\n\n${text}` }] }],
        signal: controller.signal,
      }
      if (selection.reasoningEffort) options.reasoningEffort = selection.reasoningEffort

      let produced = false
      for await (const chunk of llm.stream(options)) {
        if (chunk.type === 'text-delta') {
          produced = true
          send({ delta: chunk.text })
        } else if (chunk.type === 'finish') {
          const kind = chunk.reason?.kind
          if (kind === 'error') throw new Error(chunk.reason.failure?.message || 'model error')
          if (kind === 'aborted') throw new Error('模型调用已中断')
        }
      }
      if (!produced) throw new Error('模型没有返回文本')
      send({ done: true })
    } catch (error) {
      send({ error: String(error?.message || error) })
    } finally {
      res.end()
    }
  }

  /** Run a child process and collect stdout, or throw with its stderr. */
  const runCapture = (command, args) =>
    new Promise((resolve, reject) => {
      const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] })
      let out = ''
      let err = ''
      child.stdout.on('data', (chunk) => {
        out += chunk.toString('utf8')
      })
      child.stderr.on('data', (chunk) => {
        err += chunk.toString('utf8')
      })
      child.on('error', reject)
      child.on('close', (code) => {
        if (code === 0) resolve(out)
        else reject(new Error(err.trim() || `${command} exited with ${code}`))
      })
    })

  /** .docx is a zip; word/document.xml holds the text. */
  const docxToText = async (buffer, workDir) => {
    const file = join(workDir, 'source.docx')
    await writeFile(file, buffer)
    const script = [
      'import zipfile, re, html, sys',
      'path = sys.argv[1]',
      'xml = zipfile.ZipFile(path).read("word/document.xml").decode("utf-8", "ignore")',
      'xml = xml.replace("</w:p>", "\\n").replace("</w:tr>", "\\n")',
      'text = re.sub(r"<[^>]+>", "", xml)',
      'sys.stdout.write(html.unescape(text))',
    ].join('\n')
    return runCapture(PYTHON, ['-c', script, file])
  }

  /** Text layer of a PDF, or a clear "no text layer" signal for scans. */
  const pdfToText = async (buffer, workDir) => {
    const file = join(workDir, 'source.pdf')
    await writeFile(file, buffer)
    let text = ''
    try {
      text = await runCapture('pdftotext', ['-enc', 'UTF-8', file, '-'])
    } catch (error) {
      return {
        scanned: false,
        error:
          '这台机器没有 pdftotext（poppler），无法读取 PDF 文字。' +
          'macOS 可 brew install poppler；或把内容粘贴进来。',
      }
    }
    const clean = text.replace(/\u0000/g, '').trim()
    if (clean.length < 40) {
      return {
        scanned: true,
        error:
          '这份 PDF 没有文字层（扫描件或图片导出）。面板只能处理文字，' +
          '请把它作为附件发到对话里，由我直接看图分析。',
      }
    }
    return { text: clean, kind: 'pdf' }
  }

  const renderPdf = async (req, res) => {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' })

    let payload
    try {
      payload = JSON.parse(await readBody(req, 32 * 1024 * 1024))
    } catch {
      return sendJson(res, 400, { error: 'invalid JSON body' })
    }

    const fragment = String(payload?.html || '')
    if (!fragment.trim()) return sendJson(res, 400, { error: 'empty html' })
    const title = String(payload?.title || '英语阅读分析')
    const html = `<!DOCTYPE html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${title}</title>
<style>${readTemplateCss()}</style></head>
<body>${fragment}</body></html>`

    let work
    try {
      work = await mkdtemp(join(tmpdir(), 'english-reading-'))
      const htmlPath = join(work, 'doc.html')
      const pdfPath = join(work, 'doc.pdf')
      await writeFile(htmlPath, html, 'utf8')

      const script = join(skillDir, 'scripts', 'render_pdf.py')
      const result = await new Promise((resolve) => {
        const child = spawn(PYTHON, [script, htmlPath, pdfPath], { stdio: ['ignore', 'pipe', 'pipe'] })
        let stderr = ''
        child.stdout.on('data', () => {})
        child.stderr.on('data', (chunk) => {
          stderr += chunk.toString('utf8')
        })
        child.on('error', (error) => resolve({ code: -1, stderr: String(error) }))
        child.on('close', (code) => resolve({ code, stderr }))
      })

      if (result.code !== 0) {
        return sendJson(res, 500, { error: 'PDF 渲染失败', detail: result.stderr.slice(-600) })
      }

      const pdf = await readFile(pdfPath)
      res.writeHead(200, {
        'content-type': 'application/pdf',
        'content-disposition': 'attachment; filename="english-reading-analysis.pdf"',
        'content-length': String(pdf.length),
        'cache-control': 'no-store',
      })
      res.end(pdf)
    } catch (error) {
      sendJson(res, 500, { error: String(error?.message || error) })
    } finally {
      if (work) await rm(work, { recursive: true, force: true })
    }
  }

  const health = (_req, res) => {
    const model = modelService()
    let selection = null
    try {
      selection = model ? resolveModel(model.currentSelection()) : null
    } catch (error) {
      selection = { error: String(error?.message || error) }
    }
    sendJson(res, 200, {
      ok: true,
      plugin: 'dsh-skill-english-reading',
      hasLlm: Boolean(llmService()),
      hasModel: Boolean(model),
      model: selection,
    })
  }

  // Read per request, not at apply time: editing the stylesheet then only needs a
  // page refresh instead of a host restart.
  const style = (_req, res) => {
    res.writeHead(200, { 'content-type': 'text/css; charset=utf-8', 'cache-control': 'no-store' })
    res.end(readTemplateCss())
  }

  const extract = async (req, res) => {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' })

    let payload
    try {
      payload = JSON.parse(await readBody(req, 48 * 1024 * 1024))
    } catch {
      return sendJson(res, 400, { error: 'invalid JSON body' })
    }

    const name = String(payload?.name || 'file')
    const buffer = Buffer.from(String(payload?.data || ''), 'base64')
    if (!buffer.length) return sendJson(res, 400, { error: '空文件' })

    const ext = (name.toLowerCase().match(/\.([a-z0-9]+)$/) || [])[1] || ''
    if (EXT_TEXT.includes(ext)) {
      return sendJson(res, 200, { text: buffer.toString('utf8'), kind: 'text' })
    }

    let work
    try {
      work = await mkdtemp(join(tmpdir(), 'english-reading-file-'))
      if (ext === 'docx') {
        const text = await docxToText(buffer, work)
        if (!text.trim()) return sendJson(res, 200, { text: '', kind: 'docx' })
        return sendJson(res, 200, { text: text.trim(), kind: 'docx' })
      }
      if (ext === 'pdf') {
        const result = await pdfToText(buffer, work)
        return sendJson(res, result.text ? 200 : 422, result)
      }
      return sendJson(res, 415, {
        error: `不支持的文件类型 .${ext}，目前支持 txt / md / docx / pdf`,
      })
    } catch (error) {
      return sendJson(res, 500, { error: String(error?.message || error) })
    } finally {
      if (work) await rm(work, { recursive: true, force: true })
    }
  }

  const ROUTES = [
    { path: `${ROUTE_PREFIX}/health`, handler: health },
    { path: `${ROUTE_PREFIX}/extract`, handler: extract },
    { path: `${ROUTE_PREFIX}/style.css`, handler: style },
    { path: `${ROUTE_PREFIX}/analyze`, handler: analyze },
    { path: `${ROUTE_PREFIX}/pdf`, handler: renderPdf },
  ]

  const registerAll = (webServer, via) => {
    try {
      for (const route of ROUTES) {
        ctx.effect(() => webServer.register({ kind: 'exact', path: route.path, handler: route.handler }))
      }
      bootReport.routesRegistered = ROUTES.length
      bootReport.webServerVia = via
    } catch (error) {
      bootReport.registerError = String(error?.message || error)
    }
    writeReport()
  }

  // Preferred: the callback form used by the shipped community plugins. It waits
  // for webServer and hands over a context that has it.
  if (typeof ctx.inject === 'function') {
    try {
      ctx.inject(['webServer'], (hostCtx) => {
        const webServer = (hostCtx && (hostCtx.webServer || hostCtx.get?.('webServer'))) || getService('webServer')
        if (!webServer) {
          bootReport.registerError = 'ctx.inject fired without webServer'
          writeReport()
          return
        }
        registerAll(webServer, 'ctx.inject')
      })
      return
    } catch (error) {
      bootReport.injectError = String(error?.message || error)
    }
  }

  // Fallback: the service may already be resolvable directly.
  const direct = ctx.webServer || getService('webServer')
  if (direct) {
    registerAll(direct, 'ctx.get')
  } else {
    bootReport.registerError = 'webServer not reachable (no ctx.inject, no ctx.get)'
    writeReport()
  }
}
