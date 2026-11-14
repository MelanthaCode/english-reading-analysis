#!/usr/bin/env python3
"""Render one HTML file to an A4 PDF with headless Chrome.

Usage:
    python3 render_pdf.py INPUT.html OUTPUT.pdf [--timeout 120]

Why a script: headless Chrome fails with "Failed to create a unique user data
directory" unless a writable --user-data-dir is supplied, and Chinese paths must
be passed as file:// URIs. Both are handled here.
"""

from __future__ import annotations

import argparse
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

CHROME_CANDIDATES = (
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
)


def find_chrome() -> str | None:
    for candidate in CHROME_CANDIDATES:
        if os.sep in candidate:
            if os.path.isfile(candidate):
                return candidate
        else:
            found = shutil.which(candidate)
            if found:
                return found
    return None


def pdf_page_count(path: Path) -> int | None:
    pdfinfo = shutil.which("pdfinfo")
    if not pdfinfo:
        return None
    try:
        out = subprocess.run(
            [pdfinfo, str(path)], capture_output=True, text=True, timeout=30
        ).stdout
    except (OSError, subprocess.SubprocessError):
        return None
    for line in out.splitlines():
        if line.startswith("Pages:"):
            try:
                return int(line.split(":", 1)[1].strip())
            except ValueError:
                return None
    return None


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description="Render HTML to A4 PDF via headless Chrome")
    parser.add_argument("html", help="input .html file")
    parser.add_argument("pdf", help="output .pdf file")
    parser.add_argument("--timeout", type=int, default=120, help="seconds")
    args = parser.parse_args(argv)

    html = Path(args.html).expanduser().resolve()
    if not html.is_file():
        print(f"error: input not found: {html}", file=sys.stderr)
        return 2

    out = Path(args.pdf).expanduser().resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        out.unlink()

    chrome = find_chrome()
    if chrome is None:
        print(
            "error: no Chrome/Chromium/Edge found. Install one, or run Chrome "
            "manually with --headless=new --print-to-pdf.",
            file=sys.stderr,
        )
        return 3

    profile = Path(tempfile.mkdtemp(prefix="chrome-headless-"))
    cmd = [
        chrome,
        "--headless=new",
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={profile}",
        "--no-pdf-header-footer",
        "--virtual-time-budget=8000",
        f"--print-to-pdf={out}",
        html.as_uri(),
    ]
    try:
        proc = subprocess.run(cmd, capture_output=True, text=True, timeout=args.timeout)
    except subprocess.TimeoutExpired:
        print(f"error: chrome timed out after {args.timeout}s", file=sys.stderr)
        return 4
    finally:
        shutil.rmtree(profile, ignore_errors=True)

    if not out.is_file() or out.stat().st_size == 0:
        print("error: no PDF produced", file=sys.stderr)
        if proc.stderr:
            print(proc.stderr.strip()[-2000:], file=sys.stderr)
        return 5

    size_kb = out.stat().st_size / 1024
    pages = pdf_page_count(out)
    suffix = f", {pages} pages" if pages else ""
    print(f"wrote {out} ({size_kb:.0f} KB{suffix})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
