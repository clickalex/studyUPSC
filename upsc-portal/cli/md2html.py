#!/usr/bin/env python3
"""studyUPSC \\u2014 Markdown -> standalone HTML converter.

Converts every content/**/*.md into a sibling .html page (styled,
self-contained, openable directly in a browser). Also writes
content/index.html \\u2014 a full catalog linking all docs.

Usage (from upsc-portal/):
    python3 cli/md2html.py
"""
import html as _html
import os
import re
import sys

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

def slug(t):
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')

def inline(text):
    # escape first
    text = _html.escape(text, quote=False)
    # inline code
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    # bold, italic, strikethrough
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    text = re.sub(r'(?<!\*)\*([^*\n]+)\*(?!\*)', r'<em>\1</em>', text)
    text = re.sub(r'~~([^~]+)~~', r'<del>\1</del>', text)
    # images then links
    text = re.sub(r'!\[([^\]]*)\]\(([^)\s]+)\)', r'<img alt="\1" src="\2">', text)
    text = re.sub(r'\[([^\]]+)\]\(([^)\s]+)\)', r'<a href="\2">\1</a>', text)
    return text

def md_to_html(md):
    lines = md.replace('\r\n', '\n').split('\n')
    out, i = [], 0
    n = len(lines)
    while i < n:
        line = lines[i]
        # code fence
        m = re.match(r'^```(\w*)\s*$', line)
        if m:
            buf = []
            i += 1
            while i < n and not re.match(r'^```\s*$', lines[i]):
                buf.append(lines[i]); i += 1
            i += 1
            out.append('<pre><code>%s</code></pre>' % _html.escape('\n'.join(buf), quote=False))
            continue
        # heading
        m = re.match(r'^(#{1,6})\s+(.*)$', line)
        if m:
            lvl = len(m.group(1)); txt = inline(m.group(2).strip())
            out.append('<h%d id="%s">%s</h%d>' % (lvl, slug(m.group(2).strip()), txt, lvl))
            i += 1; continue
        # hr
        if re.match(r'^\s*(-{3,}|\*{3,})\s*$', line):
            out.append('<hr>'); i += 1; continue
        # blockquote
        if re.match(r'^\s*>\s?', line):
            buf = []
            while i < n and re.match(r'^\s*>\s?', lines[i]):
                buf.append(re.sub(r'^\s*>\s?', '', lines[i])); i += 1
            out.append('<blockquote>%s</blockquote>' % md_to_html('\n'.join(buf)))
            continue
        # table
        if line.strip().startswith('|') and i + 1 < n and re.match(r'^\s*\|[\s:|-]+\|\s*$', lines[i+1]):
            headers = [c.strip() for c in line.strip().strip('|').split('|')]
            i += 2; rows = []
            while i < n and lines[i].strip().startswith('|'):
                rows.append([c.strip() for c in lines[i].strip().strip('|').split('|')]); i += 1
            th = ''.join('<th>%s</th>' % inline(c) for c in headers)
            trs = ''.join('<tr>%s</tr>' % ''.join('<td>%s</td>' % inline(c) for c in r) for r in rows)
            out.append('<table><thead><tr>%s</tr></thead><tbody>%s</tbody></table>' % (th, trs))
            continue
        # lists (unordered/ordered, nested by 2-space indent)
        if re.match(r'^(\s*)([-*•◦]|\d+[.)])\s+', line):
            def parse_list(i, level_indent):
                items = []
                ordered = None
                while i < n:
                    m2 = re.match(r'^(\s*)([-*•◦]|\d+[.)])\s+(.*)$', lines[i])
                    if not m2: break
                    dent = len(m2.group(1))
                    if dent < level_indent: break
                    if dent > level_indent:
                        # nested list — attach into last item
                        sub, i = parse_list(i, dent)
                        if items: items[-1] += sub
                        continue
                    is_ord = bool(re.match(r'\d', m2.group(2)))
                    if ordered is None: ordered = is_ord
                    if is_ord != ordered: break
                    items.append(inline(m2.group(3)))
                    i += 1
                tag = 'ol' if ordered else 'ul'
                body = ''.join('<li>%s</li>' % it for it in items)
                return '<%s>%s</%s>' % (tag, body, tag), i
            html_list, i = parse_list(i, len(re.match(r'^(\s*)', line).group(1)))
            out.append(html_list)
            continue
        # blank
        if not line.strip():
            i += 1; continue
        # paragraph (gather until blank/structural line)
        buf = [line]
        i += 1
        while i < n and lines[i].strip() and not re.match(r'^(#{1,6}\s|\s*>|\s*([-*•◦]|\d+[.)])\s|```|^\s*\||\s*(-{3,}|\*{3,})\s*$)', lines[i]):
            buf.append(lines[i]); i += 1
        out.append('<p>%s</p>' % inline(' '.join(x.strip() for x in buf)))
    return '\n'.join(out)

def title_of(md, fname):
    m = re.search(r'^#\s+(.+)$', md, re.M)
    return m.group(1).strip() if m else fname.replace('-', ' ').replace('_', ' ')

TEMPLATE = """<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · studyUPSC</title>
<style>{css}</style>
</head>
<body>
<header><div class="wrap"><div class="brand">study<span>UPSC</span></div><div class="crumb">{crumb}</div><div class="crumb no-print" style="margin-left:auto"><a href="{indexrel}">📚 All documents</a> · <a href="{mdrel}">Markdown source</a></div></div></header>
<div class="wrap"><div class="card">
{body}
</div>
<footer>studyUPSC · generated from Markdown · print-friendly (Ctrl/Cmd+P)</footer>
</div>
</body>
</html>
"""

def crumb_of(relpath):
    d = os.path.dirname(relpath)
    return d.replace('content/', '').replace('/', ' · ') if d else 'content'

def main():
    md_files = []
    for base, _, files in os.walk(CONTENT):
        for f in sorted(files):
            if f.endswith('.md'):
                md_files.append(os.path.join(base, f))
    md_files.sort()
    made = 0
    catalog = []
    for path in md_files:
        rel = os.path.relpath(path, ROOT)
        with open(path, encoding='utf-8') as fh:
            md = fh.read()
        body = md_to_html(md)
        title = title_of(md, os.path.basename(path))
        depth = rel.count(os.sep)
        index_rel = os.path.relpath(os.path.join(CONTENT, 'index.html'), os.path.dirname(path))
        page = TEMPLATE.format(title=_html.escape(title), css=CSS,
                               crumb=_html.escape(crumb_of(rel)),
                               indexrel=index_rel,
                               mdrel=os.path.basename(path),
                               body=body)
        html_path = path[:-3] + '.html'
        with open(html_path, 'w', encoding='utf-8') as fh:
            fh.write(page)
        catalog.append((rel, title))
        made += 1

    # master catalog
    groups = {}
    for rel, title in catalog:
        grp = os.path.dirname(rel)
        groups.setdefault(grp, []).append((rel, title))
    rows = []
    for grp in sorted(groups):
        rows.append('<h2 id="%s">%s</h2><ul>' % (slug(grp), _html.escape(grp.replace('content/', '') or 'content')))
        for rel, title in groups[grp]:
            href = _html.escape(rel)
            rows.append('<li><a href="%s">%s</a> <span class="crumb">· <a href="%s" class="crumb">md</a></span></li>'
                        % (href.replace('.md', '.html'), _html.escape(title), href))
        rows.append('</ul>')
    catalog_html = TEMPLATE.format(
        title='Content Library — All Documents', css=CSS,
        crumb='content library catalog', indexrel='index.html', mdrel='index.html',
        body=('<h1 id="content-library">Content Library</h1>'
              '<p>%d documents · HTML mirrors of every Markdown note (open/print directly).</p>%s'
              % (made, '\n'.join(rows))))
    with open(os.path.join(CONTENT, 'index.html'), 'w', encoding='utf-8') as fh:
        fh.write(catalog_html)
    print('[md2html] %d markdown docs -> %d html pages + content/index.html' % (made, made))

if __name__ == '__main__':
    sys.exit(main())
