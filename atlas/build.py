#!/usr/bin/env python3
"""Bundle the atlas into a single self-contained HTML file.

Inlines every local <script src=...> and <link rel="stylesheet" href=...>
into build/atlas-bundled.html. External https:// resources (fonts, KaTeX)
are left as-is. Run from the project root:  python3 build.py
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
OUT = ROOT / "build" / "atlas-bundled.html"

html = (ROOT / "index.html").read_text(encoding="utf-8")

def inline_css(m):
    href = m.group(1)
    if href.startswith("http"):
        return m.group(0)
    css = (ROOT / href).read_text(encoding="utf-8")
    return "<style>\n" + css + "\n</style>"

def inline_js(m):
    src = m.group(1)
    if src.startswith("http"):
        return m.group(0)
    js = (ROOT / src).read_text(encoding="utf-8")
    return "<script>\n/* ── " + src + " ── */\n" + js + "\n</script>"

html = re.sub(r'<link rel="stylesheet" href="([^"]+)">', inline_css, html)
html = re.sub(r'<script src="([^"]+)"></script>', inline_js, html)

OUT.parent.mkdir(exist_ok=True)
OUT.write_text(html, encoding="utf-8")
print(f"wrote {OUT}  ({OUT.stat().st_size/1024:.0f} KB)")
