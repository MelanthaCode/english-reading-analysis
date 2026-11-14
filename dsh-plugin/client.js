// Client half of dsh-skill-english-reading.
//
// Sidebar entry + main panel. The panel posts to the Host's same-origin routes
// and renders the reply with the skill's own stylesheet inside a shadow root, so
// the document keeps its print look while the surrounding UI is untouched.
// The PDF route is only called when the user asks for one.

window.__ModuleLoader__.load({
  id: 'dsh-skill-english-reading',

  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PANEL_ID = 'english-reading'
    const API = '/x-english-reading'

    // Palette shared with the skill stylesheet (Searching for Birds language).
    const C = {
      paper: '#f4efe5',
      paper2: '#fffdf8',
      ink: '#2f2620',
      muted: '#8a7a6c',
      line: '#e4d8c4',
      coral: '#f9564e',
      gold: '#ffcc2d',
      soft: '#ece2d0',
      head: "'Jost','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',system-ui,sans-serif",
      body: "'Zilla Slab',Georgia,'Times New Roman','Songti SC',SimSun,'Noto Serif CJK SC',serif",
    }

    const TEXT_ZH = {
      title: '英语阅读分析',
      subtitle: '英语文章翻译成中文、拆解长难句、给出选择题答案与解析，也可以核对已作答的卷子。',
      zonePlaceholder: '把英文粘贴到这里，或把 .txt / .md 文件拖进这个框',
      chars: '字符',
      clear: '清空',
      start: '开始分析',
      running: '正在分析',
      elapsed: '已用时',
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
      note: 'Attach PDFs, scans or photos in the conversation; this panel is for pasted text.',
      empty: 'Paste the English first, or drop a text file.',
      fileLoaded: 'File loaded',
      unsupportedFile: 'Text files only (.txt / .md). Attach PDFs or images in the conversation.',
      readFailed: 'Could not read that file.',
      failed: 'Failed',
      download: 'Download PDF',
      preparing: 'Rendering PDF…',
      again: 'Analyse next',
      ready: 'Done',
      paged: 'Downloaded',
      stop: 'Stopped',
    }

    const styles = {
      page: {
        height: '100%',
        overflowY: 'auto',
        padding: '26px 32px 64px',
        color: C.ink,
        background: C.paper,
        boxSizing: 'border-box',
      },
      inner: { maxWidth: 940, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 },
      title: {
        fontSize: 23,
        fontWeight: 600,
        letterSpacing: '-0.01em',
        margin: 0,
        color: C.ink,
        fontFamily: C.head,
      },
      subtitle: {
        margin: 0,
        color: C.muted,
        fontSize: 13,
        lineHeight: 1.75,
        fontFamily: C.head,
      },

      zone: {
        display: 'flex',
        flexDirection: 'column',
        minHeight: 220,
        borderRadius: 10,
        border: `1.5px dashed #d9c9b2`,
        background: C.paper2,
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
        color: C.ink,
        fontFamily: C.body,
        fontSize: 14.5,
        lineHeight: 1.75,
        resize: 'none',
        boxSizing: 'border-box',
      },
      zoneFooter: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px 12px',
        fontSize: 12,
        color: C.muted,
        fontFamily: C.head,
      },
      linkButton: {
        border: 'none',
        background: 'transparent',
        color: C.coral,
        font: 'inherit',
        fontSize: 12,
        cursor: 'pointer',
        padding: 0,
      },
      note: { margin: 0, fontSize: 12, lineHeight: 1.7, color: C.muted, fontFamily: C.head },

      actions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
      primary: {
        padding: '9px 20px',
        borderRadius: 8,
        border: `1px solid ${C.coral}`,
        background: C.coral,
        color: '#fffdf8',
        fontSize: 13.5,
        fontWeight: 600,
        cursor: 'pointer',
        fontFamily: C.head,
      },
      secondary: {
        padding: '9px 18px',
        borderRadius: 8,
        border: `1px solid ${C.line}`,
        background: C.paper2,
        color: C.ink,
        fontSize: 13.5,
        cursor: 'pointer',
        fontFamily: C.head,
      },
      status: { fontSize: 12, color: C.muted, fontFamily: C.head },
      statusError: { fontSize: 12, color: '#d1453b', fontFamily: C.head },

      barHead: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        fontSize: 12,
        color: C.muted,
        marginBottom: 7,
        fontFamily: C.head,
        fontVariantNumeric: 'tabular-nums',
      },
      track: {
        position: 'relative',
        height: 6,
        borderRadius: 999,
        background: C.soft,
        overflow: 'hidden',
      },
      fill: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        borderRadius: 999,
        background: C.coral,
        transition: 'width 320ms ease',
      },
      docHost: { display: 'block', marginTop: 4 },
    }

    function SidebarIcon(props) {
      const size = (props && props.size) || 20
      const stroke = props && props.active ? C.coral : 'currentColor'
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

    /** Strip anything executable: the document renders inside the panel's origin. */
    function sanitize(html) {
      return String(html)
        .replace(/<script[\s\S]*?<\/script>/gi, '')
        .replace(/\son\w+\s*=\s*"[^"]*"/gi, '')
        .replace(/\son\w+\s*=\s*'[^']*'/gi, '')
        .replace(/javascript:/gi, '')
    }

    /**
     * Inside a shadow root every selector is already scoped, so the stylesheet
     * needs only one edit: the document-level selectors become `:host`.
     */
    function toShadowCss(css) {
      const scoped = String(css)
        .replace(/@page[^{]*\{[^}]*\}/g, '')
        // `:root` may follow a comment (`*/`) rather than a `}` or the start of
        // the file, so anchor on any preceding newline or brace as well. Missing
        // that left the custom properties outside the shadow tree, which silently
        // killed every var() consumer: the number badge and the coloured
        // underlines below.
        .replace(/(^|[\n}])\s*(?:html\s*,\s*body|html|body|:root)\s*\{/g, (match, prefix) => `${prefix}:host{`)
      return (
        scoped +
        '\n:host{display:block;padding:28px 32px 32px;border-radius:12px;' +
        'box-shadow:0 1px 2px rgba(119,67,24,.06),0 8px 24px rgba(119,67,24,.08)}'
      )
    }

    function Panel({ locale }) {
      const zh = locale !== 'en'
      const t = (key) => (zh ? TEXT_ZH : TEXT_EN)[key] || key

      const [text, setText] = React.useState('')
      const [fileName, setFileName] = React.useState('')
      const [dragging, setDragging] = React.useState(false)
      const [phase, setPhase] = React.useState('input')
      const [fragment, setFragment] = React.useState('')
      const [fonts, setFonts] = React.useState('')
      const [docCss, setDocCss] = React.useState('')
      const [pct, setPct] = React.useState(0)
      const [seconds, setSeconds] = React.useState(0)
      const [status, setStatus] = React.useState(null)

      const abortRef = React.useRef(null)
      const accRef = React.useRef('')
      const startRef = React.useRef(0)
      const expectedRef = React.useRef(2000)
      const hostRef = React.useRef(null)

      React.useEffect(
        () => () => {
          if (abortRef.current) abortRef.current.abort()
        },
        [],
      )

      const loadCss = React.useCallback(async () => {
        if (docCss) return
        try {
          const response = await fetch(`${API}/style.css`)
          const raw = await response.text()
          const faces = (raw.match(/@font-face\{[\s\S]*?\}\s*/g) || []).join('\n')
          setFonts(faces)
          setDocCss(toShadowCss(raw.replace(/@font-face\{[\s\S]*?\}\s*/g, '')))
        } catch {
          setDocCss('')
        }
      }, [docCss])

      React.useEffect(() => {
        void loadCss()
      }, [loadCss])

      // Paint the document into its own shadow root: isolation without rewriting
      // any selector, and no iframe to fight over height.
      React.useEffect(() => {
        const host = hostRef.current
        if (!host || !docCss) return
        const root = host.shadowRoot || host.attachShadow({ mode: 'open' })
        root.innerHTML = `<style>${docCss}</style><div class="er-doc">${sanitize(fragment)}</div>`
      }, [fragment, docCss])

      React.useEffect(() => {
        if (phase !== 'running') return undefined
        const timer = setInterval(() => {
          const elapsed = (Date.now() - startRef.current) / 1000
          setSeconds(Math.round(elapsed))
          const byChars = accRef.current.length / expectedRef.current
          const byTime = (1 - Math.exp(-elapsed / 38)) * 0.92
          setPct(Math.min(96, Math.round(Math.max(byChars, byTime) * 100)))
        }, 500)
        return () => clearInterval(timer)
      }, [phase])

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
        accRef.current = ''
        startRef.current = Date.now()
        expectedRef.current = Math.max(1500, Math.min(22000, material.length * 4.2))
        setFragment('')
        setPct(2)
        setSeconds(0)
        setStatus(null)
        setPhase('running')
        await loadCss()

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
                accRef.current += event.delta
                const now = Date.now()
                if (now - lastPaint > 260) {
                  lastPaint = now
                  setFragment(accRef.current)
                }
              } else if (event.error) {
                throw new Error(event.error)
              }
            }
          }

          setFragment(accRef.current)
          setPct(100)
          setPhase('result')
          setStatus({ ok: true, text: t('ready') })
        } catch (error) {
          if (error && error.name === 'AbortError') {
            setStatus({ ok: false, text: t('stop') })
          } else {
            setStatus({ ok: false, text: `${t('failed')}：${(error && error.message) || error}` })
          }
          setPhase(accRef.current ? 'result' : 'input')
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

      const busy = phase === 'running'

      return h(
        'div',
        { style: styles.page },
        h(
          'div',
          { style: styles.inner },
          // Faces live in the light DOM so the panel's own headings can use Jost;
          // the document gets its styles from the shadow root below.
          fonts ? h('style', { key: 'faces' }, fonts) : null,

          h('h1', { style: styles.title }, t('title')),
          h('p', { style: styles.subtitle }, t('subtitle')),

          busy
            ? h(
                'div',
                { style: { display: 'flex', flexDirection: 'column', gap: 0 } },
                h(
                  'div',
                  { style: styles.barHead },
                  h('span', null, `${t('running')} · ${pct}%`),
                  h('span', null, `${t('elapsed')} ${seconds}s`),
                ),
                h('div', { style: styles.track }, h('div', { style: { ...styles.fill, width: `${pct}%` } })),
              )
            : null,

          phase === 'input'
            ? h(
                'div',
                {
                  style: {
                    ...styles.zone,
                    borderColor: dragging ? C.coral : '#d9c9b2',
                    background: dragging ? '#faf5ea' : C.paper2,
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
              )
            : null,

          fragment ? h('div', { ref: hostRef, style: styles.docHost }) : null,

          h(
            'div',
            { style: styles.actions },
            phase === 'input'
              ? h('button', { type: 'button', style: styles.primary, onClick: analyse }, t('start'))
              : null,
            phase === 'result'
              ? h(
                  'button',
                  { type: 'button', style: styles.primary, onClick: downloadPdf, disabled: !fragment.trim() },
                  t('download'),
                )
              : null,
            phase === 'result'
              ? h(
                  'button',
                  {
                    type: 'button',
                    style: styles.secondary,
                    onClick: () => {
                      setPhase('input')
                      setFragment('')
                      setPct(0)
                      setStatus(null)
                    },
                  },
                  t('again'),
                )
              : null,
            status ? h('span', { style: status.ok ? styles.status : styles.statusError }, status.text) : null,
          ),

          phase === 'input' ? h('p', { style: styles.note }, t('note')) : null,
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
