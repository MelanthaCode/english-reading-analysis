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
    // Colour schemes, kept as data so a scheme can be swapped by name. Mirrored in
    // assets/palette.json for the print stylesheet; see PALETTE below.
    const PALETTES = {
      'searching-for-birds': {
        label: 'Searching for Birds',
        source: 'https://searchingforbirds.visualcinnamon.com/assets/index.css',
        ui: {
          paper: '#f4efe5',      // --background
          paper2: '#faf4ef',     // raised surface
          soft: '#e7decd',       // --background-darker
          ink: '#28211e',        // --text-primary
          muted: '#80766b',      // --text-secondary
          annotate: '#68594f',   // --text-annotation
          faint: '#afa39c',      // --text-muted
          line: '#e9d3bb',
          coral: '#f9564e',      // --primary-color, northern cardinal
          gold: '#ffcc2d',       // --secondary-color, bald eagle
          teal: '#23abab',       // --accent-color
          indigo: '#3a4178',     // common raven
          orange: '#ff923e',     // american robin
          green: '#98cb5f',      // sandhill crane
          blue: '#51aade',       // blue jay
          pink: '#ffa7b4',       // mallard
          sand: '#ccaf91',       // barred owl
          hawk: '#2ac7c7',       // cooper's hawk
          brown: '#592b00',
        },
        formats: {
          PDF: { badge: '#f9564e', bg: '#fff6f4', ink: '#ffffff' },
          DOCX: { badge: '#3a4178', bg: '#f6f6fb', ink: '#ffffff' },
          MD: { badge: '#23abab', bg: '#f4fbfb', ink: '#ffffff' },
          IMG: { badge: '#ffcc2d', bg: '#fffaef', ink: '#ffffff' },
        },
      },
    }

    const ACTIVE_PALETTE = 'searching-for-birds'
    const SCHEME = PALETTES[ACTIVE_PALETTE]

    const C = {
      ...SCHEME.ui,
      head: "'Jost','PingFang SC','Hiragino Sans GB','Microsoft YaHei','Noto Sans CJK SC',system-ui,sans-serif",
      body: "'Zilla Slab',Georgia,'Times New Roman','Songti SC',SimSun,'Noto Serif CJK SC',serif",
    }

    const TEXT_ZH = {
      title: '英语阅读分析',
      subtitle: '英语文章翻译成中文、拆解长难句、给出选择题答案与解析，也可以核对已作答的卷子。',
      zonePlaceholder: '把英文粘贴到这里，或拖入 txt / md / Word / PDF',
      chars: '字符',
      clear: '清空',
      start: '开始分析',
      running: '正在分析',
      elapsed: '已用时',
      empty: '先粘贴英文，或拖入一个文本文件。',
      emptyList: '这里还没有内容',
      fileLoaded: '文件已读入',
      unsupportedFile: '不支持这个格式，目前支持 txt / md / docx / pdf。',
      readFailed: '读取文件失败。',
      extracting: '正在解析',
      pickFile: '选择文件',
      dropHint: '把英文粘贴到这里，或把文件拖进这个框',
      dropNow: '松开即可导入',
      received: '已接收',
      parsing: '正在解析',
      kindText: '文本',
      kindDocx: 'Word 文档',
      kindPdf: 'PDF（文字层）',
      kindScan: '扫描件',
      kindImage: '图片',
      readFail: '读取失败',
      receivedChars: '已收到',
      emptyResult: '模型没有返回任何内容，请重试',
      noFile: '没有收到文件——当前环境可能不允许拖放，请点「选择文件」',
      pickFile: '选择文件',
      or: '或',
      emptyRead: '文件打开了，但没有读到任何文字',
      charsReady: '字符',
      pagesLoaded: '页图片已载入',
      failed: '失败',
      download: '下载 PDF',
      preparing: '正在渲染 PDF…',
      again: '分析下一篇',
      ready: '分析完成',
      paged: '已下载',
      stop: '已停止',
      storage: '本地存储',
      storageNone: '未选择文件夹',
      storageReady: '已连接',
      pickFolder: '选择文件夹',
      changeFolder: '更改本地文件夹',
      pickFolderHint: '选择一个本地文件夹，历史与收藏将会存放在此处',
      changeFolderHint: '可以更改本地文件夹，历史与收藏将会存放在此处',
      history: '历史',
      searchAll: '搜索历史与收藏…',
      noMatch: '没有匹配的结果',
      miniPdf: 'PDF',
      miniRemove: '×',
      favorites: '收藏',
      open: '打开',
      remove: '删除',
      favorite: '收藏',
      favorited: '已收藏',
      savedHistory: '已存入历史',
      storageUnsupported: '当前环境不支持选择文件夹',
      emptyFolder: '这个文件夹里没有支持的文档',
      staleHost: '插件已更新，请完全退出并重启 DeepSeek Harness 后再试',
      opening: '正在打开选择框…',
      storageDenied: '没有获得写入权限',
      savedFav: '已收藏',
      removedFav: '已取消收藏',
    }

    const TEXT_EN = {
      title: 'English Reading Analysis',
      subtitle: 'Translate English passages into Chinese, break down long sentences, and answer multiple-choice questions with explanations — or check a paper you already answered.',
      zonePlaceholder: 'Paste the English here, or drop txt / md / Word / PDF',
      chars: 'characters',
      clear: 'Clear',
      start: 'Analyse',
      running: 'Analysing',
      elapsed: 'elapsed',
      empty: 'Paste the English first, or drop a text file.',
      emptyList: 'Nothing here yet',
      fileLoaded: 'File loaded',
      unsupportedFile: 'Unsupported format — txt / md / docx / pdf only.',
      readFailed: 'Could not read that file.',
      extracting: 'Reading',
      pickFile: 'Choose file',
      dropHint: 'Paste the English here, or drop a file into this box',
      dropNow: 'Release to import',
      received: 'Received',
      parsing: 'reading',
      kindText: 'text',
      kindDocx: 'Word document',
      kindPdf: 'PDF (text layer)',
      kindScan: 'scanned pages',
      kindImage: 'image',
      readFail: 'Could not read',
      receivedChars: 'received',
      emptyResult: 'The model returned nothing — try again',
      noFile: 'No file received — dragging may be blocked here; use “Choose file”',
      pickFile: 'Choose file',
      or: 'or',
      emptyRead: 'The file opened but no text was found in it',
      charsReady: 'characters',
      pagesLoaded: 'page images loaded',
      failed: 'Failed',
      download: 'Download PDF',
      preparing: 'Rendering PDF…',
      again: 'Analyse next',
      ready: 'Done',
      paged: 'Downloaded',
      stop: 'Stopped',
      storage: 'Local storage',
      storageNone: 'No folder selected',
      storageReady: 'Connected',
      pickFolder: 'Choose folder',
      changeFolder: 'Change folder',
      pickFolderHint: 'Pick a local folder; history and favourites are stored there',
      changeFolderHint: 'You can change the folder; history and favourites live there',
      history: 'History',
      searchAll: 'Search history and favourites…',
      noMatch: 'No matches',
      miniPdf: 'PDF',
      miniRemove: '×',
      favorites: 'Favourites',
      open: 'Open',
      remove: 'Remove',
      favorite: 'Favourite',
      favorited: 'Saved',
      savedHistory: 'Saved to history',
      storageUnsupported: 'This environment cannot pick a folder',
      emptyFolder: 'No supported documents in that folder',
      staleHost: 'The plugin was updated — quit and restart DeepSeek Harness to load it',
      opening: 'Opening the picker…',
      storageDenied: 'Write permission was not granted',
      savedFav: 'Saved to favourites',
      removedFav: 'Removed from favourites',
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
      dropHint: {
        position: 'absolute',
        inset: 0,
        zIndex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        pointerEvents: 'none',
        color: C.muted,
        fontFamily: C.head,
        fontSize: 13,
        transition: 'transform 180ms ease, color 180ms ease',
      },
      dropIcon: {
        transition: 'transform 200ms ease, opacity 200ms ease',
      },
      searchWrap: { marginTop: 18 },
      columns: {
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 26,
        alignItems: 'start',
      },
      searchWide: {
        width: '100%',
        boxSizing: 'border-box',
        border: 'none',
        borderBottom: `1px solid ${C.line}`,
        background: 'transparent',
        color: C.ink,
        borderRadius: 0,
        padding: '8px 2px',
        fontSize: 13,
        fontFamily: C.head,
        outline: 'none',
        marginBottom: 4,
      },
      listHead: {
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'space-between',
        marginTop: 16,
        marginBottom: 4,
        fontFamily: C.head,
        fontSize: 12,
        letterSpacing: '.08em',
        color: C.muted,
        textTransform: 'uppercase',
      },
      listItem: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '7px 0',
        borderBottom: `1px solid ${C.line}`,
        fontSize: 13,
      },
      index: {
        width: 22,
        flexShrink: 0,
        textAlign: 'right',
        color: C.coral,
        fontFamily: C.head,
        fontVariantNumeric: 'tabular-nums',
        fontSize: 12,
      },
      itemName: {
        flex: 1,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        cursor: 'pointer',
        color: C.ink,
      },
      itemActions: { display: 'flex', gap: 4, flexShrink: 0 },
      miniBtn: {
        border: 'none',
        background: 'transparent',
        color: C.muted,
        cursor: 'pointer',
        fontSize: 12,
        fontFamily: C.head,
        padding: '2px 5px',
      },
      star: {
        border: `1px solid ${C.line}`,
        background: C.paper2,
        borderRadius: 8,
        width: 40,
        height: 40,
        fontSize: 19,
        lineHeight: 1,
        cursor: 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'color 160ms ease, background 160ms ease',
      },
      zoneRunning: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 14,
        padding: '40px 28px',
        minHeight: 190,
        fontFamily: C.head,
        color: C.ink,
      },
      zoneRunningTitle: { fontSize: 14, letterSpacing: '.01em' },
      zoneRunningMeta: { fontSize: 12, color: C.muted, fontVariantNumeric: 'tabular-nums' },
      bannerOk: {
        marginTop: 12,
        padding: '9px 12px',
        borderRadius: 8,
        background: 'rgba(152,203,95,.14)',
        border: `1px solid rgba(152,203,95,.45)`,
        color: '#4a6b28',
        fontSize: 12.5,
        lineHeight: 1.6,
        fontFamily: C.head,
        wordBreak: 'break-word',
      },
      bannerErr: {
        marginTop: 12,
        padding: '9px 12px',
        borderRadius: 8,
        background: 'rgba(249,86,78,.10)',
        border: `1px solid rgba(249,86,78,.45)`,
        color: '#9d2700',
        fontSize: 12.5,
        lineHeight: 1.6,
        fontFamily: C.head,
        wordBreak: 'break-word',
      },
      storeBar: {
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        flexWrap: 'wrap',
        fontSize: 12,
        color: C.muted,
        fontFamily: C.head,
        marginTop: 10,
      },
      storeBtn: {
        border: `1px solid ${C.line}`,
        background: C.paper2,
        color: C.ink,
        borderRadius: 6,
        padding: '4px 10px',
        fontSize: 12,
        cursor: 'pointer',
        fontFamily: C.head,
      },
      overlay: {
        position: 'fixed',
        inset: 0,
        background: 'rgba(47,38,32,.35)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 20,
      },
      overlayCard: {
        width: 'min(560px, 90vw)',
        maxHeight: '70vh',
        overflowY: 'auto',
        background: C.paper2,
        border: `1px solid ${C.line}`,
        borderRadius: 12,
        padding: '18px 20px',
        boxShadow: '0 12px 40px rgba(47,38,32,.25)',
        fontFamily: C.head,
      },
      listRow: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        padding: '7px 0',
        borderBottom: `1px solid ${C.line}`,
        fontSize: 12.5,
      },
    }

    // The owner's own artwork, mirrored verbatim: same paths, stroke width,
    // colour and viewBox as dsh-plugin/icon.svg. No design adjustments here.
    const ICON_PATHS = [
      'M19.6055 3.30435L2.69885 51.4442',
      'M29.106 30.6454L10.4439 30.6454',
      'M19.8117 3.30435L36.7184 51.4442',
      'M19.8117 3.30435L36.7184 51.4442',
      'M76.5756 39.3752L39.687 39.3752',
      'M73.3386 39.6943L40.4074 76.2681',
      'M73.3386 39.6943L40.4074 76.2681',
      'M43.3063 39.8324L76.2375 76.4062',
      'M56.7278 26.2265L59.1961 32.847',
    ]
    const ICON_STROKE = 4.5
    const ICON_COLOR = '#000000'
    const ICON_VIEWBOX = '0 0 79.2 79.2'

    function SidebarIcon(props) {
      const size = (props && props.size) || 20
      return h(
        'svg',
        {
          width: size,
          height: size,
          viewBox: ICON_VIEWBOX,
          fill: 'none',
          stroke: ICON_COLOR,
          strokeWidth: ICON_STROKE,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': true,
          style: { display: 'block' },
        },
        ICON_PATHS.map((d, i) => h('path', { key: i, d })),
      )
    }

    const escapeHtml = (text) =>
      String(text).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]))

    /** Pull a short Chinese topic out of the rendered document for the filename. */
    function topicOf(fragment) {
      const flat = (value) => String(value).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
      const html = String(fragment || '')
      const heading = /<h1[^>]*>([\s\S]*?)<\/h1>/i.exec(html) || /<h2[^>]*>([\s\S]*?)<\/h2>/i.exec(html)
      let title = heading ? flat(heading[1]) : flat(html).slice(0, 40)
      title = title.replace(/^文章\s*\d+\s*[：:·\-]?\s*/, '')
      const afterColon = /[：:]\s*(.+)$/.exec(title)
      if (afterColon) title = afterColon[1]
      const parenthetical = /[（(]([^）)]{2,24})[）)]/.exec(title)
      if (parenthetical) title = parenthetical[1]
      title = title.replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, ' ').trim()
      return (title || '英语阅读分析').slice(0, 24)
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

    // Local storage lives on the Host: this shell blocks the browser's file
    // dialogs, so the folder is chosen through DSH's own picker and every read or
    // write goes through an HTTP route instead of a FileSystemHandle.
    const pickDir = async () => {
      const ws = appContext && (appContext.uiWorkspace || (appContext.get && appContext.get('uiWorkspace')))
      if (ws && typeof ws.pickDirectory === 'function') {
        try {
          return await ws.pickDirectory()
        } catch {
          return null
        }
      }
      return null
    }

    const postJson = async (path, body) => {
      const response = await fetch(`${API}${path}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body || {}),
      })
      const data = await response.json().catch(() => ({}))
      return { ok: response.ok, status: response.status, data }
    }

    /** First file in a drag, whichever way the platform exposes it. */
    const fileFromTransfer = (transfer) => {
      if (!transfer) return null
      if (transfer.files && transfer.files.length) return transfer.files[0]
      if (transfer.items && transfer.items.length) {
        for (const item of transfer.items) {
          if (item.kind === 'file') {
            const file = item.getAsFile && item.getAsFile()
            if (file) return file
          }
        }
      }
      return null
    }

    const formatBytes = (bytes) => {
      const n = Number(bytes || 0)
      if (n < 1024) return `${n} B`
      if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
      return `${(n / 1024 / 1024).toFixed(2)} MB`
    }

    const stamp = () => {
      const d = new Date()
      const pad = (n) => String(n).padStart(2, '0')
      return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
    }

    const safeName = (text) => String(text || 'untitled').replace(/[\\/:*?"<>|\s]+/g, '-').slice(0, 40)

    function Panel({ locale }) {
      const zh = locale !== 'en'
      const t = (key) => (zh ? TEXT_ZH : TEXT_EN)[key] || key

      const [text, setText] = React.useState('')
      const [fileName, setFileName] = React.useState('')
      const [fileMeta, setFileMeta] = React.useState(null)
      const [images, setImages] = React.useState([])
      const [dragging, setDragging] = React.useState(false)
      const [loaded, setLoaded] = React.useState(false)
      const [reading, setReading] = React.useState(false)
      const [phase, setPhase] = React.useState('input')
      const [fragment, setFragment] = React.useState('')
      const [fonts, setFonts] = React.useState('')
      const [docCss, setDocCss] = React.useState('')
      const [rawCss, setRawCss] = React.useState('')
      const [pct, setPct] = React.useState(0)
      const [seconds, setSeconds] = React.useState(0)
      const [status, setStatus] = React.useState(null)
      const [storeDir, setStoreDir] = React.useState(null)
      const [query, setQuery] = React.useState('')
      const [hist, setHist] = React.useState([])
      const [favs, setFavs] = React.useState([])
      const [storeNote, setStoreNote] = React.useState(null)
      const [pdfTitle, setPdfTitle] = React.useState('')

      const dragDepth = React.useRef(0)
      const zoneRef = React.useRef(null)
      const abortRef = React.useRef(null)
      const fileRef = React.useRef(null)
      const accRef = React.useRef('')
      const startRef = React.useRef(0)
      const expectedRef = React.useRef(2000)
      const hostRef = React.useRef(null)

      // Attached to the box itself, in the capture phase: the textarea inside it
      // cannot swallow the drop, and nothing outside the box is a drop target.
      React.useEffect(() => {
        const node = zoneRef.current
        if (!node) return
        const isFileDrag = (event) => {
          const types = event.dataTransfer && event.dataTransfer.types
          return Boolean(types && Array.prototype.includes.call(types, 'Files'))
        }
        const onDragOver = (event) => {
          if (!isFileDrag(event)) return
          event.preventDefault()
          if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
          setDragging(true)
        }
        const onDragLeave = (event) => {
          if (!node.contains(event.relatedTarget)) setDragging(false)
        }
        const onDropEvent = (event) => {
          event.preventDefault()
          event.stopPropagation()
          setDragging(false)
          const file = fileFromTransfer(event.dataTransfer)
          if (!file) {
            setStatus({ ok: false, text: t('noFile') })
            return
          }
          readDropped(file)
        }
        node.addEventListener('dragenter', onDragOver, true)
        node.addEventListener('dragover', onDragOver, true)
        node.addEventListener('dragleave', onDragLeave, true)
        node.addEventListener('drop', onDropEvent, true)
        return () => {
          node.removeEventListener('dragenter', onDragOver, true)
          node.removeEventListener('dragover', onDragOver, true)
          node.removeEventListener('dragleave', onDragLeave, true)
          node.removeEventListener('drop', onDropEvent, true)
        }
      }, [phase])   // the box only exists in the input phase; re-attach when it returns

      React.useEffect(
        () => () => {
          if (abortRef.current) abortRef.current.abort()
        },
        [],
      )

      const refreshLists = React.useCallback(async () => {
        const { ok, status, data } = await postJson('/store/list')
        if (status === 405) {
          // The routes were added in 1.8.0; a running Host from an older build
          // answers 405 for unknown POST paths.
          setStoreNote({ ok: false, text: t('staleHost') })
          return
        }
        if (!ok) return
        setStoreDir(data.dir || null)
        setHist(data.history || [])
        setFavs(data.favorites || [])
      }, [])

      React.useEffect(() => {
        // First run: the Host creates Documents/ERA-英语阅读分析 so history works
        // without a prompt; the bar shows the path and offers to change it.
        ;(async () => {
          const list = await postJson('/store/list')
          if (list.ok && list.data.dir) {
            setStoreDir(list.data.dir)
            setHist(list.data.history || [])
            setFavs(list.data.favorites || [])
            return
          }
          const created = await postJson('/store/config', {})
          if (created.ok) {
            setStoreDir(created.data.dir)
            refreshLists()
          }
        })()
      }, [refreshLists])

      // Advance the bar while the stream is open: by characters received, and by
      // time so a slow first token still moves it. Monotonic, capped at 96%.
      React.useEffect(() => {
        if (phase !== 'running') return
        const id = setInterval(() => {
          const elapsed = (Date.now() - startRef.current) / 1000
          setSeconds(Math.floor(elapsed))
          const byChars = accRef.current.length / Math.max(1, expectedRef.current)
          const byTime = (1 - Math.exp(-elapsed / 38)) * 0.92
          const next = Math.min(96, Math.round(Math.max(byChars, byTime) * 100))
          setPct((prev) => Math.max(prev, next))
        }, 500)
        return () => clearInterval(id)
      }, [phase])

      const chooseFolder = async () => {
        setStoreNote({ ok: true, text: t('opening') })
        const dir = await pickDir()
        if (!dir) setStoreNote(null)
        if (!dir) return
        const { ok, data } = await postJson('/store/config', { dir })
        if (!ok) {
          setStoreNote({ ok: false, text: data.error || t('readFailed') })
          return
        }
        setStoreDir(data.dir)
        await refreshLists()
        setStoreNote(null)
      }

      const persist = async (kind, html, topic, name) => {
        if (!storeDir) return false
        if (!name) name = `${stamp()}-${safeName(topic)}.html`
        const { ok } = await postJson('/store/write', { kind, name, html })
        if (ok) await refreshLists()
        return ok
      }

      const bodyOf = (html) => {
        const m = /<body[^>]*>([\s\S]*)<\/body>/i.exec(String(html || ''))
        return m ? m[1] : String(html || '')
      }

      const readSaved = async (kind, name) => {
        const { ok, data } = await postJson('/store/read', { kind, name })
        if (!ok) throw new Error(data.error || 'read failed')
        return bodyOf(data.html)
      }

      const openSaved = async (kind, name) => {
        try {
          setFragment(await readSaved(kind, name))
          setPdfTitle(name.replace(/^\d{8}-\d{6}-/, '').replace(/\.html$/, ''))
          setPhase('result')
          setStatus({ ok: true, text: t('ready') })
        } catch (error) {
          setStoreNote({ ok: false, text: String(error.message || error) })
        }
      }

      const downloadSaved = async (kind, name) => {
        try {
          const topic = name.replace(/^\d{8}-\d{6}-/, '').replace(/\.html$/, '')
          await renderPdf(await readSaved(kind, name), `ERA_${topic}`)
        } catch (error) {
          setStoreNote({ ok: false, text: String(error.message || error) })
        }
      }

      const removeSaved = async (kind, name) => {
        await postJson('/store/remove', { kind, name })
        await refreshLists()
      }

      const favoriteName = fragment ? `${safeName(topicOf(fragment))}.html` : ''
      const isFavorite =
        Boolean(favoriteName) &&
        favs.some((item) => item.name === favoriteName || item.name.endsWith(`-${favoriteName}`))

      const toggleFavorite = async () => {
        if (!favoriteName) return
        if (isFavorite) {
          const existing = favs.find(
            (item) => item.name === favoriteName || item.name.endsWith(`-${favoriteName}`),
          )
          if (existing) await removeSaved('favorites', existing.name)
          setStoreNote(null)
          return
        }
        const ok = await persist('favorites', documentFor(fragment, rawCss), topicOf(fragment), favoriteName)
        setStoreNote(ok ? null : { ok: false, text: t('storageNone') })
      }

      const applyExtract = (data, name, size) => {
        const label =
          data.kind === 'scan'
            ? t('kindScan')
            : data.kind === 'image'
            ? t('kindImage')
            : data.kind === 'pdf'
            ? t('kindPdf')
            : data.kind === 'docx'
            ? t('kindDocx')
            : t('kindText')
        setFileName(name || '')
        setFileMeta(size ? { size } : null)
        const charCount = (data.text || '').length
        if (!charCount && !(data.images && data.images.length)) {
          setLoaded(false)
          setStatus({ ok: false, text: `${name} · ${label} · ${t('emptyRead')}` })
          return
        }
        setImages(data.images || [])
        setText(data.text || '')
        setLoaded(true)
        // No banner on success: the text itself, the green box and the footer
        // (name · size · characters) already say what happened.
        setStatus(null)
      }

      const loadCss = React.useCallback(async () => {
        if (docCss) return
        try {
          const response = await fetch(`${API}/style.css`)
          const raw = await response.text()
          const faces = (raw.match(/@font-face\{[\s\S]*?\}\s*/g) || []).join('\n')
          setFonts(faces)
          setRawCss(raw)
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

      /** Read a dropped file through the Host, reporting size and outcome. */
      const readDropped = async (file) => {
        const sizeLabel = formatBytes(file.size)
        setReading(true)
        setFileName(file.name)
        setFileMeta({ size: file.size })
        setStatus({ ok: true, text: `${t('received')} ${file.name}（${sizeLabel}），${t('parsing')}…` })
        try {
          const buffer = await file.arrayBuffer()
          const bytes = new Uint8Array(buffer)
          let binary = ''
          const chunk = 0x8000
          for (let i = 0; i < bytes.length; i += chunk) {
            binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunk))
          }
          const response = await fetch(`${API}/extract`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ name: file.name, data: btoa(binary) }),
          })
          const body = await response.json().catch(() => ({}))
          if (response.status === 405) {
            setStatus({ ok: false, text: `${file.name}（${sizeLabel}）· ${t('staleHost')}` })
            return
          }
          if (!response.ok || body.error) {
            setStatus({
              ok: false,
              text: `${file.name}（${sizeLabel}）${t('readFail')}：${body.error || `HTTP ${response.status}`}`,
            })
            return
          }
          applyExtract(body, file.name, file.size)
        } catch (error) {
          setStatus({
            ok: false,
            text: `${file.name}（${sizeLabel}）${t('readFail')}：${(error && error.message) || error}`,
          })
        } finally {
          setReading(false)
        }
      }

      const renderList = (title, items, kind) => {
        const q = query.trim().toLowerCase()
        const shown = q ? items.filter((item) => item.name.toLowerCase().includes(q)) : items
        return h(
          'div',
          { key: kind },
          h('div', { style: styles.listHead }, h('span', null, title), h('span', null, String(items.length))),
          shown.length === 0
            ? h('div', { style: { fontSize: 12.5, color: C.muted, padding: '8px 0' } }, q ? t('noMatch') : t('emptyList'))
            : shown.map((item, index) =>
                h(
                  'div',
                  { key: item.name, style: styles.listItem },
                  h(
                    'span',
                    { style: { ...styles.index, color: index < 3 ? C.coral : C.muted } },
                    String(index + 1).padStart(2, '0'),
                  ),
                  h(
                    'span',
                    { style: styles.itemName, title: item.name, onClick: () => openSaved(kind, item.name) },
                    item.name.replace(/^\d{8}-\d{6}-/, '').replace(/\.html$/, ''),
                  ),
                  h(
                    'span',
                    { style: styles.itemActions },
                    h('button', { type: 'button', style: styles.miniBtn, onClick: () => downloadSaved(kind, item.name) }, t('miniPdf')),
                    h('button', { type: 'button', style: styles.miniBtn, onClick: () => removeSaved(kind, item.name) }, t('miniRemove')),
                  ),
                ),
              ),
        )
      }

      const analyse = async () => {
        const material = text.trim()
        if (!material && !images.length) {
          setStatus({ ok: false, text: t('empty') })
          return
        }

        const controller = new AbortController()
        abortRef.current = controller
        accRef.current = ''
        startRef.current = Date.now()
        expectedRef.current = Math.max(1500, Math.min(22000, material.length * 4.2))
        setFragment('')
        setPct(1)
        setSeconds(0)
        setStatus(null)
        setPhase('running')
        await loadCss()

        try {
          const response = await fetch(`${API}/analyze`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ text: material, images }),
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

          if (!accRef.current.trim()) {
            throw new Error(t('emptyResult'))
          }

          setFragment(accRef.current)
          setPct(100)
          setPhase('result')
          const topic = topicOf(accRef.current)
          await persist('history', documentFor(accRef.current, rawCss), topic)
          setStatus(null)
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

      const renderPdf = async (html, fileBase) => {
        if (!String(html || '').trim()) return
        setStatus({ ok: true, text: t('preparing') })
        try {
          const response = await fetch(`${API}/pdf`, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ html, title: t('title') }),
          })
          if (!response.ok) {
            const detail = await response.json().catch(() => ({}))
            const extra = detail.detail ? ` — ${String(detail.detail).slice(0, 200)}` : ''
            throw new Error(`${detail.error || `HTTP ${response.status}`}${extra}`)
          }
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `${fileBase || `ERA_${topicOf(fragment)}`}.pdf`
          document.body.appendChild(link)
          link.click()
          document.body.removeChild(link)
          setTimeout(() => URL.revokeObjectURL(url), 4000)
          setStatus({ ok: true, text: t('paged') })
        } catch (error) {
          setStatus({ ok: false, text: `${t('failed')}：${(error && error.message) || error}` })
        }
      }

      const downloadPdf = () => renderPdf(fragment, `ERA_${pdfTitle || topicOf(fragment)}`)

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

          h(
            'div',
            { style: styles.storeBar },
            h(
              'span',
              { style: { maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }, title: storeDir || '' },
              `${t('storage')}：${storeDir || t('storageNone')}`,
            ),
            h('button', { type: 'button', style: styles.storeBtn, onClick: chooseFolder },
              storeDir ? t('changeFolder') : t('pickFolder')),
            storeNote ? h('span', { style: storeNote.ok ? styles.status : styles.statusError }, storeNote.text) : null,
            h('span', { style: { opacity: 0.75 } }, storeDir ? t('changeFolderHint') : t('pickFolderHint')),
          ),

          phase !== 'result'
            ? h(
                'div',
                {
                  ref: zoneRef,
                  style: {
                    ...styles.zone,
                    position: 'relative',
                    borderStyle: 'dashed',
                    borderWidth: 1.5,
                    borderColor: dragging ? C.coral : loaded ? 'rgba(152,203,95,.85)' : '#d9c9b2',
                    background: dragging ? '#fdf1ec' : loaded ? 'rgba(152,203,95,.07)' : C.paper2,
                    boxShadow: dragging
                      ? '0 0 0 4px rgba(249,86,78,.10)'
                      : loaded
                      ? '0 0 0 4px rgba(152,203,95,.12)'
                      : 'none',
                    transform: dragging ? 'scale(1.004)' : 'scale(1)',
                    transition: 'border-color 160ms ease, background 160ms ease, box-shadow 160ms ease, transform 160ms ease',
                  },
                  onDragEnter: (event) => {
                    event.preventDefault()
                    dragDepth.current += 1
                    setDragging(true)
                  },
                  onDragOver: (event) => {
                    event.preventDefault()
                    event.dataTransfer.dropEffect = 'copy'
                    if (!dragging) setDragging(true)
                  },
                  onDragLeave: () => {
                    dragDepth.current = Math.max(0, dragDepth.current - 1)
                    if (dragDepth.current === 0) setDragging(false)
                  },
                },
                busy || reading
                  ? h(
                      'div',
                      { style: styles.zoneRunning },
                      h('div', { style: styles.zoneRunningTitle },
                        reading
                          ? `${t('parsing')} ${fileName}${fileMeta ? `（${formatBytes(fileMeta.size)}）` : ''}…`
                          : `${t('running')} · ${pct}%${fragment ? ` · ${t('receivedChars')} ${fragment.length}` : ''}`),
                      reading
                        ? h('div', { style: styles.track }, h('div', { style: { ...styles.fill, width: '35%', opacity: 0.65 } }))
                        : h('div', { style: styles.track }, h('div', { style: { ...styles.fill, width: `${pct}%` } })),
                      reading
                        ? null
                        : h('div', { style: styles.zoneRunningMeta }, `${t('elapsed')} ${seconds}s`),
                    )
                  : null,
                !text && !busy && !reading
                  ? h(
                      'div',
                      { style: { ...styles.dropHint, color: dragging ? C.coral : C.muted } },
                      h(
                        'div',
                        {
                          style: {
                            display: 'flex',
                            gap: 14,
                            transform: dragging ? 'translateY(-3px) scale(1.04)' : 'none',
                            transition: 'transform 200ms ease',
                            opacity: dragging ? 1 : 0.92,
                          },
                        },
                        FORMAT_ICONS.map((item) =>
                          h('span', { key: item.label }, docBadge(item.label, item.color, item.bg, item.ink)),
                        ),
                      ),
                      h('span', null, dragging ? t('dropNow') : t('dropHint')),
                    )
                  : null,
                busy || reading ? null : h('textarea', {
                  style: styles.zoneInput,
                  value: text,
                  onChange: (event) => {
                    setText(event.target.value)
                    setFileName('')
                    setFileMeta(null)
                    setLoaded(false)
                    setStatus(null)
                  },
                }),
                h(
                  'div',
                  { style: styles.zoneFooter },
                  h(
                    'span',
                    { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' } },
                    fileName
                      ? `${fileName}${fileMeta ? ` · ${formatBytes(fileMeta.size)}` : ''} · ${text.length} ${t('chars')}`
                      : `${text.length} ${t('chars')}`,
                  ),
                  h(
                    'span',
                    { style: { display: 'flex', gap: 14, alignItems: 'center' } },
                    text
                      ? h(
                          'button',
                          {
                            type: 'button',
                            style: styles.linkButton,
                            onClick: () => {
                              setText('')
                              setFileName('')
                              setImages([])
                              setStatus(null)
                            },
                          },
                          t('clear'),
                        )
                      : null,
                  ),
                ),
              )
            : null,

          status && !status.ok
            ? h('div', { style: styles.bannerErr }, status.text)
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
          ),

          phase === 'running'
            ? null
            : h(
                'div',
                { style: styles.searchWrap },
                h('input', {
                  style: styles.searchWide,
                  value: query,
                  placeholder: t('searchAll'),
                  onChange: (event) => setQuery(event.target.value),
                }),
                h(
                  'div',
                  { style: styles.columns },
                  renderList(t('history'), hist, 'history'),
                  renderList(t('favorites'), favs, 'favorites'),
                ),
              ),
        ),
      )
    }

    /** A squat document card with a coloured format badge; drawn inline, no assets. */
    const docBadge = (label, color, bg, ink) =>
      h(
        'svg',
        { width: 72, height: 64, viewBox: '0 0 72 64', fill: 'none' },
        h('path', {
          d: 'M12 3h37l12 12v41a5 5 0 0 1-5 5H12a5 5 0 0 1-5-5V8a5 5 0 0 1 5-5z',
          fill: bg,
          stroke: '#cdb79b',
          strokeWidth: 1.4,
        }),
        h('path', { d: 'M49 3v12h12', stroke: '#cdb79b', strokeWidth: 1.4, fill: 'none' }),
        h('rect', { x: 8, y: 27, width: 56, height: 21, rx: 6, fill: color }),
        h(
          'text',
          {
            x: 36,
            y: 42.2,
            textAnchor: 'middle',
            fontSize: 13,
            fontWeight: 700,
            fill: ink || '#ffffff',
            fontFamily: 'Jost, ui-sans-serif, system-ui, sans-serif',
            letterSpacing: 0.4,
          },
          label,
        ),
      )

    const FORMAT_ICONS = ['PDF', 'DOCX', 'MD', 'IMG'].map((label) => ({
      label,
      color: SCHEME.formats[label].badge,
      bg: SCHEME.formats[label].bg,
      ink: SCHEME.formats[label].ink,
    }))

    function documentFor(fragment, css) {
      return (
        '<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">' +
        `<title>${escapeHtml(topicOf(fragment))}</title>` +
        `<style>${css || ''}</style></head>` +
        `<body>${sanitize(fragment)}</body></html>`
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

    // Kept so panel callbacks can reach Client services (the native folder picker).
    let appContext = null

    return {
      inject: ['slots', 'locale', 'uiWorkspace'],

      apply(context) {
        appContext = context
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
