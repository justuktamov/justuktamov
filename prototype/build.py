#!/usr/bin/env python3
"""Build the standalone prototype.

Inlines every photo in prototype/img/ into src/app.html as base64 JPEG bytes so the
resulting index.html works offline and inside sandboxed viewers that block
external or blob: images.

    python3 prototype/build.py
"""
import base64
import json
import pathlib

ROOT = pathlib.Path(__file__).parent
MARK = "/*@IMAGES@*/{}"

src = (ROOT / "src" / "app.html").read_text(encoding="utf-8")
assert MARK in src, "image placeholder not found in src/app.html"

images = {
    p.stem: base64.b64encode(p.read_bytes()).decode()
    for p in sorted((ROOT / "img").glob("*.jpg"))
}
out = src.replace(MARK, json.dumps(images, separators=(",", ":")))
(ROOT / "index.html").write_text(out, encoding="utf-8")
print(f"index.html: {len(images)} images, {len(out) // 1024} KB")

# Artifact variant: the host adds its own <!doctype>/<html>/<head>/<body> skeleton.
art = out
for tag in ("<!doctype html>", '<html lang="uz">', "<head>", "</head>", "<body>", "</body>", "</html>",
            '<meta charset="utf-8">', '<meta name="viewport" content="width=device-width,initial-scale=1">'):
    art = art.replace(tag, "", 1)
(ROOT / "artifact.html").write_text(art.strip() + "\n", encoding="utf-8")
print(f"artifact.html: {len(art) // 1024} KB")
