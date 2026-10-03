/* =========================================================================
   app.js — router, search, renderers and tools for the documentation site.
   Vanilla JS, no build step. Reads DOC (content.js), SourceFiles (source.js),
   Diagrams (diagrams.js) and Highlight (highlight.js).
   ========================================================================= */
(function () {
  'use strict';

  var DOC = window.DOC;
  var SRC = window.SourceFiles;
  var DIA = window.Diagrams;
  var HL = window.Highlight;

  var el = function (id) { return document.getElementById(id); };
  var contentEl = el('content');
  var navEl = el('nav');
  var inputEl = el('searchInput');
  var resultsEl = el('searchResults');

  var sectionById = {};
  DOC.sections.forEach(function (s) { sectionById[s.id] = s; });

  var partById = {};
  DOC.parts.forEach(function (p) { partById[p.id] = p; });

  /* ── inline markdown: `code`, **bold**, *em*, [label](href) ───────────── */
  function md(text) {
    return HL.escape(String(text == null ? '' : text))
      .replace(/`([^`]+)`/g, function (_, c) { return '<code>' + c + '</code>'; })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/\*([^*]+)\*/g, '<em>$1</em>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');
  }

  function slug(text) {
    return String(text).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
  }

  /* ── block renderers ─────────────────────────────────────────────────── */
  var R = {};

  R.p = function (b) { return '<p>' + md(b.v) + '</p>'; };
  R.h = function (b, ctx) { ctx.heads.push({ id: 'h-' + slug(b.v), text: b.v }); return '<h3 id="h-' + slug(b.v) + '">' + md(b.v) + '</h3>'; };
  R.ul = function (b) { return '<ul>' + b.v.map(function (i) { return '<li>' + md(i) + '</li>'; }).join('') + '</ul>'; };
  R.ol = function (b) { return '<ol>' + b.v.map(function (i) { return '<li>' + md(i) + '</li>'; }).join('') + '</ol>'; };

  R.keys = function (b) {
    return '<dl class="keys">' + b.v.map(function (row) {
      return '<div class="keyrow"><dt>' + md(row[0]) + '</dt><dd>' + md(row[1]) + '</dd></div>';
    }).join('') + '</dl>';
  };

  R.table = function (b) {
    return '<div class="tbl-wrap"><table><thead><tr>' +
      b.head.map(function (h) { return '<th>' + md(h) + '</th>'; }).join('') +
      '</tr></thead><tbody>' +
      b.rows.map(function (r) {
        return '<tr>' + r.map(function (c) { return '<td>' + md(c) + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  };

  R.code = function (b) {
    var body = HL.render(b.v, b.lang, b.at);
    return '<div class="code"><div class="code-head">' +
      (b.file ? '<span class="code-file">' + HL.escape(b.file) + '</span>' : '') +
      (b.lang ? '<span class="code-lang">' + HL.escape(b.lang) + '</span>' : '') +
      (b.note ? '<span class="code-note">' + md(b.note) + '</span>' : '') +
      '<button class="copy-btn" data-copy>copy</button>' +
      '</div><pre><code>' + body + '</code></pre></div>';
  };

  var CALLOUT_ICON = { info: 'i', good: '✓', warn: '!', bad: '✕', absent: '∅' };

  R.callout = function (b) {
    return '<div class="callout ' + (b.kind || 'info') + '"><span class="co-ico">' +
      (CALLOUT_ICON[b.kind] || 'i') + '</span><div>' +
      (b.title ? '<p class="co-title">' + md(b.title) + '</p>' : '') +
      md(b.v) + '</div></div>';
  };

  R.cards = function (b) {
    return '<div class="cards">' + b.items.map(function (c) {
      return '<div class="card">' + (c.tag ? '<span class="tag">' + md(c.tag) + '</span>' : '') +
        '<h4>' + md(c.title) + '</h4><p>' + md(c.body) + '</p></div>';
    }).join('') + '</div>';
  };

  R.stats = function (b) {
    return '<div class="stats">' + b.items.map(function (i) {
      return '<div class="stat"><b>' + HL.escape(i[0]) + '</b><span>' + md(i[1]) + '</span></div>';
    }).join('') + '</div>';
  };

  R.chips = function (b) {
    return '<div class="chips">' + b.items.map(function (c) {
      var tone = c.tone ? ' ' + c.tone : '';
      return '<span class="chip' + tone + '">' + md(c.k) + '</span>';
    }).join('') + '</div>';
  };

  R.tree = function (b) { return '<div class="tree">' + b.v + '</div>'; };

  R.steps = function (b) {
    return '<ol class="steps">' + b.items.map(function (i) {
      return '<li><b>' + md(i.title) + '</b><span>' + md(i.body) + '</span></li>';
    }).join('') + '</ol>';
  };

  R.src = function (b) {
    var f = SRC.byId(b.v);
    if (!f) return '';
    return '<button class="src-ref" data-file="' + f.id + '">' + HL.escape(f.path) + '</button> ';
  };

  R.diagram = function (b) {
    var d = DIA.byId(b.id);
    if (!d) return '';
    return diagramBlock(d);
  };

  R.qa = function (b, ctx) {
    return qaBlock(b.items, ctx);
  };

  R.lessons = function (b) {
    var lvName = { 1: 'Beginner', 2: 'Intermediate', 3: 'Advanced' };
    return '<div class="pill-row" data-lesson-filter>' +
      [1, 2, 3].map(function (l) {
        return '<button class="pill' + (l === 1 ? ' is-on' : '') + '" data-lv="' + l + '">' + lvName[l] + '</button>';
      }).join('') +
      '<button class="pill" data-lv="all">All levels</button></div>' +
      b.items.map(function (i) {
        return '<div class="lesson lv' + i.lv + '" data-lv="' + i.lv + '">' +
          '<span class="lvl">' + lvName[i.lv] + '</span><h4>' + md(i.title) + '</h4><p>' + md(i.body) + '</p>' +
          '<div class="files">' + (i.files || []).map(function (fid) {
            var f = SRC.byId(fid);
            if (f) return '<button class="src-ref" data-file="' + f.id + '">' + HL.escape(f.path) + '</button>';
            if (sectionById[fid]) {
              var s = sectionById[fid];
              return '<a class="src-ref" href="#/s/' + s.id + '">§' + s.num + ' ' + HL.escape(s.title) + '</a>';
            }
            return '';
          }).join('') + '</div></div>';
      }).join('');
  };

  function renderBlocks(blocks, ctx) {
    return blocks.map(function (b) {
      var fn = R[b.t];
      if (!fn) return '';
      return fn(b, ctx);
    }).join('\n');
  }

  /* ── diagram block (interactive) ─────────────────────────────────────── */
  function diagramBlock(d) {
    return '<div class="dg-wrap" data-diagram="' + d.id + '">' + DIA.svg(d) +
      '<div class="dg-detail" data-dg-detail><h4>' + HL.escape(d.title) + '</h4><p>' + md(d.blurb) + '</p></div>' +
      (d.legend ? '<div class="dg-legend">' + d.legend.map(function (l) {
        return '<span><i style="background:' + l.color + '"></i>' + HL.escape(l.label) + '</span>';
      }).join('') + '</div>' : '') +
      '</div>';
  }

  /* ── qa block (filterable) ───────────────────────────────────────────── */
  function qaBlock(items, ctx) {
    var tags = {};
    items.forEach(function (i) { (i.tags || '').split(/\s+/).filter(Boolean).forEach(function (t) { tags[t] = 1; }); });
    var cats = Object.keys(tags).sort();
    return '<div class="pill-row" data-qa-filter>' + cats.map(function (c, i) {
      return '<button class="pill' + (i === 0 ? ' is-on' : '') + '" data-cat="' + HL.escape(c) + '">' + HL.escape(c) + '</button>';
    }).join('') + '</div>' +
      items.map(function (i) {
        var catList = (i.tags || '').split(/\s+/).filter(Boolean);
        return '<details class="qa" data-cat="' + HL.escape(catList.join(' ')) + '"><summary>' +
          '<span>' + md(i.q) + '</span><span class="qa-meta">' +
          catList.map(function (t) { return '<span class="chip">' + HL.escape(t) + '</span>'; }).join('') +
          '</span></summary><div class="qa-body">' + md(i.a) + '</div></details>';
      }).join('');
  }

  /* ── section view ────────────────────────────────────────────────────── */
  function sectionView(sec) {
    var part = partById[sec.part];
    var ctx = { heads: [] };
    var bodyHtml = renderBlocks(sec.blocks, ctx);

    var toc = '';
    if (ctx.heads.length > 2) {
      toc = '<nav class="toc"><h4>On this page</h4><ul>' + ctx.heads.map(function (h) {
        return '<li><a href="#/s/' + sec.id + '" data-jump="' + h.id + '">' + md(h.text) + '</a></li>';
      }).join('') + '</ul></nav>';
    }

    var idx = DOC.sections.indexOf(sec);
    var prev = DOC.sections[idx - 1];
    var next = DOC.sections[idx + 1];

    return '' +
      '<div class="crumbs"><a href="#/s/' + (prev ? prev.id : sec.id) + '">' + md(part ? part.title : '') + '</a>' +
      '<span class="sep">/</span><span>' + md(sec.title) + '</span></div>' +
      '<header class="hero">' +
      '<span class="hero-kicker">Section ' + sec.num + ' · ' + md(part ? part.title : '') + '</span>' +
      '<h1>' + md(sec.title) + '</h1>' +
      '<p class="lede">' + md(sec.lede) + '</p>' +
      '<div class="hero-meta">' + (sec.tags || '').split(/\s+/).filter(Boolean).slice(0, 8).map(function (t) {
        return '<span class="chip">' + HL.escape(t) + '</span>';
      }).join('') + '</div></header>' +
      '<div class="blocks">' + bodyHtml + '</div>' +
      toc +
      '<nav class="pager">' +
      (prev ? '<a href="#/s/' + prev.id + '"><small>← Previous</small><b>' + md(prev.title) + '</b></a>' : '<span></span>') +
      (next ? '<a class="next" href="#/s/' + next.id + '"><small>Next →</small><b>' + md(next.title) + '</b></a>' : '<span></span>') +
      '</nav>';
  }

  /* ── code explorer view ──────────────────────────────────────────────── */
  var codeState = { file: null, filter: '' };

  function codeView(fileId) {
    var f = SRC.byId(fileId) || SRC.byId('notes-controller');
    codeState.file = f.id;

    var groups = [];
    SRC.list.forEach(function (item) {
      var g = groups.filter(function (x) { return x.name === item.group; })[0];
      if (!g) { g = { name: item.group, files: [] }; groups.push(g); }
      g.files.push(item);
    });

    var sidebar = '<div class="tool-panel"><header><span>&lt;/&gt;</span> Source explorer</header>' +
      '<div class="file-filter"><input type="search" id="fileFilter" placeholder="Filter files…" value="' + HL.escape(codeState.filter) + '"></div>' +
      '<ul class="file-list" id="fileList">' + groups.map(function (g) {
        return '<li class="grp">' + HL.escape(g.name) + '</li>' + g.files.map(function (item) {
          return '<li><button data-file="' + item.id + '" class="' + (item.id === f.id ? 'is-active' : '') + '">' +
            HL.escape(item.path) + '</button></li>';
        }).join('');
      }).join('') + '</ul></div>';

    var panel = '<div class="tool-panel"><header><span>' + HL.escape(f.path) + '</span>' +
      '<span class="code-lang">' + HL.escape(f.lang) + '</span></header>' +
      '<div style="padding:14px 16px 0"><p class="lede" style="font-size:15px">' + md(f.note || '') + '</p>' +
      '<div class="chips">' + (f.tags || '').split(/\s+/).filter(Boolean).map(function (t) {
        return '<span class="chip">' + HL.escape(t) + '</span>';
      }).join('') + '</div></div>' +
      '<div class="code" style="margin:0;border:0;border-radius:0;border-top:1px solid var(--border)">' +
      '<div class="code-head"><span class="code-file">' + HL.escape(f.path) + (f.at ? ' (from line ' + f.at + ')' : '') + '</span>' +
      '<button class="copy-btn" data-copy>copy</button></div>' +
      '<pre><code>' + HL.render(f.code, f.lang, f.at) + '</code></pre></div></div>';

    return '<div class="crumbs"><span>Tools</span><span class="sep">/</span><span>Code explorer</span></div>' +
      '<header class="hero"><h1>Code explorer</h1>' +
      '<p class="lede">Every snippet below is copied from the project source — no pseudocode, no invented methods.</p></header>' +
      '<div class="tool-grid">' + sidebar + panel + '</div>';
  }

  /* ── diagrams view ───────────────────────────────────────────────────── */
  function diagramsView(diagId) {
    var pills = '<div class="pill-row">' + DIA.list.map(function (d) {
      return '<button class="pill' + (d.id === diagId ? ' is-on' : '') + '" data-diagram-pill="' + d.id + '">' + HL.escape(d.title) + '</button>';
    }).join('') + '</div>';

    var d = DIA.byId(diagId) || DIA.list[0];
    return '<div class="crumbs"><span>Tools</span><span class="sep">/</span><span>Diagrams</span></div>' +
      '<header class="hero"><h1>Interactive diagrams</h1>' +
      '<p class="lede">Click a node to read what it is and where it lives in the code.</p></header>' +
      pills + diagramBlock(d);
  }

  /* ── interview view ──────────────────────────────────────────────────── */
  function interviewView() {
    var sec = DOC.sections.filter(function (s) { return s.id === 'interview'; })[0];
    var qaBlockDef = sec.blocks.filter(function (b) { return b.t === 'qa'; })[0];
    return '<div class="crumbs"><span>Tools</span><span class="sep">/</span><span>Interview pack</span></div>' +
      '<header class="hero"><h1>Interview preparation</h1>' +
      '<p class="lede">' + md(sec.lede) + '</p></header>' + qaBlock(qaBlockDef.items, {});
  }

  /* ── glossary view ───────────────────────────────────────────────────── */
  function glossaryView() {
    return '<div class="crumbs"><span>Tools</span><span class="sep">/</span><span>Glossary</span></div>' +
      '<header class="hero"><h1>Glossary</h1><p class="lede">Terms used by this codebase, defined by how the code uses them.</p></header>' +
      '<div class="tool-panel"><div class="file-filter"><input type="search" id="glossaryFilter" placeholder="Filter terms…"></div>' +
      '<div style="padding:14px"><dl class="keys" id="glossaryList">' + DOC.glossary.map(function (g) {
        return '<div class="keyrow" data-term="' + HL.escape(g[0].toLowerCase()) + ' ' + HL.escape(g[1].toLowerCase()) + '">' +
          '<dt>' + md(g[0]) + '</dt><dd>' + md(g[1]) + '</dd></div>';
      }).join('') + '</dl></div></div>';
  }

  /* ── not found ───────────────────────────────────────────────────────── */
  function notFoundView(path) {
    return '<header class="hero"><h1>Page not found</h1>' +
      '<p class="lede">Nothing is routed at <code>' + HL.escape(path) + '</code>.</p></header>' +
      '<p><a href="#/s/overview">Go to the overview</a> · <a href="#/tools/code">Code explorer</a> · <a href="#/tools/diagrams">Diagrams</a></p>';
  }

  /* ── router ──────────────────────────────────────────────────────────── */
  var TOOL_PATHS = ['code', 'diagrams', 'interview', 'glossary'];

  function route() {
    var hash = location.hash.replace(/^#\/?/, '');
    var parts = hash.split('/').filter(Boolean);

    closeNav();
    closeSearch();

    if (!parts.length) { location.replace('#/s/overview'); return; }

    if (parts[0] === 'tools' && TOOL_PATHS.indexOf(parts[1]) > -1) {
      if (parts[1] === 'code') render(codeView(parts[2]));
      else if (parts[1] === 'diagrams') render(diagramsView(parts[2]));
      else if (parts[1] === 'interview') render(interviewView());
      else render(glossaryView());
      setActiveNav(null);
    } else if (parts[0] === 's' && sectionById[parts[1]]) {
      render(sectionView(sectionById[parts[1]]));
      setActiveNav(parts[1]);
    } else {
      render(notFoundView(hash));
      setActiveNav(null);
    }

    contentEl.scrollTop = 0;
    window.scrollTo({ top: 0, behavior: 'auto' });
    contentEl.focus({ preventScroll: true });
  }

  function render(html) {
    contentEl.innerHTML = html;
    bindDynamic();
  }

  /* ── sidebar ─────────────────────────────────────────────────────────── */
  function buildNav() {
    navEl.innerHTML = DOC.parts.map(function (part) {
      var secs = DOC.sections.filter(function (s) { return s.part === part.id; });
      return '<div class="nav-part"><button data-part="' + part.id + '" aria-expanded="true">' +
        '<span><span class="nav-part-num">' + part.num + '</span> · ' + HL.escape(part.title) + '</span>' +
        '<span aria-hidden="true">▾</span></button>' +
        '<ul class="nav-list" data-part-list="' + part.id + '">' +
        secs.map(function (s) {
          return '<li><a href="#/s/' + s.id + '" data-nav="' + s.id + '"><span class="n">' + s.num + '</span><span>' + HL.escape(s.title) + '</span></a></li>';
        }).join('') + '</ul></div>';
    }).join('');

    navEl.addEventListener('click', function (e) {
      var btn = e.target.closest('button[data-part]');
      if (!btn) return;
      var list = navEl.querySelector('[data-part-list="' + btn.dataset.part + '"]');
      var open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', String(!open));
      list.style.display = open ? 'none' : '';
    });
  }

  function setActiveNav(id) {
    var links = navEl.querySelectorAll('a[data-nav]');
    Array.prototype.forEach.call(links, function (a) {
      a.classList.toggle('is-active', a.dataset.nav === id);
      if (a.dataset.nav === id && window.innerWidth > 900) {
        a.scrollIntoView({ block: 'nearest' });
      }
    });
  }

  /* ── search ──────────────────────────────────────────────────────────── */
  var INDEX = null;
  var activeResult = -1;

  function blockText(b) {
    if (!b) return '';
    if (b.t === 'code') return (b.file || '') + ' ' + b.v;
    if (b.t === 'qa') return b.items.map(function (i) { return i.q + ' ' + i.a; }).join(' ');
    if (b.t === 'lessons') return b.items.map(function (i) { return i.title + ' ' + i.body; }).join(' ');
    if (b.t === 'table') return b.head.join(' ') + ' ' + b.rows.map(function (r) { return r.join(' '); }).join(' ');
    if (b.t === 'cards') return b.items.map(function (i) { return i.title + ' ' + i.body; }).join(' ');
    if (b.t === 'keys') return b.v.map(function (r) { return r.join(' '); }).join(' ');
    if (b.t === 'stats') return b.items.map(function (i) { return i.join(' '); }).join(' ');
    if (b.t === 'steps') return b.items.map(function (i) { return i.title + ' ' + i.body; }).join(' ');
    if (b.v && typeof b.v === 'string') return b.v;
    return JSON.stringify(b);
  }

  function buildIndex() {
    var rows = [];
    DOC.sections.forEach(function (s) {
      rows.push({ kind: 'section', id: s.id, title: s.title + ' — §' + s.num,
        sub: s.lede, text: (s.tags || '') + ' ' + s.blocks.map(blockText).join(' ') });
    });
    SRC.list.forEach(function (f) {
      rows.push({ kind: 'file', id: f.id, title: f.path, sub: 'Code explorer · ' + f.group, text: (f.tags || '') + ' ' + f.note + ' ' + f.code });
    });
    DIA.list.forEach(function (d) {
      rows.push({ kind: 'diagram', id: d.id, title: d.title, sub: 'Interactive diagram', text: d.blurb + ' ' + d.nodes.map(function (n) { return n.label + ' ' + n.sub + ' ' + n.detail; }).join(' ') });
    });
    rows.forEach(function (r) { r.hay = (r.title + ' ' + r.sub + ' ' + r.text).toLowerCase(); });
    INDEX = rows;
  }

  function search(query) {
    var q = query.trim().toLowerCase();
    if (q.length < 2) return [];
    var terms = q.split(/\s+/);
    var out = [];
    for (var i = 0; i < INDEX.length; i++) {
      var row = INDEX[i];
      var score = 0, ok = true;
      for (var t = 0; t < terms.length; t++) {
        var term = terms[t];
        var at = row.hay.indexOf(term);
        if (at < 0) { ok = false; break; }
        if (row.title.toLowerCase().indexOf(term) === 0) score += 12;
        else if (row.title.toLowerCase().indexOf(term) > -1) score += 6;
        else score += 1 + Math.max(0, 3 - Math.floor(at / 400));
      }
      if (ok) out.push({ row: row, score: score });
    }
    out.sort(function (a, b) { return b.score - a.score; });
    return out.slice(0, 12).map(function (x) { return x.row; });
  }

  function highlightMatch(text, q) {
    var out = HL.escape(text);
    q.trim().split(/\s+/).filter(Boolean).forEach(function (term) {
      var re = new RegExp('(' + term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'ig');
      out = out.replace(re, '<mark>$1</mark>');
    });
    return out;
  }

  function renderResults(hits, q) {
    if (!q || q.trim().length < 2) { closeSearch(); return; }
    if (!hits.length) {
      resultsEl.innerHTML = '<div class="sr-empty">No match for “' + HL.escape(q) + '”. ' +
        'The search covers all ' + DOC.sections.length + ' sections, ' + SRC.list.length + ' source files and ' +
        DIA.list.length + ' diagrams.</div>';
      resultsEl.hidden = false;
      inputEl.setAttribute('aria-expanded', 'true');
      return;
    }
    var groups = { section: 'Sections', file: 'Source files', diagram: 'Diagrams' };
    var html = '';
    var lastKind = '';
    hits.forEach(function (h, i) {
      if (h.kind !== lastKind) { html += '<div class="sr-group">' + groups[h.kind] + '</div>'; lastKind = h.kind; }
      html += '<button class="sr-item" data-hit="' + i + '" role="option">' +
        '<b>' + highlightMatch(h.title, q) + '</b><small>' + highlightMatch(String(h.sub).slice(0, 110), q) + '</small></button>';
    });
    resultsEl.innerHTML = html;
    resultsEl.hidden = false;
    inputEl.setAttribute('aria-expanded', 'true');
    activeResult = -1;
  }

  function goToHit(hit) {
    if (!hit) return;
    if (hit.kind === 'section') location.hash = '#/s/' + hit.id;
    else if (hit.kind === 'file') location.hash = '#/tools/code/' + hit.id;
    else location.hash = '#/tools/diagrams/' + hit.id;
    closeSearch();
    inputEl.blur();
  }

  function closeSearch() {
    resultsEl.hidden = true;
    resultsEl.innerHTML = '';
    inputEl.setAttribute('aria-expanded', 'false');
    activeResult = -1;
  }

  function openNav() { document.body.classList.add('nav-open'); el('scrim').hidden = false; el('menuBtn').setAttribute('aria-expanded', 'true'); }
  function closeNav() {
    document.body.classList.remove('nav-open');
    var scrim = el('scrim');
    if (scrim) scrim.hidden = true;
    var mb = el('menuBtn');
    if (mb) mb.setAttribute('aria-expanded', 'false');
  }

  /* ── dynamic bindings after each render ──────────────────────────────── */
  function bindDynamic() {
    // copy buttons
    Array.prototype.forEach.call(contentEl.querySelectorAll('[data-copy]'), function (btn) {
      btn.addEventListener('click', function () {
        var code = btn.closest('.code').querySelector('pre');
        var text = Array.prototype.map.call(code.querySelectorAll('.ln'), function (l) {
          return l.textContent.replace(/^\s*\d+/, '');
        }).join('\n');
        copy(text);
      });
    });

    // source-reference buttons
    Array.prototype.forEach.call(contentEl.querySelectorAll('[data-file]'), function (btn) {
      btn.addEventListener('click', function () { location.hash = '#/tools/code/' + btn.dataset.file; });
    });

    // code explorer file list
    var fileFilter = el('fileFilter');
    if (fileFilter) {
      fileFilter.addEventListener('input', function () {
        codeState.filter = fileFilter.value;
        var q = fileFilter.value.trim().toLowerCase();
        Array.prototype.forEach.call(el('fileList').querySelectorAll('li'), function (li) {
          var btn = li.querySelector('button');
          li.style.display = !btn || !q || btn.textContent.toLowerCase().indexOf(q) > -1 ? '' : 'none';
        });
      });
    }
    Array.prototype.forEach.call(contentEl.querySelectorAll('#fileList button'), function (btn) {
      btn.addEventListener('click', function () { location.hash = '#/tools/code/' + btn.dataset.file; });
    });

    // diagram nodes
    Array.prototype.forEach.call(contentEl.querySelectorAll('.dg-wrap'), function (wrap) {
      var d = DIA.byId(wrap.dataset.diagram);
      var detail = wrap.querySelector('[data-dg-detail]');
      wrap.addEventListener('click', function (e) {
        var node = e.target.closest('.dg-node');
        if (!node || !d) return;
        Array.prototype.forEach.call(wrap.querySelectorAll('.dg-node'), function (n) { n.classList.remove('is-active'); });
        node.classList.add('is-active');
        var data = d.nodes.filter(function (n) { return n.id === node.dataset.node; })[0];
        if (!data) return;
        detail.innerHTML = '<h4>' + HL.escape(String(data.label).replace('\n', ' ')) + '</h4>' +
          (data.sub ? '<div class="chips"><span class="chip">' + HL.escape(data.sub) + '</span></div>' : '') +
          '<p>' + md(data.detail) + '</p>' +
          (data.files && data.files.length ? '<div class="files" style="display:flex;gap:6px;flex-wrap:wrap">' +
            data.files.map(function (p) {
              var f = SRC.list.filter(function (x) { return x.path === p; })[0];
              return f ? '<button class="src-ref" data-file="' + f.id + '">' + HL.escape(p) + '</button>' :
                '<span class="src-ref">' + HL.escape(p) + '</span>';
            }).join('') + '</div>' : '');
        Array.prototype.forEach.call(detail.querySelectorAll('[data-file]'), function (b) {
          b.addEventListener('click', function () { location.hash = '#/tools/code/' + b.dataset.file; });
        });
      });
    });

    // diagram picker pills
    Array.prototype.forEach.call(contentEl.querySelectorAll('[data-diagram-pill]'), function (pill) {
      pill.addEventListener('click', function () { location.hash = '#/tools/diagrams/' + pill.dataset.diagramPill; });
    });

    // interview category filter
    var qaFilter = contentEl.querySelector('[data-qa-filter]');
    if (qaFilter) {
      qaFilter.addEventListener('click', function (e) {
        var pill = e.target.closest('.pill');
        if (!pill) return;
        Array.prototype.forEach.call(qaFilter.querySelectorAll('.pill'), function (p) { p.classList.remove('is-on'); });
        pill.classList.add('is-on');
        var cat = pill.dataset.cat;
        Array.prototype.forEach.call(contentEl.querySelectorAll('.qa'), function (qa) {
          var cats = (qa.dataset.cat || '').split(/\s+/);
          qa.style.display = cats.indexOf(cat) > -1 ? '' : 'none';
        });
      });
    }

    // lesson level filter
    var lessonFilter = contentEl.querySelector('[data-lesson-filter]');
    if (lessonFilter) {
      lessonFilter.addEventListener('click', function (e) {
        var pill = e.target.closest('.pill');
        if (!pill) return;
        Array.prototype.forEach.call(lessonFilter.querySelectorAll('.pill'), function (p) { p.classList.remove('is-on'); });
        pill.classList.add('is-on');
        var lv = pill.dataset.lv;
        Array.prototype.forEach.call(contentEl.querySelectorAll('.lesson'), function (lesson) {
          lesson.style.display = (lv === 'all' || lesson.dataset.lv === lv) ? '' : 'none';
        });
      });
    }

    // glossary filter
    var gFilter = el('glossaryFilter');
    if (gFilter) {
      gFilter.addEventListener('input', function () {
        var q = gFilter.value.trim().toLowerCase();
        Array.prototype.forEach.call(el('glossaryList').children, function (row) {
          row.style.display = !q || row.dataset.term.indexOf(q) > -1 ? '' : 'none';
        });
      });
    }

    // on-this-page anchors
    Array.prototype.forEach.call(contentEl.querySelectorAll('.toc a[data-jump]'), function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        var node = document.getElementById(a.dataset.jump);
        if (node) node.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    });
  }

  /* ── clipboard + toast ───────────────────────────────────────────────── */
  function copy(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast('Copied to clipboard'); },
        function () { toast('Copy blocked by the browser'); });
    } else {
      var ta = document.createElement('textarea');
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      try { document.execCommand('copy'); toast('Copied to clipboard'); } catch (e) { toast('Copy not supported'); }
      document.body.removeChild(ta);
    }
  }

  var toastTimer = null;
  function toast(message) {
    var old = document.querySelector('.toast');
    if (old) old.remove();
    var t = document.createElement('div');
    t.className = 'toast';
    t.textContent = message;
    document.body.appendChild(t);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.remove(); }, 1800);
  }

  /* ── theme ───────────────────────────────────────────────────────────── */
  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    try { localStorage.setItem('docs-theme', theme); } catch (e) { /* private mode */ }
  }

  function initTheme() {
    var stored = null;
    try { stored = localStorage.getItem('docs-theme'); } catch (e) { stored = null; }
    applyTheme(stored === 'light' ? 'light' : 'dark');
    el('themeBtn').addEventListener('click', function () {
      applyTheme(document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark');
    });
  }

  /* ── boot ────────────────────────────────────────────────────────────── */
  function init() {
    buildNav();
    buildIndex();
    initTheme();

    el('menuBtn').addEventListener('click', function () {
      document.body.classList.contains('nav-open') ? closeNav() : openNav();
    });
    el('scrim').addEventListener('click', closeNav);

    inputEl.addEventListener('input', function () { renderResults(search(inputEl.value), inputEl.value); });

    inputEl.addEventListener('keydown', function (e) {
      var items = resultsEl.querySelectorAll('.sr-item');
      if (e.key === 'Escape') { closeSearch(); inputEl.blur(); return; }
      if (!items.length) return;
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        activeResult += (e.key === 'ArrowDown' ? 1 : -1);
        if (activeResult < 0) activeResult = items.length - 1;
        if (activeResult >= items.length) activeResult = 0;
        Array.prototype.forEach.call(items, function (it, i) { it.classList.toggle('is-active', i === activeResult); });
        items[activeResult].scrollIntoView({ block: 'nearest' });
      } else if (e.key === 'Enter') {
        e.preventDefault();
        var hits = search(inputEl.value);
        goToHit(hits[activeResult > -1 ? activeResult : 0]);
      }
    });

    resultsEl.addEventListener('click', function (e) {
      var btn = e.target.closest('.sr-item');
      if (!btn) return;
      var hits = search(inputEl.value);
      goToHit(hits[+btn.dataset.hit]);
    });

    document.addEventListener('click', function (e) {
      if (!e.target.closest('.search')) closeSearch();
    });

    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (e.key === '/' && tag !== 'input' && tag !== 'textarea') {
        e.preventDefault();
        inputEl.focus();
        inputEl.select();
      }
      if (e.key === 'Escape') closeNav();
    });

    // prev / next section navigation
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || e.ctrlKey || e.metaKey || e.altKey) return;
      var hash = location.hash.replace(/^#\/?/, '');
      var parts = hash.split('/').filter(Boolean);
      if (parts[0] !== 's' || !sectionById[parts[1]]) return;
      var i = DOC.sections.indexOf(sectionById[parts[1]]);
      if (e.key === ']' && DOC.sections[i + 1]) location.hash = '#/s/' + DOC.sections[i + 1].id;
      if (e.key === '[' && DOC.sections[i - 1]) location.hash = '#/s/' + DOC.sections[i - 1].id;
    });

    window.addEventListener('hashchange', route);
    route();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
