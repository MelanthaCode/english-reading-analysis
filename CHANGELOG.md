# Changelog

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
