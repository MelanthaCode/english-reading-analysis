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
      zonePlaceholder: '把英文粘贴到这里，或拖入 txt / md / Word / PDF',
      chars: '字符',
      clear: '清空',
      start: '开始分析',
      running: '正在分析',
      elapsed: '已用时',
      note: '支持 txt、md、Word、PDF（含扫描件）与图片；扫描件会逐页转成图片交给模型识读。',
      empty: '先粘贴英文，或拖入一个文本文件。',
      emptyList: '这里还没有内容',
      fileLoaded: '文件已读入',
      unsupportedFile: '不支持这个格式，目前支持 txt / md / docx / pdf。',
      readFailed: '读取文件失败。',
      extracting: '正在解析',
      pickFile: '选择文件',
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
      pickFolderHint: '选择一个本地文件夹，历史与收藏会以 HTML 文件保存在那里，不上传任何内容。',
      history: '历史',
      favorites: '收藏',
      open: '打开',
      remove: '删除',
      favorite: '收藏',
      favorited: '已收藏',
      savedHistory: '已存入历史',
      storageUnsupported: '当前环境不支持选择文件夹，历史与收藏仅存在于本标签页',
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
      note: 'Accepts txt, md, Word, PDF (scans included) and images; scanned pages are rendered and read by the model.',
      empty: 'Paste the English first, or drop a text file.',
      emptyList: 'Nothing here yet',
      fileLoaded: 'File loaded',
      unsupportedFile: 'Unsupported format — txt / md / docx / pdf only.',
      readFailed: 'Could not read that file.',
      extracting: 'Reading',
      pickFile: 'Choose file',
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
      pickFolderHint: 'Pick a local folder; history and favourites are saved there as HTML files. Nothing is uploaded.',
      history: 'History',
      favorites: 'Favourites',
      open: 'Open',
      remove: 'Remove',
      favorite: 'Favourite',
      favorited: 'Saved',
      savedHistory: 'Saved to history',
      storageUnsupported: 'This environment cannot pick a folder; history stays in this tab only',
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

    // Local storage: the user picks a folder once; results are written there as
    // plain HTML files. The directory handle lives in IndexedDB so the choice
    // survives a reload. Nothing leaves the machine.
    const DB_NAME = 'era-storage'
    const STORE = 'handles'
    const ROOT_DIR = 'ERA-英语阅读分析'

    const idb = () =>
      new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, 1)
        request.onupgradeneeded = () => request.result.createObjectStore(STORE)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })

    const idbGet = async (key) => {
      const db = await idb()
      return new Promise((resolve, reject) => {
        const request = db.transaction(STORE, 'readonly').objectStore(STORE).get(key)
        request.onsuccess = () => resolve(request.result)
        request.onerror = () => reject(request.error)
      })
    }

    const idbSet = async (key, value) => {
      const db = await idb()
      return new Promise((resolve, reject) => {
        const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(value, key)
        request.onsuccess = () => resolve()
        request.onerror = () => reject(request.error)
      })
    }

    const canPickFolder = () => typeof window !== 'undefined' && 'showDirectoryPicker' in window

    const ensurePermission = async (handle) => {
      if (!handle) return false
      const opts = { mode: 'readwrite' }
      if ((await handle.queryPermission(opts)) === 'granted') return true
      return (await handle.requestPermission(opts)) === 'granted'
    }

    const subdir = async (root, name) => root.getDirectoryHandle(name, { create: true })

    const listFiles = async (dir) => {
      const out = []
      for await (const [name, handle] of dir.entries()) {
        if (handle.kind !== 'file' || !name.endsWith('.html')) continue
        const file = await handle.getFile()
        out.push({ name, size: file.size, modified: file.lastModified })
      }
      return out.sort((a, b) => b.modified - a.modified)
    }

    const writeFile = async (dir, name, text) => {
      const handle = await dir.getFileHandle(name, { create: true })
      const writable = await handle.createWritable()
      await writable.write(text)
      await writable.close()
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
      const [images, setImages] = React.useState([])
      const [dragging, setDragging] = React.useState(false)
      const [phase, setPhase] = React.useState('input')
      const [fragment, setFragment] = React.useState('')
      const [fonts, setFonts] = React.useState('')
      const [docCss, setDocCss] = React.useState('')
      const [rawCss, setRawCss] = React.useState('')
      const [pct, setPct] = React.useState(0)
      const [seconds, setSeconds] = React.useState(0)
      const [status, setStatus] = React.useState(null)

      const abortRef = React.useRef(null)
      const fileRef = React.useRef(null)
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

      const refreshLists = React.useCallback(async (handle) => {
        const target = handle || dirHandle
        if (!target) return
        try {
          const root = await subdir(target, ROOT_DIR)
          setHist(await listFiles(await subdir(root, 'history')))
          setFavs(await listFiles(await subdir(root, 'favorites')))
        } catch {
          /* folder may have moved */
        }
      }, [dirHandle])

      React.useEffect(() => {
        let alive = true
        ;(async () => {
          if (!canPickFolder()) return
          try {
            const saved = await idbGet('dir')
            if (!saved) return
            const ok = await ensurePermission(saved)
            if (!alive || !ok) return
            setDirHandle(saved)
            await refreshLists(saved)
          } catch {
            /* ignore */
          }
        })()
        return () => {
          alive = false
        }
      }, [refreshLists])

      const chooseFolder = async () => {
        if (!canPickFolder()) {
          setStoreNote({ ok: false, text: t('storageUnsupported') })
          return
        }
        try {
          const handle = await window.showDirectoryPicker({ mode: 'readwrite', id: 'era-store' })
          const ok = await ensurePermission(handle)
          if (!ok) {
            setStoreNote({ ok: false, text: t('storageDenied') })
            return
          }
          await idbSet('dir', handle)
          setDirHandle(handle)
          await refreshLists(handle)
          setStoreNote({ ok: true, text: t('storageReady') })
        } catch {
          /* user cancelled */
        }
      }

      const persist = async (kind, html, topic) => {
        if (!dirHandle) return false
        try {
          const root = await subdir(dirHandle, ROOT_DIR)
          const dir = await subdir(root, kind)
          await writeFile(dir, `${stamp()}-${safeName(topic)}.html`, html)
          if (kind === 'history') {
            const files = await listFiles(dir)
            for (const extra of files.slice(10)) {
              await dir.removeEntry(extra.name).catch(() => {})
            }
          }
          await refreshLists(dirHandle)
          return true
        } catch {
          return false
        }
      }

      const openSaved = async (kind, name) => {
        try {
          const root = await subdir(dirHandle, ROOT_DIR)
          const dir = await subdir(root, kind)
          const file = await (await dir.getFileHandle(name)).getFile()
          const text = await file.text()
          const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(text)
          setFragment(body ? body[1] : text)
          setPhase('result')
          setPanel(null)
        } catch {
          setStoreNote({ ok: false, text: t('readFailed') })
        }
      }

      const removeSaved = async (kind, name) => {
        try {
          const root = await subdir(dirHandle, ROOT_DIR)
          await (await subdir(root, kind)).removeEntry(name)
          await refreshLists(dirHandle)
        } catch {
          /* ignore */
        }
      }

      const addFavorite = async () => {
        const ok = await persist('favorites', documentFor(fragment, rawCss), topicOf(fragment))
        setStoreNote(ok ? { ok: true, text: t('savedFav') } : { ok: false, text: t('storageNone') })
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

      React.useEffect(() => {
        if (phase !== 'running') return undefined
        const timer = setInterval(() => {
          const elapsed = (Date.now() - startRef.current) / 1000
          setSeconds(Math.round(elapsed))
          const byChars = accRef.current.length / expectedRef.current
          const byTime = (1 - Math.exp(-elapsed / 38)) * 0.92
          const next = Math.min(96, Math.round(Math.max(byChars, byTime) * 100))
          // Never go backwards: the estimate can dip as the expected size settles.
          setPct((prev) => Math.max(prev, next))
        }, 500)
        return () => clearInterval(timer)
      }, [phase])

      const readDropped = async (file) => {
        if (!file) return
        setStatus({ ok: true, text: `${t('extracting')} ${file.name}…` })
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
          if (!response.ok || body.error) {
            setStatus({ ok: false, text: body.error || `HTTP ${response.status}` })
            return
          }
          if (body.images && body.images.length) {
            setImages(body.images)
            setText(body.text || '')
            setFileName(file.name || '')
            setStatus({
              ok: true,
              text: `${file.name} · ${body.images.length} ${t('pagesLoaded')}`,
            })
          } else {
            setImages([])
            setText(body.text || '')
            setFileName(file.name || '')
            setStatus({
              ok: true,
              text: `${file.name} · ${(body.text || '').length} ${t('charsReady')}`,
            })
          }
        } catch (error) {
          setStatus({ ok: false, text: `${t('readFailed')} ${(error && error.message) || error}` })
        }
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

          setFragment(accRef.current)
          setPct(100)
          setPhase('result')
          const topic = topicOf(accRef.current)
          const saved = await persist('history', documentFor(accRef.current, rawCss), topic)
          setStatus({ ok: true, text: saved ? `${t('ready')} · ${t('savedHistory')}` : t('ready') })
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
            const extra = detail.detail ? ` — ${String(detail.detail).slice(0, 200)}` : ''
            throw new Error(`${detail.error || `HTTP ${response.status}`}${extra}`)
          }
          const blob = await response.blob()
          const url = URL.createObjectURL(blob)
          const link = document.createElement('a')
          link.href = url
          link.download = `ERA_${topicOf(fragment)}.pdf`
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

          h(
            'div',
            { style: styles.storeBar },
            h('span', null, `${t('storage')}：${dirHandle ? t('storageReady') : t('storageNone')}`),
            h('button', { type: 'button', style: styles.storeBtn, onClick: chooseFolder }, t('pickFolder')),
            h(
              'button',
              { type: 'button', style: styles.storeBtn, onClick: () => setPanel('history') },
              `${t('history')}${hist.length ? ` (${hist.length})` : ''}`,
            ),
            h(
              'button',
              { type: 'button', style: styles.storeBtn, onClick: () => setPanel('favorites') },
              `${t('favorites')}${favs.length ? ` (${favs.length})` : ''}`,
            ),
            storeNote ? h('span', { style: storeNote.ok ? styles.status : styles.statusError }, storeNote.text) : null,
            !dirHandle ? h('span', { style: { opacity: 0.75 } }, t('pickFolderHint')) : null,
          ),

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
                  h(
                    'span',
                    { style: { display: 'flex', gap: 14 } },
                    h(
                      'label',
                      { htmlFor: 'era-file-input', style: { ...styles.linkButton, cursor: 'pointer' } },
                      t('pickFile'),
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

          panel
            ? h(
                'div',
                { style: styles.overlay, onClick: () => setPanel(null) },
                h(
                  'div',
                  { style: styles.overlayCard, onClick: (event) => event.stopPropagation() },
                  h('h2', { style: { margin: '0 0 10px', fontSize: 15, fontFamily: C.head } },
                    panel === 'history' ? t('history') : t('favorites')),
                  (panel === 'history' ? hist : favs).length === 0
                    ? h('p', { style: { fontSize: 13, color: C.muted } }, t('emptyList'))
                    : (panel === 'history' ? hist : favs).map((item) =>
                        h(
                          'div',
                          { key: item.name, style: styles.listRow },
                          h('span', { style: { overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' } },
                            item.name.replace(/^\d{8}-\d{6}-/, '').replace(/\.html$/, '')),
                          h(
                            'span',
                            { style: { display: 'flex', gap: 8, flexShrink: 0 } },
                            h('button', { type: 'button', style: styles.storeBtn, onClick: () => openSaved(panel, item.name) }, t('open')),
                            h('button', { type: 'button', style: styles.storeBtn, onClick: () => removeSaved(panel, item.name) }, t('remove')),
                          ),
                        ),
                      ),
                  h('div', { style: { marginTop: 12, textAlign: 'right' } },
                    h('button', { type: 'button', style: styles.storeBtn, onClick: () => setPanel(null) }, '×')),
                ),
              )
            : null,
        ),
      )
    }

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
