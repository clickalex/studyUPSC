/* ============================================================================
   studyUPSC — shared interactivity engine (dependency-free, offline-safe)
   ----------------------------------------------------------------------------
   One script, every page. Auto-boots on static pages via
   <body data-study-kind="..."> and exposes window.Study for the SPA.

   Features (all progressive enhancement — pages work fine without JS):
     • dark / light theme, synced with the portal tracker (studyupsc-theme)
     • floating toolbar: theme toggle + mark-topic-complete
     • reading progress bar + auto "On this page" TOC + read-time badge
     • "Mark complete" ticks that sync with the revision tracker
     • Quiz / self-test mode for every Q&A page (with saved best scores)
     • "Pages read" ticks in the library + book contents
     • Continue-learning memory across the whole site

   Storage keys (shared with assets/js/app.js — do not rename):
     studyupsc-progress-v1  topic completion  { nav: 1 }
     studyupsc-read-v1      pages read        { rel: 1 }
     studyupsc-quiz-v1      quiz best scores  { pageId: {got, total} }
     studyupsc-last-v1      last visited page { kind, nav, title, rel, ts }
     studyupsc-theme        'dark' | 'light'
   ========================================================================== */
(function () {
  'use strict';

  var K = {
    progress: 'studyupsc-progress-v1',
    read: 'studyupsc-read-v1',
    quiz: 'studyupsc-quiz-v1',
    last: 'studyupsc-last-v1',
    theme: 'studyupsc-theme'
  };

  /* ---------------- storage ---------------- */
  function load(key) {
    try { return JSON.parse(localStorage.getItem(key)) || {}; }
    catch (e) { return {}; }
  }
  function save(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ }
  }
  function store() {
    return {
      progress: load(K.progress),
      read: load(K.read),
      quiz: load(K.quiz),
      last: null
    };
  }
  try { store.last = JSON.parse(localStorage.getItem(K.last)) || null; } catch (e) { store.last = null; }

  /* ---------------- tiny DOM helpers ---------------- */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function el(tag, cls, html) {
    var d = document.createElement(tag);
    if (cls) d.className = cls;
    if (html != null) d.innerHTML = html;
    return d;
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/&/g, '&amp;')
      .replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---------------- component CSS (single source, injected once) -------- */
  var SU_CSS = [
    '.su-progress{position:fixed;top:0;left:0;right:0;height:3px;z-index:90;pointer-events:none;background:transparent}',
    '.su-progress>div{height:100%;width:0;background:linear-gradient(90deg,#4f46e5,#8b5cf6,#f59e0b);transition:width .08s linear}',
    '.su-toc{margin:14px 0 20px;border:1px solid var(--line,#e2e8f0);border-left:4px solid #f59e0b;border-radius:0 12px 12px 0;background:var(--card,#fff);padding:10px 16px;font-size:13.5px;font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif}',
    '.su-toc summary{cursor:pointer;font-weight:800;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#64748b;list-style:none;user-select:none}',
    '.su-toc summary::-webkit-details-marker{display:none}',
    '.su-toc summary::before{content:"\\25B8  "}',
    '.su-toc[open] summary::before{content:"\\25BE  "}',
    '.su-toc nav{margin-top:8px;display:flex;flex-direction:column;gap:2px}',
    '.su-toc a{color:#475569;text-decoration:none;padding:2px 0 2px 10px;border-left:2px solid var(--line,#e2e8f0);font-size:13px}',
    '.su-toc a:hover{color:#4f46e5;border-left-color:#4f46e5}',
    '.su-toc a.lv3{margin-left:12px;font-size:12.5px;color:#64748b}',
    'html.su-dark .su-toc summary{color:#94a3b8}html.su-dark .su-toc a{color:#94a3b8}',
    '.su-meta{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:6px 0 4px;font-size:12.5px;color:#64748b;font-family:Inter,system-ui,sans-serif}',
    '.su-meta .pillx{border:1px solid var(--line,#e2e8f0);border-radius:999px;padding:2px 10px;background:#f8fafc;font-weight:600}',
    'html.su-dark .su-meta{color:#94a3b8}html.su-dark .su-meta .pillx{background:#0f172a}',
    '.su-bar{position:fixed;left:14px;bottom:14px;z-index:80;display:flex;gap:6px;align-items:center;background:rgba(15,23,42,.94);border:1px solid rgba(255,255,255,.14);border-radius:999px;padding:6px;box-shadow:0 10px 26px -10px rgba(15,23,42,.6);font-family:Inter,system-ui,sans-serif}',
    '.su-bar button{border:1px solid transparent;background:transparent;color:#e2e8f0;border-radius:999px;font-size:13px;font-weight:700;padding:6px 12px;cursor:pointer;white-space:nowrap}',
    '.su-bar button:hover{background:rgba(255,255,255,.12)}',
    '.su-bar .su-done.is-done{background:#16a34a;border-color:#16a34a;color:#fff}',
    '.su-done-pill{cursor:pointer;font-family:inherit}',
    '.su-done-pill.is-done{background:#16a34a!important;color:#fff!important;border-color:#16a34a!important}',
    '.su-quizbar{position:sticky;top:64px;z-index:40;display:flex;gap:10px;align-items:center;flex-wrap:wrap;margin:10px 0;padding:10px 14px;border-radius:12px;background:#1e1b4b;color:#e0e7ff;font-size:13px;font-weight:600;font-family:Inter,system-ui,sans-serif;box-shadow:0 8px 22px -10px rgba(30,27,75,.7)}',
    '.su-quizbar b{color:#fbbf24;font-variant-numeric:tabular-nums}',
    '.su-quizbar button{border:1px solid rgba(255,255,255,.3);background:rgba(255,255,255,.1);color:#fff;border-radius:999px;padding:4px 12px;font-size:12px;font-weight:700;cursor:pointer}',
    '.su-quizbar button:hover{background:rgba(255,255,255,.22)}',
    '.su-score{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}',
    '.su-score button{border:1px solid var(--line,#e2e8f0);background:#fff;border-radius:999px;padding:6px 14px;font-size:12.5px;font-weight:700;cursor:pointer;font-family:Inter,system-ui,sans-serif}',
    '.su-score button[data-su-right]{color:#15803d;border-color:#bbf7d0;background:#f0fdf4}',
    '.su-score button[data-su-wrong]{color:#b91c1c;border-color:#fecaca;background:#fef2f2}',
    '.su-score button:hover{filter:brightness(.96)}',
    '.su-score button:disabled{opacity:.45;cursor:default}',
    'html.su-dark .su-score button[data-su-right]{background:rgba(20,83,45,.3);color:#4ade80}',
    'html.su-dark .su-score button[data-su-wrong]{background:rgba(127,29,29,.3);color:#fca5a5}',
    '.qa.su-right{border-color:#16a34a;box-shadow:0 0 0 1px #16a34a}',
    '.qa.su-wrong{border-color:#ef4444;box-shadow:0 0 0 1px #ef4444}',
    '.qa .su-verdict{font-size:12px;font-weight:800;margin-left:8px}',
    '.qa.su-right .su-verdict{color:#16a34a}.qa.su-wrong .su-verdict{color:#ef4444}',
    '.su-best{font-size:12px;font-weight:700;color:#b45309;background:#fffbeb;border:1px solid #fde68a;border-radius:999px;padding:2px 10px}',
    'html.su-dark .su-best{background:rgba(120,53,15,.3);border-color:#92400e;color:#fcd34d}',
    '@media print{.su-bar,.su-progress,.su-quizbar,.su-score,.su-toc{display:none!important}}'
  ].join('\n');

  function injectCSS() {
    if (document.getElementById('su-css')) return;
    var s = document.createElement('style');
    s.id = 'su-css';
    s.textContent = SU_CSS;
    document.head.appendChild(s);
  }

  /* ---------------- theme ---------------- */
  function isDark() {
    try { return localStorage.getItem(K.theme) === 'dark'; } catch (e) { return false; }
  }
  function applyTheme() {
    document.documentElement.classList.toggle('su-dark', isDark());
    document.documentElement.classList.toggle('dark', isDark());
    $all('.su-theme').forEach(function (b) {
      b.textContent = isDark() ? '☀ Light' : '◐ Dark';
      b.setAttribute('aria-pressed', isDark() ? 'true' : 'false');
    });
  }
  function toggleTheme() {
    try { localStorage.setItem(K.theme, isDark() ? 'light' : 'dark'); } catch (e) { /* noop */ }
    applyTheme();
  }

  /* ---------------- progress (topics) + read (pages) ---------------- */
  function isDone(nav) { return !!nav && load(K.progress)[nav] === 1; }
  function toggleDone(nav) {
    if (!nav) return false;
    var p = load(K.progress);
    if (p[nav] === 1) delete p[nav]; else p[nav] = 1;
    save(K.progress, p);
    paintDoneButtons();
    return p[nav] === 1;
  }
  function markRead(rel) {
    if (!rel) return;
    var r = load(K.read);
    if (!r[rel]) { r[rel] = 1; save(K.read, r); }
  }
  function paintDoneButtons() {
    var nav = document.body.getAttribute('data-study-nav');
    var done = isDone(nav);
    $all('[data-su-done]').forEach(function (b) {
      b.classList.toggle('is-done', done);
      b.innerHTML = done ? '✓ Done — tap to undo' : '✓ Mark complete';
      b.setAttribute('aria-pressed', done ? 'true' : 'false');
    });
    var bar = $('.su-bar .su-done');
    if (bar) {
      bar.classList.toggle('is-done', done);
      bar.textContent = done ? '✓ Done' : '✓ Mark complete';
    }
  }

  /* ---------------- last visited ---------------- */
  function recordLast() {
    var b = document.body;
    var nav = b.getAttribute('data-study-nav');
    var rel = b.getAttribute('data-study-rel');
    if (!nav && !rel) return;
    var title = b.getAttribute('data-study-title') ||
      ((document.querySelector('h1') || {}).textContent || '').trim().slice(0, 90) || 'Study page';
    try {
      localStorage.setItem(K.last, JSON.stringify({
        kind: b.getAttribute('data-study-kind') || 'doc',
        nav: nav || '', rel: rel || '', title: title, ts: Date.now()
      }));
    } catch (e) { /* noop */ }
  }
  function getLast() {
    try { return JSON.parse(localStorage.getItem(K.last)) || null; } catch (e) { return null; }
  }

  /* ---------------- read stats ---------------- */
  function readStats(container) {
    var text = (container || document.body).textContent || '';
    var words = text.replace(/\s+/g, ' ').trim().split(' ').filter(Boolean).length;
    var mins = Math.max(1, Math.round(words / 200));
    return { words: words, mins: mins };
  }

  /* ---------------- floating toolbar ---------------- */
  function ensureBar(opts) {
    opts = opts || {};
    if ($('.su-bar')) return;
    var bar = el('div', 'su-bar no-print');
    bar.setAttribute('role', 'toolbar');
    bar.setAttribute('aria-label', 'Study tools');
    var theme = el('button', 'su-theme', isDark() ? '☀ Light' : '◐ Dark');
    theme.type = 'button';
    theme.title = 'Toggle dark / light mode';
    /* clicks handled by the delegated .su-theme listener in boot() */
    bar.appendChild(theme);
    if (opts.done) {
      var nav = document.body.getAttribute('data-study-nav');
      var done = el('button', 'su-done' + (isDone(nav) ? ' is-done' : ''),
        isDone(nav) ? '✓ Done' : '✓ Mark complete');
      done.type = 'button';
      done.title = 'Mark this topic complete (syncs with the tracker)';
      done.addEventListener('click', function () {
        var now = toggleDone(nav);
        if (now) markRead(document.body.getAttribute('data-study-rel'));
      });
      bar.appendChild(done);
    }
    document.body.appendChild(bar);
  }

  /* ---------------- reading progress bar ---------------- */
  function readingProgress(container) {
    var bar = el('div', 'su-progress no-print', '<div></div>');
    document.body.appendChild(bar);
    var fill = bar.firstChild;
    function paint() {
      var target = container || document.querySelector('.card, .wrap');
      if (!target) return;
      var rect = target.getBoundingClientRect();
      var total = rect.height - window.innerHeight;
      var done = Math.min(Math.max(-rect.top, 0), Math.max(total, 1));
      fill.style.width = (total > 0 ? Math.round(100 * done / total) : 0) + '%';
      var rel = document.body.getAttribute('data-study-rel');
      if (rel && total > 0 && done / total > 0.85) markRead(rel);
    }
    window.addEventListener('scroll', paint, { passive: true });
    window.addEventListener('resize', paint);
    paint();
  }

  /* ---------------- auto TOC + read-time badge ---------------- */
  function slugify(s) {
    return s.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim()
      .replace(/\s+/g, '-').slice(0, 60) || 'sec';
  }
  function enhanceArticle(container) {
    if (!container) return;
    var h1 = container.querySelector('h1');
    // read-time badge
    var st = readStats(container);
    var meta = el('p', 'su-meta');
    var section = document.body.getAttribute('data-study-section');
    meta.innerHTML = '<span class="pillx">🕐 ' + st.mins + ' min read</span>' +
      '<span class="pillx">📄 ' + st.words.toLocaleString() + ' words</span>' +
      (section ? '<span class="pillx">' + esc(section) + '</span>' : '');
    if (h1 && h1.parentNode) h1.parentNode.insertBefore(meta, h1.nextSibling);
    else container.insertBefore(meta, container.firstChild);
    // auto TOC from h2/h3
    var heads = $all('h2, h3', container).filter(function (h) {
      return h.textContent.trim().length > 1 && !h.closest('.qa');
    });
    if (heads.length < 2) return;
    var used = {};
    var nav = el('nav');
    heads.forEach(function (h) {
      if (!h.id) {
        var base = slugify(h.textContent), id = base, k = 2;
        while (used[id] || document.getElementById(id)) id = base + '-' + (k++);
        used[id] = 1; h.id = id;
      }
      h.style.scrollMarginTop = '120px';
      var a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent.trim().slice(0, 80);
      if (h.tagName === 'H3') a.className = 'lv3';
      nav.appendChild(a);
    });
    var det = el('details', 'su-toc no-print');
    var sum = el('summary', '', 'On this page · ' + heads.length + ' sections');
    det.appendChild(sum);
    det.appendChild(nav);
    meta.parentNode.insertBefore(det, meta.nextSibling);
  }

  /* ---------------- quiz / self-test mode ---------------- */
  function answerReveals(card) {
    /* every reveal counts — including mains model outlines, which close for
       self-testing (recall the points, then open to self-check) */
    return $all('details.qa-a', card);
  }
  function quizify(scope, pageId) {
    scope = scope || document;
    var cards = $all('.qa', scope).filter(function (c) {
      return answerReveals(c).length > 0;
    });
    if (!cards.length) return 0;
    pageId = pageId || document.body.getAttribute('data-study-nav') +
      '|' + (document.body.getAttribute('data-study-section') || '') +
      '|' + (document.body.getAttribute('data-study-rel') || location.pathname);
    // quiz entry button (in the existing toolbar when present)
    var toolbar = $('.qa-toolbar', scope);
    if (toolbar && !$('[data-su-quiz]', toolbar)) {
      var qb = el('button', '', '🎯 Quiz me');
      qb.type = 'button';
      qb.setAttribute('data-su-quiz', '1');
      qb.title = 'Hide every answer and test yourself';
      qb.addEventListener('click', function () { enterQuiz(scope, cards, pageId); });
      toolbar.appendChild(qb);
      var best = load(K.quiz)[pageId];
      if (best && best.total) {
        var pct = Math.round(100 * best.got / best.total);
        toolbar.appendChild(el('span', 'su-best',
          '★ Best score ' + best.got + '/' + best.total + ' (' + pct + '%)'));
      }
    }
    return cards.length;
  }
  function enterQuiz(scope, cards, pageId) {
    if ($('.su-quizbar', scope)) return;
    cards.forEach(function (c) {
      answerReveals(c).forEach(function (d) { d.open = false; });
      c.classList.remove('su-right', 'su-wrong');
      var old = $('.su-score', c);
      if (old) old.remove();
      var oldV = $('.su-verdict', c);
      if (oldV) oldV.remove();
    });
    var got = 0, marked = 0, total = cards.length;
    var bar = el('div', 'su-quizbar no-print');
    function paintBar() {
      var pct = marked ? Math.round(100 * got / marked) : 0;
      bar.innerHTML = '<span>🎯 Quiz mode — answer in your head, then score yourself.</span>' +
        '<span>Score <b>' + got + '/' + marked + '</b>' + (marked ? ' (' + pct + '%)' : '') +
        ' · ' + marked + '/' + total + ' done</span>';
      var reset = el('button', '', '↺ Reset');
      reset.type = 'button';
      reset.addEventListener('click', function () { exitQuiz(scope, cards); enterQuiz(scope, cards, pageId); });
      var exit = el('button', '', 'Exit quiz ✕');
      exit.type = 'button';
      exit.addEventListener('click', function () { exitQuiz(scope, cards); });
      bar.appendChild(reset);
      bar.appendChild(exit);
    }
    paintBar();
    cards[0].parentNode.insertBefore(bar, cards[0]);
    try { bar.scrollIntoView({ behavior: 'smooth', block: 'start' }); } catch (e) { /* noop */ }
    cards.forEach(function (c) {
      var row = el('div', 'su-score');
      var okB = el('button', '', '✓ I knew it');
      okB.type = 'button'; okB.setAttribute('data-su-right', '1');
      var noB = el('button', '', '✗ Review later');
      noB.type = 'button'; noB.setAttribute('data-su-wrong', '1');
      function score(right) {
        if (c.classList.contains('su-right') || c.classList.contains('su-wrong')) return;
        c.classList.add(right ? 'su-right' : 'su-wrong');
        marked++;
        if (right) got++;
        var badge = $('.qa-badge', c);
        if (badge && !$('.su-verdict', c)) {
          var v = el('span', 'su-verdict', right ? '✓ +1' : '✗ review');
          badge.parentNode.insertBefore(v, badge.nextSibling);
        }
        answerReveals(c).forEach(function (d) { d.open = true; });
        okB.disabled = true; noB.disabled = true;
        paintBar();
        persist();
      }
      okB.addEventListener('click', function () { score(true); });
      noB.addEventListener('click', function () { score(false); });
      row.appendChild(okB);
      row.appendChild(noB);
      var q = $('.qa-q', c) || c;
      q.appendChild(row);
    });
    function persist() {
      if (!marked) return;
      var q = load(K.quiz);
      var prev = q[pageId];
      var pct = got / marked;
      if (!prev || !prev.total || pct > prev.got / prev.total ||
        (pct === prev.got / prev.total && marked > prev.total)) {
        q[pageId] = { got: got, total: marked };
        save(K.quiz, q);
      }
    }
  }
  function exitQuiz(scope, cards) {
    $all('.su-quizbar', scope).forEach(function (b) { b.remove(); });
    (cards || $all('.qa', scope)).forEach(function (c) {
      var row = $('.su-score', c);
      if (row) row.remove();
    });
  }

  /* ---------------- page-kind boot ---------------- */
  function bootDoc() {
    var card = $('.card');
    if (card) enhanceArticle(card);
    readingProgress(card);
    ensureBar({ done: !!document.body.getAttribute('data-study-nav') });
    paintDoneButtons();
    $all('[data-su-done]').forEach(function (b) {
      if (b.dataset.wired) return;
      b.dataset.wired = '1';
      b.addEventListener('click', function () {
        var nav = document.body.getAttribute('data-study-nav');
        var now = toggleDone(nav);
        if (now) markRead(document.body.getAttribute('data-study-rel'));
      });
    });
    quizify(document);
    recordLast();
  }
  function bootLesson() {
    var wrap = $('.wrap');
    if (wrap) enhanceArticle(wrap);
    readingProgress(wrap);
    ensureBar({ done: !!document.body.getAttribute('data-study-nav') });
    paintDoneButtons();
    $all('[data-su-done]').forEach(function (b) {
      if (b.dataset.wired) return;
      b.dataset.wired = '1';
      b.addEventListener('click', function () {
        toggleDone(document.body.getAttribute('data-study-nav'));
      });
    });
    quizify(document);
    recordLast();
  }
  function bootEdition() {
    readingProgress($('.wrap'));
    ensureBar({});
    quizify(document);
  }
  function bootCatalog() {
    ensureBar({});
    var r = load(K.read);
    $all('a[data-rel]').forEach(function (a) {
      if (r[a.getAttribute('data-rel')]) {
        var li = a.closest ? a.closest('li') : a.parentNode;
        if (li) li.classList.add('is-read');
      }
    });
  }
  function bootBookIndex() {
    ensureBar({});
    var p = load(K.progress);
    var n = 0, d = 0;
    $all('.bk-toc a[data-nav]').forEach(function (a) {
      n++;
      if (p[a.getAttribute('data-nav')] === 1) {
        d++;
        a.classList.add('is-read');
        if (!$('.bk-tick', a)) {
          var t = el('span', 'bk-tick', '✓');
          a.appendChild(t);
        }
      }
    });
    var hero = $('.bk-stats');
    if (hero && n) {
      var pct = Math.round(100 * d / n);
      var div = el('div', '', '<b>' + pct + '%</b><span>Completed</span>');
      div.id = 'bk-progress-mine';
      hero.appendChild(div);
    }
  }
  function bootHome() {
    ensureBar({});
    // continue learning
    var last = getLast();
    var box = $('#su-continue');
    if (box) {
      if (last && (last.rel || last.nav)) {
        var href = last.rel || '#';
        box.hidden = false;
        $('#su-continue-title').textContent = last.title || 'your last topic';
        $('#su-continue-link').setAttribute('href', href);
      } else {
        box.hidden = true;
      }
    }
    // per-area progress bars
    var p = load(K.progress);
    var totalDone = 0, totalN = 0;
    $all('[data-leaves]').forEach(function (card) {
      var leaves = (card.getAttribute('data-leaves') || '').split('|').filter(Boolean);
      var done = leaves.filter(function (nav) { return p[nav] === 1; }).length;
      totalDone += done; totalN += leaves.length;
      var pct = leaves.length ? Math.round(100 * done / leaves.length) : 0;
      var bar = $('.su-area-fill', card);
      var lab = $('.su-area-pct', card);
      if (bar) bar.style.width = Math.max(2, pct) + '%';
      if (lab) lab.textContent = pct + '% · ' + done + '/' + leaves.length;
      card.classList.toggle('is-complete', pct === 100 && leaves.length > 0);
    });
    var mine = $('#su-my-progress');
    if (mine && totalN) {
      var pct = Math.round(100 * totalDone / totalN);
      mine.hidden = false;
      $('.su-my-fill', mine).style.width = Math.max(2, pct) + '%';
      $('.su-my-label', mine).textContent = pct + '% of the syllabus complete (' + totalDone + '/' + totalN + ' topics)';
    }
    // live filter
    var q = $('#su-filter');
    if (q) {
      var cards = $all('[data-area]');
      var count = $('#su-filter-count');
      q.addEventListener('input', function () {
        var s = q.value.trim().toLowerCase();
        var shown = 0;
        cards.forEach(function (c) {
          var hit = !s || c.textContent.toLowerCase().indexOf(s) !== -1;
          c.style.display = hit ? '' : 'none';
          if (hit) shown++;
        });
        if (count) count.textContent = s ? shown + ' of ' + cards.length + ' sections match' : '';
      });
    }
  }

  /* ---------------- public API (used by the SPA too) ---------------- */
  window.Study = {
    store: store,
    isDark: isDark,
    applyTheme: applyTheme,
    toggleTheme: toggleTheme,
    isDone: isDone,
    toggleDone: toggleDone,
    markRead: markRead,
    recordLast: recordLast,
    getLast: getLast,
    readStats: readStats,
    quizify: quizify,
    enhanceArticle: enhanceArticle,
    readingProgress: readingProgress,
    keys: K
  };

  /* ---------------- auto-boot for static pages ---------------- */
  injectCSS();
  applyTheme();
  try {
    window.addEventListener('storage', function (e) {
      if (e.key === K.theme) applyTheme();
      if (e.key === K.progress) paintDoneButtons();
    });
  } catch (e) { /* noop */ }

  function boot() {
    // delegated wiring so header buttons added by any template just work
    document.addEventListener('click', function (e) {
      if (e.target.closest && e.target.closest('.su-theme')) {
        e.preventDefault();
        toggleTheme();
      }
    });
    var kind = document.body.getAttribute('data-study-kind') || '';
    if (!kind) return;
    if (kind === 'doc') bootDoc();
    else if (kind === 'lesson') bootLesson();
    else if (kind === 'edition') bootEdition();
    else if (kind === 'catalog') bootCatalog();
    else if (kind === 'book-index') bootBookIndex();
    else if (kind === 'home') bootHome();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
