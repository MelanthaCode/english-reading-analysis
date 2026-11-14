// Client half of dsh-skill-english-reading.
//
// Adds a sidebar entry (`sidebar.panellist`) plus the matching main panel
// (`main`, keyed by the same id). The panel builds a complete trigger prompt
// for the skill, so invoking it is: click the icon, pick a task, copy, open the
// conversation. There is no composer-write service in the client API, so the
// prompt is copied to the clipboard rather than injected into the input box.

window.__ModuleLoader__.load({
  id: 'dsh-skill-english-reading',

  factory(require) {
    const React = require('react')
    const h = React.createElement

    const PANEL_ID = 'english-reading'

    const TEXT_ZH = {
      title: '英语阅读分析',
      subtitle: '把英语试卷或文章转成中文分析，并与可打印的 A4 PDF 一起交付。',
      zonePlaceholder: '把英文粘贴到这里，或把 .txt / .md 文件拖进这个框',
      chars: '字符',
      clear: '清空',
      start: '开始分析',
      copyOnly: '只复制提示词',
      note: '点「开始分析」会把完整提示词复制好并跳到对话：按 ⌘V 粘贴即可。PDF、扫描件、照片请在对话里直接作为附件发送。',
      copied: '已复制，正在切到对话…',
      copiedStay: '提示词已复制',
      copyFailed: '复制失败，请手动选中文本复制。',
      empty: '先粘贴英文，或拖入一个文本文件。',
      fileLoaded: '文件已读入',
      unsupportedFile: '只支持文本文件（.txt / .md）。PDF 或图片请在对话里作为附件发送。',
      readFailed: '读取文件失败。',
      promptHead: '把下面的英语材料转成中文分析：逐篇原文＋译文（逐段对照）；如有题目，题干与选项中英对照并给出答案与原文定位解析；如有我的作答，做对错分析与错因归类；最后按每篇挑长难句做句法拆解（左栏句法框架、右栏原词）。输出可直接打印的 A4 PDF，不要学校名、考试名等身份信息。\n\n材料如下：\n',
    }

    const TEXT_EN = {
      title: 'English Reading Analysis',
      subtitle: 'Turn English passages or exam papers into a Chinese analysis with a printable A4 PDF.',
      zonePlaceholder: 'Paste the English here, or drop a .txt / .md file into this box',
      chars: 'characters',
      clear: 'Clear',
      start: 'Start analysis',
      copyOnly: 'Copy prompt only',
      note: 'Start analysis copies the full prompt and opens the conversation: press ⌘V and send. For PDFs, scans or photos, attach them in the conversation instead.',
      copied: 'Copied. Switching to the conversation…',
      copiedStay: 'Prompt copied',
      copyFailed: 'Copy failed — select the text and copy it manually.',
      empty: 'Paste the English first, or drop a text file.',
      fileLoaded: 'File loaded',
      unsupportedFile: 'Text files only (.txt / .md). For PDFs or images, attach them in the conversation.',
      readFailed: 'Could not read that file.',
      promptHead: 'Turn the English material below into a Chinese analysis: passage by passage original + translation; if there are questions, translate stems and options, give answers traced to the source; if my answers are included, analyse errors and categorise them; finally break down the long sentences (syntax frame on the left, original wording on the right). Output a print-ready A4 PDF with no school or exam identifiers.\n\nMaterial:\n',
    }

    const styles = {
      page: {
        height: '100%',
        overflowY: 'auto',
        padding: '28px 32px 48px',
        color: 'var(--dsw-alias-label-primary)',
        background: 'var(--dsw-alias-bg-base)',
        boxSizing: 'border-box',
      },
      inner: { maxWidth: 760, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 18 },
      title: { fontSize: 20, fontWeight: 600, margin: 0 },
      subtitle: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 13, lineHeight: 1.6 },
      step: { margin: 0, color: 'var(--dsw-alias-label-secondary)', fontSize: 12.5 },
      sectionLabel: { fontSize: 12, fontWeight: 600, color: 'var(--dsw-alias-label-secondary)' },
      chips: { display: 'flex', flexWrap: 'wrap', gap: 8 },
      chip: {
        padding: '7px 14px',
        borderRadius: 999,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
        color: 'var(--dsw-alias-label-primary)',
        fontSize: 13,
        cursor: 'pointer',
        fontFamily: 'inherit',
      },
      chipActive: {
        borderColor: 'var(--dsw-alias-brand-primary)',
        color: 'var(--dsw-alias-brand-primary)',
      },
      textarea: {
        width: '100%',
        minHeight: 110,
        padding: '10px 12px',
        borderRadius: 10,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-1)',
        color: 'var(--dsw-alias-label-primary)',
        fontFamily: 'inherit',
        fontSize: 13,
        lineHeight: 1.55,
        resize: 'vertical',
        boxSizing: 'border-box',
      },
      zone: {
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 260,
        borderRadius: 14,
        border: '1.5px dashed var(--dsw-alias-border-l2)',
        boxSizing: 'border-box',
        overflow: 'hidden',
        transition: 'border-color 120ms ease, background 120ms ease',
      },
      zoneInput: {
        flex: 1,
        width: '100%',
        minHeight: 200,
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
      zoneHint: { opacity: 0.85 },
      linkButton: {
        border: 'none',
        background: 'transparent',
        color: 'var(--dsw-alias-brand-primary)',
        font: 'inherit',
        fontSize: 12,
        cursor: 'pointer',
        padding: 0,
      },
      note: {
        margin: 0,
        fontSize: 12,
        lineHeight: 1.65,
        color: 'var(--dsw-alias-label-secondary)',
      },
      preview: {
        margin: 0,
        padding: '12px 14px',
        borderRadius: 10,
        border: '1px solid var(--dsw-alias-border-l1)',
        background: 'var(--dsw-alias-bg-layer-2)',
        color: 'var(--dsw-alias-label-secondary)',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace',
        fontSize: 12,
        lineHeight: 1.6,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        maxHeight: 220,
        overflowY: 'auto',
      },
      actions: { display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' },
      primary: {
        padding: '8px 16px',
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
      status: { fontSize: 12, color: 'var(--dsw-alias-state-success-primary)' },
      statusError: { fontSize: 12, color: 'var(--dsw-alias-state-error-primary)' },
    }

    function SidebarIcon(props) {
      const size = props && props.size ? props.size : 20
      const active = props && props.active
      const stroke = active ? 'var(--dsw-alias-brand-primary)' : 'currentColor'
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
      const [text, setText] = React.useState('')
      const [fileName, setFileName] = React.useState('')
      const [dragging, setDragging] = React.useState(false)
      const [status, setStatus] = React.useState(null)
      const dropRef = React.useRef(null)

      const zh = locale !== 'en'
      const t = (key) => (zh ? TEXT_ZH : TEXT_EN)[key] || key

      const buildPrompt = (body) => {
        const head = zh ? TEXT_ZH.promptHead : TEXT_EN.promptHead
        const material = body.trim()
        return material ? head + material : head
      }

      const openConversation = () => {
        try {
          ctx.layout.selectPanel('conversation')
        } catch (error) {
          /* Optional service: copying still works without navigation. */
        }
      }

      const copyText = async (payload) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(payload)
          return
        }
        const area = document.createElement('textarea')
        area.value = payload
        area.style.position = 'fixed'
        area.style.opacity = '0'
        document.body.appendChild(area)
        area.select()
        document.execCommand('copy')
        document.body.removeChild(area)
      }

      const readDropped = async (file) => {
        const name = (file.name || '').toLowerCase()
        const textual = /\.(txt|md|markdown|text|csv)$/.test(name) || (file.type || '').startsWith('text/')
        if (!textual) {
          setStatus({ ok: false, text: t('unsupportedFile') })
          return
        }
        try {
          const body = await file.text()
          setText(body)
          setFileName(file.name || '')
          setStatus({ ok: true, text: t('fileLoaded') })
        } catch (error) {
          setStatus({ ok: false, text: t('readFailed') })
        }
      }

      const onDrop = async (event) => {
        event.preventDefault()
        setDragging(false)
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]
        if (file) await readDropped(file)
      }

      const submit = async () => {
        if (!text.trim()) {
          setStatus({ ok: false, text: t('empty') })
          return
        }
        try {
          await copyText(buildPrompt(text))
          setStatus({ ok: true, text: t('copied') })
          openConversation()
        } catch (error) {
          setStatus({ ok: false, text: t('copyFailed') })
        }
      }

      const zoneStyle = {
        ...styles.zone,
        borderColor: dragging ? 'var(--dsw-alias-brand-primary)' : 'var(--dsw-alias-border-l2)',
        background: dragging ? 'var(--dsw-alias-bg-layer-2)' : 'var(--dsw-alias-bg-layer-1)',
      }

      return h(
        'div',
        { style: styles.page },
        h(
          'div',
          { style: styles.inner },
          h('h1', { style: styles.title }, t('title')),
          h('p', { style: styles.subtitle }, t('subtitle')),

          h(
            'div',
            {
              ref: dropRef,
              style: zoneStyle,
              onDragOver: (event) => {
                event.preventDefault()
                setDragging(true)
              },
              onDragLeave: () => setDragging(false),
              onDrop,
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
              h(
                'span',
                { style: styles.zoneHint },
                fileName ? `${fileName} · ${text.length}` : `${text.length} ${t('chars')}`,
              ),
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

          h('p', { style: styles.note }, t('note')),

          h(
            'div',
            { style: styles.actions },
            h('button', { type: 'button', style: styles.primary, onClick: submit }, t('start')),
            h(
              'button',
              {
                type: 'button',
                style: styles.secondary,
                onClick: async () => {
                  try {
                    await copyText(buildPrompt(text))
                    setStatus({ ok: true, text: t('copiedStay') })
                  } catch (error) {
                    setStatus({ ok: false, text: t('copyFailed') })
                  }
                },
              },
              t('copyOnly'),
            ),
            status ? h('span', { style: status.ok ? styles.status : styles.statusError }, status.text) : null,
          ),
        ),
      )
    }

    let ctx

    // The locale snapshot shape is not part of the documented contract, so read
    // it defensively: anything unrecognised falls back to Chinese.
    function currentLocale(context) {
      try {
        const snapshot = context.locale.getLocale()
        const raw =
          typeof snapshot === 'string'
            ? snapshot
            : (snapshot && (snapshot.id || snapshot.locale || snapshot.language)) || 'zh'
        return String(raw).toLowerCase().startsWith('en') ? 'en' : 'zh'
      } catch (error) {
        return 'zh'
      }
    }

    return {
      inject: ['slots', 'locale'],

      apply(context) {
        ctx = context
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
