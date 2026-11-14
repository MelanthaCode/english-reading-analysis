// Client half of dsh-skill-english-reading.
//
// A sidebar entry plus its main panel. The panel talks to the Host half over two
// same-origin routes (see index.js): /x-english-reading/analyze streams Markdown,
// /x-english-reading/pdf renders a PDF only when the user asks for one.

window.__ModuleLoader__.load({
  id: 'dsh-skill-english-reading',

  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PANEL_ID = 'english-reading'
    const API = '/x-english-reading'

    const TEXT_ZH = {
      title: '英语阅读分析',
      subtitle: '英语文章翻译成中文、拆解长难句、给出选择题答案与解析，也可以核对已作答的卷子。',
      zonePlaceholder: '把英文粘贴到这里，或把 .txt / .md 文件拖进这个框',
      chars: '字符',
      clear: '清空',
      start: '开始分析',
      stop: '已停止',
      running: '分析中…',
      note: 'PDF、扫描件、照片请在对话里作为附件发送；这里适合粘贴文字。',
      empty: '先粘贴英文，或拖入一个文本文件。',
      fileLoaded: '文件已读入',
      unsupportedFile: '只支持文本文件（.txt / .md）。PDF 或图片请在对话里作为附件发送。',
      readFailed: '读取文件失败。',
      failed: '失败',
      download: '下载 PDF',
      preparing: '正在渲染 PDF…',
      again: '再分析一篇',
      ready: '分析完成',
      paged: '已下载',
    }

    const TEXT_EN = {
      title: 'English Reading Analysis',
      subtitle: 'Translate English passages into Chinese, break down long sentences, and answer multiple-choice questions with explanations — or check a paper you already answered.',
      zonePlaceholder: 'Paste the English here, or drop a .txt / .md file into this box',
      chars: 'characters',
      clear: 'Clear',
      start: 'Analyse',
      stop: 'Stopped',
      running: 'Analysing…',
      note: 'Attach PDFs, scans or photos in the conversation; this panel is for pasted text.',
      empty: 'Paste the English first, or drop a text file.',
      fileLoaded: 'File loaded',
      unsupportedFile: 'Text files only (.txt / .md). Attach PDFs or images in the conversation.',
      readFailed: 'Could not read that file.',
      failed: 'Failed',
      download: 'Download PDF',
      preparing: 'Rendering PDF…',
      again: 'Analyse another',
      ready: 'Done',
      paged: 'Downloaded',
    }

    const styles = {
      page: {
        height: '100%',
        overflowY: 'auto',
        padding: '28px 32px 56px',
        color: 'var(--dsw-alias-label-primary)',
        background: 'var(--dsw-alias-bg-base)',
        boxSizing: 'border-box',
      },
      inner: { maxWidth: 820, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
      title: { fontSize: 20, fontWeight: 600, margin: 0 },
      subtitle: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 13, lineHeight: 1.65 },
      zone: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: 240,
        borderRadius: 14,
        border: '1.5px dashed var(--dsw-alias-border-l2)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'border-color 120ms ease, background 120ms ease',
      },
      zoneInput: {
        flex: 1,
        width: '100%',
        minHeight: 180,
        padding: '18px 20px 8px',
        border: 'none',
        outline: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-label-primary)',
        fontFamily: 'inherit',
        fontSize: 14,
        lineHeight: 1.7,
        resize: 'none',
        boxSizing: 'border-box',
      },
      zoneFooter: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px 12px',
        fontSize: 12,
        color: 'var(--dsw-alias-label-secondary)',
      },
      linkButton: {
        border: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-brand-primary)',
        font: 'inherit',
        fontSize: 12,
        cursor: 'pointer',
        padding: 0,
      },
      note: { margin: 0, fontSize: 12, lineHeight: 1.65, color: 'var(--dsw-alias-label-secondary)' },
      actions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
      primary: {
        padding: '8px 18px',
        borderRadius: 8,
        border: '1px solid var(--dsw-alias-brand-primary)',
        background: 'var(--dsw-alias-brand-primary)',
        color: 'var(--dsw-alias-bg-base)',
        fontSize: 13,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: 'inherit',
      },
      secondary: {
        padding: '8px 16px',
        borderRadius: 8,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: 'inherit',
      },
      status: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)' },
      statusError: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' },
      resultHead: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      },
      resultBox: {
        borderRadius: 12,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
        padding: '20px 24px',
        fontSize: 14,
        lineHeight: 1.85,
      },
    }

    const RESULT_CSS = `
      .er h1,.er h2,.er h3{line-height:1.4;margin:1.2em 0 .5em;font-weight:600}
      .er h1{font-size:19px}.er h2{font-size:17px}.er h3{font-size:15px}
      .er p{margin:.6em 0}
      .er ul,.er ol{margin:.5em 0 .5em 1.4em;padding:0}
      .er li{margin:.25em 0}
      .er blockquote{margin:.6em 0;padding:.2em .9em;border-left:3px solid var(--dsw-alias-border-l2);color:var(--dsw-alias-label-secondary)}
      .er table{border-collapse:collapse;width:100%;table-layout:fixed;margin:.8em 0;font-size:13px}
      .er th,.er td{border:1px solid var(--dsw-alias-border-l1);padding:6px 9px;vertical-align:top;text-align:left}
      .er th{background:var(--dsw-alias-bg-layer-2);font-weight:600}
      .er code{font-family:ui-monospace,Menlo,monospace;font-size:.92em;background:var(--dsw-alias-bg-layer-2);padding:1px 5px;border-radius:4px}
      .er hr{border:none;border-top:1px solid var(--dsw-alias-border-l1);margin:1.2em 0}
      .er strong{font-weight:600}
    `

    function escapeHtml(text) {
      return String(text)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
    }

    function inline(text) {
      let out = escapeHtml(text)
      out = out.replace(/`([^`]+)`/g, '<code>$1</code>')
      out = out.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      out = out.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
      return out
    }

    /** Minimal Markdown: headings, lists, tables, quotes, rules, paragraphs. */
    function mdToHtml(markdown) {
      const lines = String(markdown).replace(/\r\n/g, '\n').split('\n')
      const out = []
      let list = null
      let tableRows = null

      const closeList = () => {
        if (list) {
          out.push(`</${list}>`)
          list = null
        }
      }
      const closeTable = () => {
        if (tableRows) {
          out.push('</tbody></table>')
          tableRows = null
        }
      }

      for (const raw of lines) {
        const line = raw.replace(/\s+$/, '')

        if (!line.trim()) {
          closeList()
          closeTable()
          continue
        }

        if (/^\s*\|.*\|\s*$/.test(line)) {
          closeList()
          const cells = line
            .trim()
            .replace(/^\|/, '')
            .replace(/\|$/, '')
            .split('|')
            .map((cell) => cell.trim())

          if (cells.every((cell) => /^:?-{2,}:?$/.test(cell) || cell === '')) continue

          if (!tableRows) {
            out.push('<table><tbody>')
            tableRows = 0
          }
          const tag = tableRows === 0 ? 'th' : 'td'
          tableRows += 1
          out.push(`<tr>${cells.map((cell) => `<${tag}>${inline(cell)}</${tag}>`).join('')}</tr>`)
          continue
        }
        closeTable()

        const heading = /^(#{1,6})\s+(.*)$/.exec(line)
        if (heading) {
          closeList()
          const level = Math.min(heading[1].length + 1, 4)
          out.push(`<h${level}>${inline(heading[2])}</h${level}>`)
          continue
        }

        if (/^\s*([-*+])\s+/.test(line)) {
          if (list !== 'ul') {
            closeList()
            out.push('<ul>')
            list = 'ul'
          }
          out.push(`<li>${inline(line.replace(/^\s*[-*+]\s+/, ''))}</li>`)
          continue
        }

        if (/^\s*\d+[.)]\s+/.test(line)) {
          if (list !== 'ol') {
            closeList()
            out.push('<ol>')
            list = 'ol'
          }
          out.push(`<li>${inline(line.replace(/^\s*\d+[.)]\s+/, ''))}</li>`)
          continue
        }

        if (/^\s*>\s?/.test(line)) {
          closeList()
          out.push(`<blockquote>${inline(line.replace(/^\s*>\s?/, ''))}</blockquote>`)
          continue
        }

        if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) {
          closeList()
          out.push('<hr>')
          continue
        }

        closeList()
        out.push(`<p>${inline(line)}</p>`)
      }

      closeList()
      closeTable()
      return out.join('\n')
    }

    function printDocument(title, bodyHtml) {
      return `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 16mm 15mm; }
  body { font-family: "Songti SC", "SimSun", "Noto Serif CJK SC", Georgia, serif; font-size: 10.5pt; line-height: 1.8; color: #111; }
  h1 { font-size: 17pt; margin: 0 0 8mm; }
  h2 { font-size: 13pt; margin: 6mm 0 2mm; }
  h3 { font-size: 11.5pt; margin: 5mm 0 2mm; }
  p { margin: 2mm 0; }
  ul, ol { margin: 2mm 0 2mm 6mm; padding: 0; }
  li { margin: 1mm 0; }
  blockquote { margin: 3mm 0; padding-left: 4mm; border-left: 2px solid #999; color: #444; }
  table { border-collapse: collapse; width: 100%; margin: 3mm 0; font-size: 9.5pt; }
  th, td { border: 0.4pt solid #999; padding: 1.6mm 2mm; vertical-align: top; text-align: left; }
  th { background: #f0f0f0; }
  code { font-family: ui-monospace, Menlo, monospace; font-size: 9.5pt; }
  hr { border: none; border-top: 0.4pt solid #ccc; margin: 5mm 0; }
  h1, h2, h3 { break-after: avoid; }
  table, tr, li { break-inside: avoid; }
</style></head><body>${bodyHtml}</body></html>`
    }

    function SidebarIcon(props) {
      const size = (props && props.size) || 20
      const stroke = props && props.active ? 'var(--dsw-alias-brand-primary)' : 'currentColor'
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: '0 0 24 24',
          fill: 'none',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        h('path', {
          d: 'M6 3.5h9.5a2 2 0 0 1 2 2v15a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-15a2 2 0 0 1 2-2z',
          stroke,
          strokeWidth: 1.6,
          strokeLinejoin: 'round',
        }),
        h('path', { d: 'M13.5 3.5h3v6l-1.5-1.6-1.5 1.6z', fill: stroke }),
        h('path', {
          d: 'M7.5 13h7M7.5 16.5h4.5',
          stroke,
          strokeWidth: 1.6,
          strokeLinecap: 'round',
          opacity: 0.7,
        }),
      )
    }

    function Panel({ locale }) {
      const zh = locale !== 'en'
      const t = (key) => (zh ? TEXT_ZH : TEXT_EN)[key] || key

      const [text, setText] = React.useState('')
      const [fileName, setFileName] = React.useState('')
      const [dragging, setDragging] = React.useState(false)
      const [view, setView] = React.useState('input')
      const [markdown, setMarkdown] = React.useState('')
      const [busy, setBusy] = React.useState(false)
      const [status, setStatus] = React.useState(null)
      const abortRef = React.useRef(null)

      React.useEffect(
        () => () => {
          if (abortRef.current) abortRef.current.abort()
        },
        [],
      )

      const readDropped = async (file) => {
        const name = (file.name || '').toLowerCase()
        const textual = /\.(txt|md|markdown|text)$/.test(name) || (file.type || '').startsWith('text/')
        if (!textual) {
          setStatus({ ok: false, text: t('unsupportedFile') })
          return
        }
        try {
          setText(await file.text())
          setFileName(file.name || '')
          setStatus({ ok: true, text: t('fileLoaded') })
        } catch {
          setStatus({ ok: false, text: t('readFailed') })
        }
      }

      const analyse = async () => {
        const material = text.trim()
        if (!material) {
          setStatus({ ok: false, text: t('empty') })
          return
        }
        const controller = new AbortController()
        abortRef.current = controller
        setBusy(true)
        setStatus({ ok: true, text: t('running') })
        setMarkdown('')
        setView('result')

        try {
          const response = await fetch(`${API}/analyze`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text: material }),
            signal: controller.signal,
          })
          if (!response.ok) {
            const detail = await response.json().catch(() => ({}))
            throw new Error(detail.error || `HTTP ${response.status}`)
          }

          const reader = response.body.getReader()
          const decoder = new TextDecoder()
          let buffer = ''
          let acc = ''
          for (;;) {
            const { done, value } = await reader.read()
            if (done) break
            buffer += decoder.decode(value, { stream: true })
            let index
            while ((index = buffer.indexOf('\n\n')) >= 0) {
              const frame = buffer.slice(0, index)
              buffer = buffer.slice(index + 2)
              const line = frame.split('\n').find((item) => item.startsWith('data: '))
              if (!line) continue
              let event
              try {
                event = JSON.parse(line.slice(6))
              } catch {
                continue
              }
              if (event.delta) {
                acc += event.delta
                setMarkdown(acc)
              } else if (event.error) {
                throw new Error(event.error)
              }
            }
          }
          setStatus({ ok: true, text: t('ready') })
        } catch (error) {
          if (error && error.name === 'AbortError') setStatus({ ok: false, text: t('stop') })
          else setStatus({ ok: false, text: `${t('failed')}：${(error && error.message) || error}` })
        } finally {
          abortRef.current = null
          setBusy(false)
        }
      }

      const downloadPdf = async () => {
        if (!markdown.trim()) return
        setStatus({ ok: true, text: t('preparing') })
        try {
          const html = printDocument(t('title'), `<div class="er">${mdToHtml(markdown)}</div>`)
          const response = await fetch(`${API}/pdf`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ html }),
          })
          if (!response.ok) {
            const detail = await response.json().catch(() => ({}))
            throw new Error(detail.error || `HTTP ${response.status}`)
          }
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = 'english-reading-analysis.pdf'
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          setTimeout(() => URL.revokeObjectURL(url), 4000)
          setStatus({ ok: true, text: t('paged') })
        } catch (error) {
          setStatus({ ok: false, text: `${t('failed')}：${(error && error.message) || error}` })
        }
      }

      const zoneStyle = {
        ...styles.zone,
        borderColor: dragging ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)',
        background: dragging ? 'var(--dsw-alias-bg-layer-2)' : 'var(--dsw-alias-bg-layer-1)',
      }

      const header = [
        h('h1', { key: 'title', style: styles.title }, t('title')),
        h('p', { key: 'subtitle', style: styles.subtitle }, t('subtitle')),
      ]

      if (view === 'result') {
        return h(
          'div',
          { style: styles.page },
          h(
            'div',
            { style: styles.inner },
            header,
            h(
              'div',
              { style: styles.resultHead },
              h('span', { style: status && !status.ok ? styles.statusError : styles.status }, status ? status.text : ''),
              h(
                'div',
                { style: styles.actions },
                h(
                  'button',
                  { type: 'button', style: styles.primary, onClick: downloadPdf, disabled: busy || !markdown.trim() },
                  t('download'),
                ),
                h(
                  'button',
                  {
                    type: 'button',
                    style: styles.secondary,
                    onClick: () => {
                      if (abortRef.current) abortRef.current.abort()
                      setView('input')
                      setMarkdown('')
                      setStatus(null)
                    },
                  },
                  t('again'),
                ),
              ),
            ),
            h(
              'div',
              { style: styles.resultBox },
              h('style', null, RESULT_CSS),
              h('div', {
                className: 'er',
                // Rendered locally from Markdown; every interpolated value is HTML-escaped first.
                dangerouslySetInnerHTML: { __html: mdToHtml(markdown || (busy ? t('running') : '')) },
              }),
            ),
          ),
        )
      }

      return h(
        'div',
        { style: styles.page },
        h(
          'div',
          { style: styles.inner },
          header,
          h(
            'div',
            {
              style: zoneStyle,
              onDragOver: (event) => {
                event.preventDefault()
                setDragging(true)
              },
              onDragLeave: () => setDragging(false),
              onDrop: async (event) => {
                event.preventDefault()
                setDragging(false)
                const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]
                if (file) await readDropped(file)
              },
            },
            h('textarea', {
              style: styles.zoneInput,
              placeholder: t('zonePlaceholder'),
              value: text,
              onChange: (event) => {
                setText(event.target.value)
                setFileName('')
                setStatus(null)
              },
            }),
            h(
              'div',
              { style: styles.zoneFooter },
              h('span', null, fileName ? `${fileName} · ${text.length}` : `${text.length} ${t('chars')}`),
              text
                ? h(
                    'button',
                    {
                      type: 'button',
                      style: styles.linkButton,
                      onClick: () => {
                        setText('')
                        setFileName('')
                        setStatus(null)
                      },
                    },
                    t('clear'),
                  )
                : null,
            ),
          ),
          h(
            'div',
            { style: styles.actions },
            h('button', { type: 'button', style: styles.primary, onClick: analyse }, t('start')),
            status ? h('span', { style: status.ok ? styles.status : styles.statusError }, status.text) : null,
          ),
          h('p', { style: styles.note }, t('note')),
        ),
      )
    }

    function currentLocale(context) {
      try {
        const snapshot = context.locale.getLocale()
        const raw =
          typeof snapshot === 'string'
            ? snapshot
            : (snapshot && (snapshot.id || snapshot.locale || snapshot.language)) || 'zh'
        return String(raw).toLowerCase().startsWith('en') ? 'en' : 'zh'
      } catch {
        return 'zh'
      }
    }

    return {
      inject: ['slots', 'locale'],

      apply(context) {
        const locale = currentLocale(context)

        context.slots.inject('sidebar.panellist', () =>
          context.slots.register(
            {
              name: 'sidebar.panellist',
              id: PANEL_ID,
              order: 30,
              label: () => (locale === 'en' ? TEXT_EN.title : TEXT_ZH.title),
            },
            SidebarIcon,
          ),
        )

        context.slots.inject('main', () =>
          context.slots.register({ name: 'main', key: PANEL_ID }, () => h(Panel, { locale })),
        )
      },
    }
  },
})
