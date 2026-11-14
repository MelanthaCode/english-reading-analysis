#!/usr/bin/env python3
"""Render one HTML file to an A4 PDF with headless Chrome.

Usage:
    python3 render_pdf.py INPUT.html OUTPUT.pdf [--timeout 120] [--chrome PATH]

Works on macOS, Linux and Windows.

Why a script: headless Chrome fails with "Failed to create a unique user data
directory" unless a writable --user-data-dir is supplied, and non-ASCII paths
must be passed as file:// URIs. Both are handled here. The browser is located
across the usual install locations on each platform, because Chrome and Edge on
Windows are normally *not* on PATH.
"""

from __future__ import annotations

import argparse
import ntpath
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path
from typing import Mapping

# Executables that may be on PATH, in preference order.
PATH_NAMES = (
    "google-chrome",
    "google-chrome-stable",
    "chromium",
    "chromium-browser",
    "chrome",
    "chrome.exe",
    "msedge",
    "msedge.exe",
)

# macOS application bundles, including per-user installs.
MAC_BUNDLES = (
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "~/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "~/Applications/Chromium.app/Contents/MacOS/Chromium",
    "~/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
)

# Common Linux install locations.
LINUX_PATHS = (
    "/usr/bin/google-chrome",
    "/usr/bin/google-chrome-stable",
    "/usr/bin/chromium",
    "/usr/bin/chromium-browser",
    "/snap/bin/chromium",
    "/opt/google/chrome/chrome",
    "/usr/bin/microsoft-edge",
    "/usr/bin/microsoft-edge-stable",
    "/usr/bin/brave-browser",
    "/opt/brave.com/brave/brave",
)

# Windows: install roots from the environment, then well-known relative paths.
WINDOWS_RELATIVE = (
    r"Google\Chrome\Application\chrome.exe",
    r"Microsoft\Edge\Application\msedge.exe",
    r"Chromium\Application\chrome.exe",
    r"BraveSoftware\Brave-Browser\Application\brave.exe",
)


def _windows_registry_candidates() -> list[str]:
    """Read Chrome/Edge install paths from the Windows "App Paths" registry keys."""
    if os.name != "nt":
        return []
    try:
        import winreg
    except ImportError:
        return []
    found: list[str] = []
    locations = (
        (winreg.HKEY_LOCAL_MACHINE, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths"),
        (winreg.HKEY_CURRENT_USER, r"SOFTWARE\Microsoft\Windows\CurrentVersion\App Paths"),
    )
    for root, base in locations:
        for exe in ("chrome.exe", "msedge.exe", "brave.exe"):
            try:
                with winreg.OpenKey(root, base + "\\" + exe) as key:
                    value, _ = winreg.QueryValueEx(key, "")
            except OSError:
                continue
            value = str(value).strip().strip('"')
            if value:
                found.append(value)
    return found


def _windows_candidates(env: Mapping[str, str] | None = None) -> list[str]:
    """Standard Windows install locations for Chromium-family browsers."""
    env = os.environ if env is None else env
    roots = []
    for name in ("ProgramFiles", "ProgramW6432", "ProgramFiles(x86)", "PROGRAMFILES", "PROGRAMFILES(X86)"):
        value = env.get(name)
        if value and value not in roots:
            roots.append(value)
    out: list[str] = []
    for root in roots:
        for rel in WINDOWS_RELATIVE:
            # ntpath keeps Windows separators even when this code is imported
            # and exercised on a POSIX machine.
            out.append(ntpath.join(root, rel))
    for name in ("LOCALAPPDATA", "LocalAppData"):
        value = env.get(name)
        if not value:
            continue
        for rel in WINDOWS_RELATIVE:
            out.append(ntpath.join(value, rel))
    out.extend(_windows_registry_candidates())
    return out


def chrome_candidates(platform: str | None = None) -> list[str]:
    """Candidate browser executables for the given platform, in preference order."""
    plat = (platform or sys.platform).lower()
    if plat == "darwin":
        return [os.path.expanduser(p) for p in MAC_BUNDLES]
    if plat.startswith("win"):
        return _windows_candidates()
    return list(LINUX_PATHS)


def find_chrome(explicit: str | None = None, platform: str | None = None) -> str | None:
    """Locate a Chromium-family browser. Returns the path, or None."""
    if explicit:
        candidate = os.path.expanduser(explicit.strip().strip('"'))
        if os.path.isfile(candidate):
            return candidate
        found = shutil.which(candidate)
        if found:
            return found
        return None

    for candidate in chrome_candidates(platform):
        if candidate and os.path.isfile(candidate):
            return candidate

    for name in PATH_NAMES:
        found = shutil.which(name)
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


def run_chrome(
    chrome: str,
    headless_flag: str,
    profile: Path,
    out: Path,
    html_uri: str,
    timeout: int,
) -> subprocess.CompletedProcess:
    cmd = [
        chrome,
        headless_flag,
        "--disable-gpu",
        "--no-sandbox",
        f"--user-data-dir={profile}",
        "--no-pdf-header-footer",
        "--virtual-time-budget=8000",
        f"--print-to-pdf={out}",
        html_uri,
    ]
    kwargs: dict = {
        "capture_output": True,
        "text": True,
        "timeout": timeout,
        # Never let a non-UTF-8 console codepage (cp1252/cp936) decode chrome's
        # output, and never let it crash the run.
        "encoding": "utf-8",
        "errors": "replace",
    }
    if os.name == "nt":
        # Keep a console window from flashing open when launched from an agent.
        kwargs["creationflags"] = getattr(subprocess, "CREATE_NO_WINDOW", 0)
    return subprocess.run(cmd, **kwargs)


def _setup_console() -> None:
    """Force UTF-8 console output so non-ASCII paths never crash on Windows."""
    for stream in (sys.stdout, sys.stderr):
        reconfigure = getattr(stream, "reconfigure", None)
        if reconfigure is None:
            continue
        try:
            reconfigure(encoding="utf-8", errors="replace")
        except (OSError, ValueError):
            pass


def main(argv: list[str] | None = None) -> int:
    _setup_console()
    parser = argparse.ArgumentParser(description="Render HTML to A4 PDF via headless Chrome")
    parser.add_argument("html", nargs="?", help="input .html file")
    parser.add_argument("pdf", nargs="?", help="output .pdf file")
    parser.add_argument("--timeout", type=int, default=120, help="seconds per attempt")
    parser.add_argument(
        "--chrome",
        default=None,
        help="explicit path to chrome/chromium/msedge, if auto-detection fails",
    )
    parser.add_argument(
        "--check",
        action="store_true",
        help="only report which browser was detected, then exit",
    )
    args = parser.parse_args(argv)

    if args.check:
        chrome = find_chrome(args.chrome)
        pdftoppm = shutil.which("pdftoppm")
        pdfinfo = shutil.which("pdfinfo")
        print(f"platform:  {sys.platform}")
        print(f"python:    {sys.version.split()[0]}")
        print(f"browser:   {chrome or 'NOT FOUND'}")
        print(f"pdftoppm:  {pdftoppm or 'MISSING (only needed to read scanned PDFs)'}")
        print(f"pdfinfo:   {pdfinfo or 'MISSING (page count in the summary only)'}")
        if chrome is None:
            print(
                "status:    PDF rendering will FAIL until a browser is found "
                "(pass --chrome <path> if it is installed elsewhere)",
                file=sys.stderr,
            )
            return 3
        print("status:    ready for PDF rendering")
        return 0

    if not args.html or not args.pdf:
        parser.error("the following arguments are required: html, pdf")

    html = Path(args.html).expanduser().resolve()
    if not html.is_file():
        print(f"error: input not found: {html}", file=sys.stderr)
        return 2

    out = Path(args.pdf).expanduser().resolve()
    out.parent.mkdir(parents=True, exist_ok=True)
    if out.exists():
        out.unlink()

    chrome = find_chrome(args.chrome)
    if chrome is None:
        print("error: no Chrome/Chromium/Edge found.", file=sys.stderr)
        tried = chrome_candidates()[:6]
        if tried:
            print("looked in:", file=sys.stderr)
            for candidate in tried:
                print(f"  {candidate}", file=sys.stderr)
        print(
            "hint: pass --chrome <path-to-executable>, e.g. "
            r'--chrome "C:\Program Files\Google\Chrome\Application\chrome.exe"',
            file=sys.stderr,
        )
        return 3

    profile = Path(tempfile.mkdtemp(prefix="chrome-headless-"))
    proc: subprocess.CompletedProcess | None = None
    try:
        # Chrome 112+ takes --headless=new; older builds only know --headless.
        for headless_flag in ("--headless=new", "--headless"):
            try:
                proc = run_chrome(chrome, headless_flag, profile, out, html.as_uri(), args.timeout)
            except subprocess.TimeoutExpired:
                print(f"error: chrome timed out after {args.timeout}s", file=sys.stderr)
                return 4
            if out.is_file() and out.stat().st_size > 0:
                break
    finally:
        shutil.rmtree(profile, ignore_errors=True)

    if not out.is_file() or out.stat().st_size == 0:
        print(f"error: no PDF produced by {chrome}", file=sys.stderr)
        if proc is not None and proc.stderr:
            print(proc.stderr.strip()[-2000:], file=sys.stderr)
        return 5

    size_kb = out.stat().st_size / 1024
    pages = pdf_page_count(out)
    suffix = f", {pages} pages" if pages else ""
    print(f"wrote {out} ({size_kb:.0f} KB{suffix})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
