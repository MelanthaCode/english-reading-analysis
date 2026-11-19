# Changelog

## 1.10.0 — 2026-11-19

- The palette now comes verbatim from searchingforbirds.visualcinnamon.com: its
  CSS variables (`#f9564e`, `#ffcc2d`, `#23abab`, `#f4efe5`, `#e7decd`, `#28211e`,
  `#80766b`, `#e9d3bb`) plus its per-species colours, shared by the panel and the
  print stylesheet.
- The IMG badge uses the site's gold with dark brown ink, which is how it treats a
  highlight colour; the other three keep white ink.

## 1.9.6 — 2026-11-19

- Format badges are 72×64, with the badge re-centred for the taller card.

## 1.9.5 — 2026-11-19

- Format badges are 72×60 now — a little taller than the previous 72×56.

## 1.9.4 — 2026-11-19

- The four format badges are squat cards now (72×56) with larger labels, instead
  of tall thin sheets.

## 1.9.3 — 2026-11-19

- The drop zone shows four hand-drawn document badges (PDF / DOCX / MD / IMG)
  above the prompt, and the row lifts while a file hovers over the box.
- The storage bar no longer repeats the path: left is the path, right is the
  "you can change the folder" hint.

## 1.9.2 — 2026-11-19

- History and favourites sit side by side again, still unboxed, under the single
  search field.
- The folder hint now reads "把历史与收藏存放在此处" instead of explaining the file
  format and the upload behaviour.

## 1.9.1 — 2026-11-19

- History and favourites are plain lists on the page instead of boxed cards:
  a ranked list with the first three numbers in coral, separated by hairlines and
  scrolling with the page.
- One search field filters both lists at once.

## 1.9.0 — 2026-11-19

- History and favourites are two inline columns under the action buttons instead
  of a modal: left is history, right is favourites, each with a live fuzzy search
  that filters as you type.
- Each row opens on click; PDF and remove are small inline actions.

## 1.8.3 — 2026-11-19

- The input box is a drop target now: dashed border, a document icon and
  "drop a file here" in the middle, and the box tints coral, lifts slightly and
  says "release to import" while a file hovers over it.
- The "choose file" button and its folder-listing flow are gone; dragging is the
  documented way to bring a file in.

## 1.8.2 — 2026-11-19

- The file list rows are clickable as a whole, not just the small button, so a
  PDF is selected by clicking anywhere on its row.
- The storage bar shows the chosen folder path and the button turns into
  "change local folder", which is how the root directory is switched.
- Dropped the format hint line under the input box.

## 1.8.1 — 2026-11-18

- A running Host from an older build answers 405 for the new routes; the panel now
  detects that and says "restart DeepSeek Harness" instead of a generic failure.
- Choosing a folder or a file shows "opening the picker…" immediately, since the
  native dialog can take a moment to appear.

## 1.8.0 — 2026-11-17

- **File and folder picking now goes through DSH's own native picker.** This shell
  blocks the browser's file dialogs, so "choose file" could never open one; the
  panel now asks the Host to pick a folder and lists the documents inside it.
- Storage moved to the Host as well: the folder path is sent once, and history,
  favourites, reads and deletes are Host routes. No FileSystemHandle, no
  IndexedDB, and it works in any shell.
- Fixed: `webServer.getOrigin` is not present on every server implementation — an
  unguarded call aborted the whole route registration.

## 1.7.2 — 2026-11-17

- **Fixed a blank panel** introduced in 1.7.0: the storage state hooks and five
  style keys were referenced but never declared, so the component threw on its
  first render and the slot stayed empty.
- Added `tests/render-smoke.mjs`, which renders the panel against a stub React and
  fails when a `styles.*` or `t('…')` key is missing — both were silent failures
  that a syntax check cannot catch. Wired into the cross-platform workflow.

## 1.7.1 — 2026-11-17

- History and favourites entries can now be downloaded straight to PDF from the
  list, without loading them into the panel first. Opening one restores the
  result view and reuses the same PDF path.
- Directory permission is re-checked before every read or write, so a restored
  folder handle prompts once instead of failing silently.

## 1.7.0 — 2026-11-17

- **Local history and favourites.** Pick a folder once; every finished analysis is
  written there as a standalone HTML file (with the print stylesheet inline), the
  last 10 are kept, and anything starred is kept indefinitely. The folder handle
  is remembered in IndexedDB; nothing is uploaded.
- Fixed: "Choose file" did nothing — a hidden input clicked from JS is blocked in
  this shell, so the button is now a native `<label>` bound to the input.
- Fixed: the progress bar could move backwards (the time estimate dipped below
  the initial 2%); it is monotonic now.
- Fixed: PDF failures showed a bare "渲染失败". The client now shows the server's
  detail, and the host tries `python3`, `python` and `py` instead of one name.

## 1.6.3 — 2026-11-17

- **Security fix**, reported by the awesome-dsh-plugin reviewer: the plugin's
  HTTP routes had no access check, so any web page open in the browser could post
  to `127.0.0.1` and spend the user's model quota. Every route now requires a
  same-origin request: `Sec-Fetch-Site` must be same-origin, the `Host` must be a
  loopback address (blocks DNS rebinding), and any `Origin` must equal the
  server's own origin.

## 2026-11-14 — first npm release

`dsh-skill-english-reading@1.6.2` is live on npm (author: Melantha, MIT).
`dsh plugin add dsh-skill-english-reading` installs the bundle; the catalog entry
is open at awesome-dsh-plugin/awesome-dsh-plugin#15327.

## 1.0.3 — 2026-11-14

**Graceful degradation beyond the three supported systems.** Windows, macOS and Linux stay the contract, but unsupported or locked-down environments (WSL, Alpine, FreeBSD, Termux, Safari-only macOS, corporate machines) no longer dead-end.

- Renderer chain: Chromium-family browser → `weasyprint` → `wkhtmltopdf`, with `--engine` to force one.
- `RENDER_PDF_BROWSER` environment variable as a container/CI escape hatch, alongside `--chrome`.
- An explicitly requested renderer that does not exist now fails with exit 3 instead of silently falling back to a different browser.
- `--check` also reports `weasyprint`, `wkhtmltopdf` and the chosen `engine`, with three statuses: `ready for PDF rendering`, `ready, but DEGRADED`, `NO RENDERER`.
- Documented exit codes (2 input missing, 3 no engine, 4 timeout, 5 no output) so an agent can branch instead of parsing prose.
- New `references/platform-fallback.md`: a four-tier decision chain addressed to the agent, with per-environment notes (WSL path translation, Alpine packages, ARM, Termux, locked machines) and reply templates.
- `SKILL.md`: PDF is explicitly *not* a precondition for delivery; HTML output is a valid final state.
- New `tests/test_engines.py`, run on all three CI runners: covers engine-kind detection, env-var override, forced-engine selection, the silent-fallback regression, and the v1.0.0 Windows path regression.
- CI also exercises the degraded path on Linux with a stub engine.

## 1.0.2 — 2026-11-14

**Windows / macOS / Linux are now a hard, tested contract.**

- New CI workflow `.github/workflows/cross-platform.yml` renders `tests/smoke.html` to A4 PDF on `ubuntu-latest`, `macos-latest` and `windows-latest` with `fail-fast: false`, and asserts the output is a real PDF (`%PDF` header, sane size). The README badge reflects it.
- `--check` now reports platform, Python version, browser, `pdftoppm` and `pdfinfo`, and ends with `status: ready for PDF rendering` (exit 0) or a failure status (exit 3).
- Linux browser list extended with `brave-browser` and `/opt/brave.com/brave/brave`.
- README: new "支持平台" section with per-OS requirements and the exact self-check command; Windows manual-install path added.
- `references/layout-pdf.md`: Linux manual command added alongside the macOS and Windows ones.
- `AGENTS.md`: the three-platform requirement is recorded as a constraint, pointing at the CI job as the gate.

## 1.0.1 — 2026-11-14

**Windows support for PDF rendering.** Reported by a Windows user: `scripts/render_pdf.py` only knew macOS and Linux browser locations, so a default Windows install of Chrome was never found and rendering failed with `no Chrome/Chromium/Edge found`.

- Browser detection is now platform-aware and also covers Windows:
  - registry `App Paths` keys for `chrome.exe`, `msedge.exe`, `brave.exe`
  - `ProgramFiles`, `ProgramW6432`, `ProgramFiles(x86)`, `%LOCALAPPDATA%`
  - Brave added alongside Chrome, Edge and Chromium
- Path building for Windows uses `ntpath`, so separators are correct regardless of where the module is imported.
- New `--chrome PATH` flag as an explicit escape hatch for non-default installs.
- New `--check` flag: prints the detected browser and exits, so installation can be verified in one command.
- Console output is forced to UTF-8, and chrome's output is decoded as UTF-8 with replacement, so non-ASCII paths no longer crash on a cp936/cp1252 console.
- Subprocess runs with `CREATE_NO_WINDOW` on Windows, so no console window flashes when an agent invokes it.
- If `--headless=new` produces no PDF (Chrome older than 112), it retries once with legacy `--headless`.
- Failed detection now lists the locations that were tried instead of a bare error.

## 1.0.0 — 2026-11-14

First release: translation, question and option bilingual output, error analysis, long-sentence breakdown, A4 PDF rendering.
