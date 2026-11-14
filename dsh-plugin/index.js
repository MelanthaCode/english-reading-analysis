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

const SYSTEM_PROMPT = (skillBody) => `${skillBody}

## 本次调用方式

你在一个面板里被直接调用：用户看不到对话过程，只会看到你的输出被渲染出来。
- 只输出 Markdown 正文。不要前言、不要说"下面是分析"、不要解释你在做什么。
- 不要用代码块围栏包裹整篇内容，不要输出 HTML。
- 每篇文章独立成块，块内顺序固定：原文＋译文 → 题目·选项·答案 → 作答对错分析 → 长难句拆解。缺失的环节直接省略。
- 不要提"已生成 PDF"或"是否下载"，导出由用户自己决定。`

export function apply(ctx) {
  const readSkill = () => readFileSync(join(skillDir, 'SKILL.md'), 'utf8')
  const skillBody = parseFrontmatter(readSkill()).body

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
        system: SYSTEM_PROMPT(skillBody),
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

  const renderPdf = async (req, res) => {
    if (req.method !== 'POST') return sendJson(res, 405, { error: 'method not allowed' })

    let payload
    try {
      payload = JSON.parse(await readBody(req, 32 * 1024 * 1024))
    } catch {
      return sendJson(res, 400, { error: 'invalid JSON body' })
    }

    const html = String(payload?.html || '')
    if (!html.trim()) return sendJson(res, 400, { error: 'empty html' })

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

  const ROUTES = [
    { path: `${ROUTE_PREFIX}/health`, handler: health },
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
