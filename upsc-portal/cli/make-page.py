#!/usr/bin/env python3
"""studyUPSC — page scaffold helper.

Wraps a content-body HTML fragment into the standard standalone page template
used by every document in content/ (same CSS/header/footer as the site).
The portal's SPA can also render the page inline.

Usage (from upsc-portal/):
    python3 cli/make-page.py content/<path>/page.html \
        --title "Page Title" --crumb "area · branch · topic · section" <<'EOF'
    <h1 id="page-title">Page Title</h1>
    <blockquote><p>...</p></blockquote>
    <h2 id="s">Section</h2>
    ...
    EOF
"""
import argparse, os, sys

CSS = """
:root{--ink:#0f172a;--sub:#475569;--line:#e2e8f0;--accent:#f59e0b;--bg:#f8fafc;--card:#fff}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.65 "Segoe UI",Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased}
.wrap{max-width:860px;margin:0 auto;padding:32px 20px 80px}
header{border-bottom:1px solid var(--line);padding:14px 0;margin-bottom:24px;background:var(--card)}
header .wrap{padding:0 20px;display:flex;gap:14px;align-items:baseline;flex-wrap:wrap}
.brand{font-weight:800;font-size:18px}
.brand span{color:var(--accent)}
.crumb{font-size:12px;color:var(--sub)}
.card{background:var(--card);border:1px solid var(--line);border-radius:14px;padding:28px 34px;box-shadow:0 1px 2px rgba(15,23,42,.04)}
h1{font-size:26px;line-height:1.25;margin:.2em 0 .5em}
h2{font-size:20px;margin:1.4em 0 .5em;border-bottom:1px solid var(--line);padding-bottom:.25em}
h3{font-size:17px;margin:1.2em 0 .4em}
h4,h5,h6{font-size:15px;margin:1em 0 .3em}
a{color:#b45309;text-decoration:none}a:hover{text-decoration:underline}
code,pre{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:.86em;background:#f1f5f9;border-radius:6px}
code{padding:.15em .4em}
pre{padding:14px 16px;overflow-x:auto;border:1px solid var(--line)}
pre code{background:none;padding:0}
blockquote{margin:1em 0;padding:.6em 1em;border-left:4px solid var(--accent);background:#fffbeb;border-radius:0 8px 8px 0;color:#44403c}
table{border-collapse:collapse;width:100%;margin:1em 0;font-size:.92em;display:block;overflow-x:auto}
table td,table th{border:1px solid var(--line);padding:.45em .7em;text-align:left;vertical-align:top}
table th{background:#f1f5f9;font-weight:700}
tr:nth-child(even) td{background:#fafafa}
ul,ol{padding-left:1.5em}
li{margin:.25em 0}
img,svg{max-width:100%;height:auto}
hr{border:none;border-top:1px solid var(--line);margin:1.6em 0}
footer{color:#94a3b8;font-size:12px;margin-top:40px;text-align:center}
@media print{body{background:#fff}.card{border:none;padding:0}.no-print{display:none}}
"""

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('out')
    ap.add_argument('--title', required=True)
    ap.add_argument('--crumb', default='')
    args = ap.parse_args()

    out = os.path.normpath(args.out)
    body = sys.stdin.read().rstrip() + '\n'

    # directory levels to walk up from the page to content/
    content_root = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'content'))
    up = os.path.relpath(content_root, os.path.dirname(os.path.abspath(out)))
    home = os.path.join(up, 'index.html')

    page = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{args.title} · studyUPSC</title>
<style>{CSS}</style>
</head>
<body>
<header><div class="wrap"><div class="brand">study<span>UPSC</span></div><div class="crumb">{args.crumb}</div><div class="crumb no-print" style="margin-left:auto"><a href="{home}">📚 All documents</a></div></div></header>
<div class="wrap"><div class="card">
{body}</div>
<footer>studyUPSC · print-friendly (Ctrl/Cmd+P)</footer>
</div>
</body>
</html>
"""
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as f:
        f.write(page)
    print('wrote', out, f'({len(page)} bytes)')

if __name__ == '__main__':
    main()
