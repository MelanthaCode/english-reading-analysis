#!/usr/bin/env python3
"""Platform-agnostic unit tests for render_pdf.py.

Runs on Windows, macOS and Linux with no third-party dependencies, so CI can
execute it on all three runners:

    python tests/test_engines.py

Covers the two bugs that actually shipped: Windows browser paths were missing
(v1.0.0), and there was no fallback when no Chromium-family browser existed.
"""

from __future__ import annotations

import importlib.util
import os
import pathlib
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parent.parent
_spec = importlib.util.spec_from_file_location("render_pdf", ROOT / "scripts" / "render_pdf.py")
assert _spec and _spec.loader
r = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(r)

failures = 0


def check(label: str, condition: bool, detail: str = "") -> None:
    global failures
    if condition:
        print(f"ok   {label}")
    else:
        failures += 1
        print(f"FAIL {label} {detail}")


tmp = pathlib.Path(tempfile.mkdtemp(prefix="engine-tests-"))


def fake(name: str) -> str:
    """Create a stand-in executable so detection can be tested without installing one."""
    path = tmp / name
    path.write_text("#!/bin/sh\nexit 0\n")
    path.chmod(0o755)
    return str(path)


# --- engine kind detection -------------------------------------------------
check("kind: chrome.exe", r.engine_kind(r"C:\Program Files\Google\Chrome\Application\chrome.exe") == "chrome")
check("kind: msedge.exe", r.engine_kind(r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe") == "chrome")
check("kind: weasyprint", r.engine_kind("/usr/local/bin/weasyprint") == "weasyprint")
check("kind: weasyprint.exe", r.engine_kind(r"C:\Python311\Scripts\weasyprint.exe") == "weasyprint")
check("kind: wkhtmltopdf", r.engine_kind("/usr/bin/wkhtmltopdf") == "wkhtmltopdf")

# --- explicit path beats everything ---------------------------------------
weasy = fake("weasyprint")
engine = r.find_engine(explicit=weasy)
check("explicit weasyprint is used as-is", engine == {"kind": "weasyprint", "path": weasy}, str(engine))

# a non-existent explicit path must not silently fall back to auto-detection
missing = r.find_engine(explicit=str(tmp / "does-not-exist-chrome"))
check("bogus explicit path returns None", missing is None, str(missing))

# --- env var is honoured (container / CI escape hatch) ---------------------
wk = fake("wkhtmltopdf")
os.environ[r.ENV_BROWSER] = wk
engine = r.find_engine()
check("env var RENDER_PDF_BROWSER is honoured", engine is not None and engine["path"] == wk, str(engine))
del os.environ[r.ENV_BROWSER]

# --- --engine forces a kind, and refuses the wrong one --------------------
engine = r.find_engine(explicit=wk, only="chrome")
check("--engine chrome rejects a weasyprint binary", engine is None, str(engine))

# a forced fallback engine must be found even though Chrome exists on this box
# Windows' shutil.which only matches executables with a PATHEXT extension, so the
# stub names must differ per platform — a real weasyprint install is weasyprint.exe.
saved_path_2 = os.environ.get("PATH", "")
stub_suffix = ".exe" if os.name == "nt" else ""
for stub_name in ("weasyprint", "wkhtmltopdf"):
    stub = tmp / (stub_name + stub_suffix)
    stub.write_text("")
    stub.chmod(0o755)
os.environ["PATH"] = str(tmp) + os.pathsep + saved_path_2
engine = r.find_engine(only="weasyprint")
check("--engine weasyprint finds the stub on PATH", engine is not None and engine["kind"] == "weasyprint", str(engine))
engine = r.find_engine(only="wkhtmltopdf")
check("--engine wkhtmltopdf finds the stub on PATH", engine is not None and engine["kind"] == "wkhtmltopdf", str(engine))
os.environ["PATH"] = saved_path_2

# --- no renderer at all ---------------------------------------------------
# Deterministic across machines: point PATH at an empty directory, so no
# fallback executable can be found regardless of what the runner has installed.
saved_path = os.environ.get("PATH", "")
os.environ["PATH"] = str(tmp / "empty-path")
os.environ.pop(r.ENV_BROWSER, None)
check("no weasyprint on PATH yields None", r.find_engine(only="weasyprint") is None)
check("no wkhtmltopdf on PATH yields None", r.find_engine(only="wkhtmltopdf") is None)
os.environ["PATH"] = saved_path

# an unknown platform must not crash; documented behaviour is Linux-style paths
check(
    "unknown platform degrades to a candidate list, never crashes",
    isinstance(r.chrome_candidates("plan9"), list),
)

# --- regression: Windows install paths (the v1.0.0 bug) -------------------
fake_env = {
    "ProgramFiles": r"C:\Program Files",
    "ProgramFiles(x86)": r"C:\Program Files (x86)",
    "LOCALAPPDATA": r"C:\Users\student\AppData\Local",
}
cands = r._windows_candidates(env=fake_env)
must = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
    r"C:\Users\student\AppData\Local\Google\Chrome\Application\chrome.exe",
]
for expected in must:
    check(f"windows candidate: {expected}", expected in cands)
check("windows paths use backslashes", all("\\" in c for c in cands if c.startswith("C:")), str(cands[:2]))

# --- platform dispatch ----------------------------------------------------
check("darwin candidates are app bundles", all(".app/" in c for c in r.chrome_candidates("darwin")))
check("linux candidates are absolute paths", all(c.startswith("/") for c in r.chrome_candidates("linux")))
check("win32 candidates come from the environment", isinstance(r.chrome_candidates("win32"), list))

print()
if failures:
    print(f"{failures} check(s) failed")
    sys.exit(1)
print("all engine checks passed")
