// Client half of dsh-skill-english-reading.
//
// Sidebar entry + main panel. The panel posts to the Host's same-origin routes
// and renders the reply with the skill's own stylesheet, so what you see here is
// what the PDF prints. The PDF route is only called when the user asks for it.

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
      running: '正在分析',
      elapsed: '已用时',
      produced: '已生成',
      note: 'PDF、扫描件、照片请在对话里作为附件发送；这里适合粘贴文字。',
      empty: '先粘贴英文，或拖入一个文本文件。',
      fileLoaded: '文件已读入',
      unsupportedFile: '只支持文本文件（.txt / .md）。PDF 或图片请在对话里作为附件发送。',
      readFailed: '读取文件失败。',
      failed: '失败',
      download: '下载 PDF',
      preparing: '正在渲染 PDF…',
      again: '分析下一篇',
      ready: '分析完成',
      paged: '已下载',
      stop: '已停止',
    }

    const TEXT_EN = {
      title: 'English Reading Analysis',
      subtitle: 'Translate English passages into Chinese, break down long sentences, and answer multiple-choice questions with explanations — or check a paper you already answered.',
      zonePlaceholder: 'Paste the English here, or drop a .txt / .md file into this box',
      chars: 'characters',
      clear: 'Clear',
      start: 'Analyse',
      running: 'Analysing',
      elapsed: 'elapsed',
      produced: 'produced',
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
      stop: 'Stopped',
    }

    // The bar is a travelling segment, not a full-width block: a 100%-wide bar
    // sliding by its own width looks completely static.
    const KEYFRAMES = `
      @keyframes er-slide {
        0%   { transform: translateX(-120%); }
        100% { transform: translateX(340%); }
      }
    `

    const styles = {
      page: {
        height: '100%',
        overflowY: 'auto',
        padding: '26px 32px 40px',
        color: 'var(--dsw-alias-label-primary)',
        background: 'var(--dsw-alias-bg-base)',
        boxSizing: 'border-box',
      },
      inner: { maxWidth: 900, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 14 },
      title: { fontSize: 20, fontWeight: 600, margin: 0 },
      subtitle: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 13, lineHeight: 1.65 },
      zone: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: 220,
        borderRadius: 14,
        border: '1.5px dashed var(--dsw-alias-border-l2)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'border-color 120ms ease, background 120ms ease',
      },
      zoneInput: {
        flex: 1,
        width: '100%',
        minHeight: 170,
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

      progressCard: {
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
        borderRadius: 12,
        padding: '18px 20px',
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
      },
      progressHead: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        fontSize: 13,
        color: 'var(--dsw-alias-label-primary)',
        gap: 12,
      },
      progressMeta: { fontSize: 12, color: 'var(--dsw-alias-label-secondary)', fontVariantNumeric: 'tabular-nums' },
      track: {
        position: 'relative',
        height: 4,
        borderRadius: 999,
        background: 'var(--dsw-alias-bg-layer-2)',
        overflow: 'hidden',
      },
      bar: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        width: '28%',
        borderRadius: 999,
        background: 'var(--dsw-alias-brand-primary)',
        animation: 'er-slide 1.25s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        willChange: 'transform',
      },
      resultHead: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        flexWrap: 'wrap',
      },
      frameWrap: {
        border: '1px solid var(--dsw-alias-border-l1)',
        borderRadius: 10,
        overflow: 'hidden',
        background: '#ffffff',
      },
      frame: {
        width: '100%',
        border: 'none',
        display: 'block',
        background: '#ffffff',
      },
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
      const [phase, setPhase] = React.useState('input') // input | running | result
      const [fragment, setFragment] = React.useState('')
      const [css, setCss] = React.useState('')
      const [chars, setChars] = React.useState(0)
      const [seconds, setSeconds] = React.useState(0)
      const [status, setStatus] = React.useState(null)
      const [frameHeight, setFrameHeight] = React.useState(420)
      const abortRef = React.useRef(null)

      React.useEffect(
        () => () => {
          if (abortRef.current) abortRef.current.abort()
        },
        [],
      )

      React.useEffect(() => {
        if (phase !== 'running') return undefined
        const started = Date.now()
        const timer = setInterval(() => setSeconds(Math.round((Date.now() - started) / 1000)), 1000)
        return () => clearInterval(timer)
      }, [phase])

      const ensureCss = async () => {
        if (css) return css
        try {
          const response = await fetch(`${API}/style.css`)
          const text = await response.text()
          setCss(text)
          return text
        } catch {
          return ''
        }
      }

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
        setFragment('')
        setChars(0)
        setSeconds(0)
        setStatus(null)
        setPhase('running')
        await ensureCss()

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
          let lastPaint = 0

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
                const now = Date.now()
                if (now - lastPaint > 250) {
                  lastPaint = now
                  setChars(acc.replace(/\s+/g, '').length)
                }
              } else if (event.error) {
                throw new Error(event.error)
              }
            }
          }

          setChars(acc.replace(/\s+/g, '').length)
          setFragment(acc)
          setPhase('result')
          setStatus({ ok: true, text: t('ready') })
        } catch (error) {
          if (error && error.name === 'AbortError') {
            setStatus({ ok: false, text: t('stop') })
          } else {
            setStatus({ ok: false, text: `${t('failed')}：${(error && error.message) || error}` })
          }
          setPhase(fragment ? 'result' : 'input')
        } finally {
          abortRef.current = null
        }
      }

      const downloadPdf = async () => {
        if (!fragment.trim()) return
        setStatus({ ok: true, text: t('preparing') })
        try {
          const response = await fetch(`${API}/pdf`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ html: fragment, title: t('title') }),
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

      const keyframes = h('style', { key: 'kf' }, KEYFRAMES)
      const header = [
        h('h1', { key: 'title', style: styles.title }, t('title')),
        h('p', { key: 'subtitle', style: styles.subtitle }, t('subtitle')),
      ]

      if (phase === 'running') {
        return h(
          'div',
          { style: styles.page },
          h(
            'div',
            { style: styles.inner },
            keyframes,
            header,
            h(
              'div',
              { style: styles.progressCard },
              h(
                'div',
                { style: styles.progressHead },
                h('span', null, `${t('running')}…`),
                h('span', { style: styles.progressMeta }, `${t('elapsed')} ${seconds}s · ${t('produced')} ${chars} ${t('chars')}`),
              ),
              h('div', { style: styles.track }, h('div', { style: styles.bar })),
            ),
          ),
        )
      }

      if (phase === 'result') {
        // No sandbox: the height has to be measured from the document, which
        // needs same-origin access. Model output is stripped of scripts and
        // inline handlers first, so the frame cannot execute anything.
        const safe = String(fragment)
          .replace(/<script[\s\S]*?<\/script>/gi, '')
          .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
          .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
          .replace(/javascript:/gi, '')
        const doc = `<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><style>${css}</style></head><body>${safe}</body></html>`

        const measure = (event) => {
          try {
            const win = event.target.contentWindow
            const body = win && win.document && win.document.body
            if (!body) return
            const height = Math.ceil(Math.max(body.scrollHeight, body.offsetHeight))
            if (height > 0) setFrameHeight(Math.min(Math.max(height + 12, 240), 12000))
          } catch {
            /* measurement is best-effort */
          }
        }

        return h(
          'div',
          { style: styles.page },
          h(
            'div',
            { style: styles.inner },
            keyframes,
            header,
            h(
              'div',
              { style: styles.resultHead },
              h('span', { style: status && !status.ok ? styles.statusError : styles.status }, status ? status.text : ''),
              h(
                'div',
                { style: styles.actions },
                h('button', { type: 'button', style: styles.primary, onClick: downloadPdf }, t('download')),
                h(
                  'button',
                  {
                    type: 'button',
                    style: styles.secondary,
                    onClick: () => {
                      setPhase('input')
                      setFragment('')
                      setStatus(null)
                    },
                  },
                  t('again'),
                ),
              ),
            ),
            h(
              'div',
              { style: styles.frameWrap },
              h('iframe', {
                style: { ...styles.frame, height: frameHeight },
                srcDoc: doc,
                onLoad: measure,
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
          keyframes,
          header,
          h(
            'div',
            {
              style: {
                ...styles.zone,
                borderColor: dragging ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)',
                background: dragging ? 'var(--dsw-alias-bg-layer-2)' : 'var(--dsw-alias-bg-layer-1)',
              },
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
