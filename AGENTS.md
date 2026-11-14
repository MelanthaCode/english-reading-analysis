# AGENTS.md

This repository **is an Agent Skill**, not an application or a library. It packages procedural knowledge for turning English reading material into Chinese study documents. If you are an AI agent that has been asked to install, inspect, or use this repository, read this file first, then read `SKILL.md`.

## What this repository is

- `SKILL.md` — the skill definition. Its YAML frontmatter (`name`, `description`) is what an agent's skill loader reads; the body is the working procedure.
- `references/` — deeper rules loaded on demand: `sentence-analysis.md` (syntax breakdown), `paper-workflow.md` (exam-paper question types and distractors), `layout-pdf.md` (CSS, pagination, rendering).
- `assets/template.html` — a fill-in HTML template for the output document.
- `scripts/render_pdf.py` — renders a local HTML file to an A4 PDF via headless Chrome.
- `.claude-plugin/` — Claude Code plugin and marketplace manifests. Not needed for other agents.

There is no build step, no package manager, no dependency manifest, and no compiled artifact. Copying the directory is a complete installation.

## Capabilities and non-goals

**Does:** translate English passages to Chinese paragraph by paragraph; translate exam-paper questions and options bilingually with answers traced back to source sentences; analyze a student's marked answers and categorize errors; break down long sentences at sentence and clause level; render a print-ready A4 PDF.

**Does not:** rewrite, summarize, or "improve" the source text; invent answer keys that the source does not provide; evaluate essays or writing tasks; handle audio; call any remote service.

## How to install

Prefer the one-line installer, which writes a universal copy to `.agents/skills/` and symlinks it for Claude Code:

```bash
npx skills add MelanthaCode/english-reading-analysis
```

Manual equivalent: copy the repository directory to the agent's skills directory under the name `english-reading-analysis` (for example `~/.claude/skills/`, `~/.codex/skills/`, `~/.dsh/skills/`, or a project's `.agents/skills/`).

## How to use

Once installed, invoke it by describing the task in natural language (Chinese or English). Representative requests:

- "把这篇英语文章翻成中文，复杂长难句高亮，文末单独拆解。"
- "这份英语试卷是扫描件，逐篇翻成中文，题目和选项中英对照，给答案和解析。"
- "这是我批改过的卷子，把错题分析一下，错因归类，再拆解每篇的难句。"

The agent then follows `SKILL.md` section by section. Output language is Chinese unless the user asks otherwise.

## How to verify this skill is usable

1. `SKILL.md` exists at the repository root and its frontmatter has both `name` and `description` — that is what most skill loaders require.
2. `references/` and `assets/` are present and referenced with relative paths from `SKILL.md`.
3. `python3 scripts/render_pdf.py --check` prints the detected browser path and exits 0. It is platform-aware: on Windows it looks in the registry "App Paths" keys and the standard `Program Files`, `Program Files (x86)` and `%LOCALAPPDATA%` install roots, because Chrome and Edge are normally **not** on `PATH` there.
4. `python3 scripts/render_pdf.py --help` runs on the standard library alone — no third-party imports.
5. For Claude Code specifically: `claude plugin validate .` prints `✔ Validation passed`.

## Constraints when modifying this repository

- Keep `SKILL.md` frontmatter valid YAML with `name` and `description`. The description is the trigger text an agent matches against — keep the use-cases in it explicit.
- Do not add network calls, telemetry, or binary dependencies. The skill is deliberately offline: `scripts/render_pdf.py` only shells out to a local Chrome.
- Keep PDF rendering working on **all three platforms**. Windows has no Chrome on `PATH` by default, so browser detection must keep covering the registry `App Paths` keys and the standard install roots, and `--chrome` must stay available as an escape hatch.
- Do not add a source watermark or attribution footer to generated PDFs. The document is for students; identity noise is a design non-goal.
- Keep relative paths intact; the skill may be installed into any directory name chosen by the user.
- `references/` files are loaded lazily. Keep each one focused on a single concern rather than merging them.

## License

MIT.
