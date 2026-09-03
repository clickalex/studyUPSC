"""studyUPSC — batch page renderer for Prelims topic completion.

Provides page() (standard site template) plus two SVG helpers used by the
prelims diagram sets (timeline_svg, cards_svg). Batch scripts import this
and call render_batch() with a list of item dicts:

  dict(dir=..., d_file=..., d_title=..., b_file=..., b_title=..., crumb=...,
       detailed=..., bullets=..., svg_file=..., svg=...)
"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, 'content')

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

def page(path, title, crumb, body):
    out = os.path.normpath(os.path.join(ROOT, path))
    home = os.path.relpath(CONTENT, os.path.dirname(out))
    page_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · studyUPSC</title>
<style>{CSS}</style>
</head>
<body>
<header><div class="wrap"><div class="brand">study<span>UPSC</span></div><div class="crumb">{crumb}</div><div class="crumb no-print" style="margin-left:auto"><a href="{home}/index.html">📚 All documents</a></div></div></header>
<div class="wrap"><div class="card">
{body.rstrip()}
</div>
<footer>studyUPSC · print-friendly (Ctrl/Cmd+P)</footer>
</div>
</body>
</html>
"""
    os.makedirs(os.path.dirname(out), exist_ok=True)
    with open(out, 'w') as f:
        f.write(page_html)
    print('wrote', os.path.relpath(out, ROOT), f'({len(page_html)})')

def esc(s):
    return s.replace('&', '&amp;')

def timeline_svg(title, sub, events, foot):
    """events: list of (time_label, line1, line2)"""
    n = len(events)
    H = 260
    xs = [60 + i * (840 / max(n - 1, 1)) for i in range(n)]
    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="960" height="{H}" viewBox="0 0 960 {H}" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif">
  <style>
    .t{{font-size:20px;font-weight:700;fill:#0f172a}}
    .s{{font-size:12px;fill:#64748b}}
    .e{{font-size:12.5px;fill:#0f172a;font-weight:700}}
    .d{{font-size:10.5px;fill:#475569}}
    .ax{{stroke:#cbd5e1;stroke-width:3}}
    .ln{{stroke:#94a3b8;stroke-width:1.5}}
    .dot{{fill:#f59e0b}}
    .foot{{font-size:10px;fill:#94a3b8}}
  </style>
  <rect width="960" height="{H}" rx="14" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="30" y="34" class="t">{esc(title)}</text>
  <text x="30" y="54" class="s">{esc(sub)}</text>
  <line x1="40" y1="150" x2="920" y2="150" class="ax"/>''']
    for i, ev in enumerate(events):
        x = round(xs[i], 1)
        up = (i % 2 == 0)
        t, l1, l2 = ev
        if up:
            parts.append(f'''  <line x1="{x}" y1="150" x2="{x}" y2="112" class="ln"/>
  <circle cx="{x}" cy="150" r="6" class="dot"/>
  <text x="{x}" y="82" text-anchor="middle" class="e">{esc(t)}</text>
  <text x="{x}" y="99" text-anchor="middle" class="d">{esc(l1)}</text>
  <text x="{x}" y="76" text-anchor="middle" class="d">{esc(l2)}</text>''')
        else:
            parts.append(f'''  <line x1="{x}" y1="150" x2="{x}" y2="188" class="ln"/>
  <circle cx="{x}" cy="150" r="6" class="dot"/>
  <text x="{x}" y="210" text-anchor="middle" class="e">{esc(t)}</text>
  <text x="{x}" y="227" text-anchor="middle" class="d">{esc(l1)}</text>
  <text x="{x}" y="243" text-anchor="middle" class="d">{esc(l2)}</text>''')
    parts.append(f'  <text x="30" y="{H-14}" class="foot">{esc(foot)}</text>\n</svg>')
    return '\n'.join(parts)

def cards_svg(title, sub, cards, foot, cols=None):
    """cards: list of (heading, [lines...])"""
    if cols is None:
        cols = 2 if len(cards) <= 4 else 3
    rows = (len(cards) + cols - 1) // cols
    W = 960
    pad = 30
    cw = (W - pad * 2 - 16 * (cols - 1)) / cols
    maxlines = max(len(c[1]) for c in cards)
    ch = 54 + maxlines * 17
    H = 130 + rows * (ch + 16) + 10
    parts = [f'''<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" font-family="Segoe UI, Roboto, Helvetica, Arial, sans-serif">
  <style>
    .t{{font-size:20px;font-weight:700;fill:#0f172a}}
    .s{{font-size:12px;fill:#64748b}}
    .h{{font-size:13.5px;fill:#92400e;font-weight:700}}
    .md{{font-size:11px;fill:#334155}}
    .card{{fill:#fffbeb;stroke:#f59e0b;stroke-width:1.2}}
    .foot{{font-size:10px;fill:#94a3b8}}
  </style>
  <rect width="{W}" height="{H}" rx="14" fill="#f8fafc" stroke="#e2e8f0"/>
  <text x="30" y="34" class="t">{esc(title)}</text>
  <text x="30" y="54" class="s">{esc(sub)}</text>''']
    for i, (h, lines) in enumerate(cards):
        r, c = divmod(i, cols)
        x = pad + c * (cw + 16)
        y = 88 + r * (ch + 16)
        parts.append(f'  <rect x="{x:.0f}" y="{y}" width="{cw:.0f}" height="{ch}" rx="10" class="card"/>')
        parts.append(f'  <text x="{x+14:.0f}" y="{y+26}" class="h">{esc(h)}</text>')
        for j, ln in enumerate(lines):
            parts.append(f'  <text x="{x+14:.0f}" y="{y+46+j*17}" class="md">{esc(ln)}</text>')
    parts.append(f'  <text x="30" y="{H-14}" class="foot">{esc(foot)}</text>\n</svg>')
    return '\n'.join(parts)

def render_batch(items):
    for it in items:
        d = it['dir']
        page(os.path.join(d, 'detailed-notes', it['d_file']), it['d_title'], it['crumb'] + ' · detailed-notes', it['detailed'])
        page(os.path.join(d, 'bullet-points', it['b_file']), it['b_title'], it['crumb'] + ' · bullet-points', it['bullets'])
        svg_path = os.path.join(d, 'diagrams', it['svg_file'])
        out = os.path.normpath(os.path.join(ROOT, svg_path))
        os.makedirs(os.path.dirname(out), exist_ok=True)
        with open(out, 'w') as f:
            f.write(it['svg'])
        print('wrote', os.path.relpath(out, ROOT), f"({len(it['svg'])})")
