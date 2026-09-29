#!/usr/bin/env python3
"""Build brand/brand.html (the JONIVOR brand sheet) from brand.src.html and the SVG assets.

    python3 brand/build_brand.py [screenshots.json]
"""
import json, pathlib, re, sys

ROOT = pathlib.Path(__file__).parent
svg = lambda n: (ROOT / n).read_text()
inner = lambda s: re.sub(r"^<svg[^>]*>|</svg>$", "", s.strip(), flags=re.S)

icon, lock, word = svg("jonivor-app-icon.svg"), svg("jonivor-lockup.svg"), svg("jonivor-wordmark.svg")
mark = svg("jonivor-mark.svg")
toes = re.search(r"<g>(.*?)</g>", mark).group(1)
heart = re.search(r'<path d="([^"]+)"', mark).group(1)
lvb = re.search(r'viewBox="([^"]+)"', lock).group(1)
wvb = re.search(r'viewBox="([^"]+)"', word).group(1)
wd = re.search(r'<path d="([^"]+)"', word).group(1)
lock_in = inner(lock)
shots = json.load(open(sys.argv[1])) if len(sys.argv) > 1 else {}

out = (ROOT / "brand.src.html").read_text()
for k, v in {
    "@@ICON_INNER@@": inner(icon), "@@TOES@@": toes, "@@HEART@@": heart, "@@LVB@@": lvb, "@@WVB@@": wvb, "@@WD@@": wd,
    "@@LOCKUP_LIGHT@@": lock_in,
    "@@LOCKUP_DARK@@": lock_in.replace('fill="#1E4D3A"', 'fill="#FBF7F0"'),
    "@@S1@@": shots.get("00-splash", ""), "@@S2@@": shots.get("02-home", ""),
    "@@S3@@": shots.get("08-detail", ""), "@@S4@@": shots.get("26-dark-home", ""),
}.items():
    out = out.replace(k, v)
assert "@@" not in out
(ROOT / "brand.html").write_text(out)
print("brand.html", len(out) // 1024, "KB")
