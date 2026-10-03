/* =========================================================================
   highlight.js — tiny dependency-free highlighter for the languages that
   actually appear in this project: Dart, SQL, YAML, XML and shell.
   Single left-to-right pass per line, so tokens never nest and the output is
   always balanced markup.
   Token classes: tok-key tok-str tok-num tok-com tok-ann tok-typ tok-fn
   ========================================================================= */
(function (global) {
  'use strict';

  var ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;' };
  function esc(s) { return s.replace(/[&<>]/g, function (c) { return ESC[c]; }); }

  function rule(cls, re, flags) {
    return { cls: cls, re: new RegExp(re.source, (flags || '') + 'y') };
  }

  var RULES = {
    dart: [
      rule('com', /\/\/[^\n]*|\/\*[\s\S]*?\*\//),
      rule('str', /'''[\s\S]*?'''|"""[\s\S]*?"""|"[^"\\\n]*"|'[^'\\\n]*'/),
      rule('ann', /@[A-Za-z_][A-Za-z0-9_]*/),
      rule('num', /\d+(?:\.\d+)?/),
      rule('key', /\b(?:if|else|for|while|do|switch|case|default|break|continue|return|try|catch|finally|throw|rethrow|await|async|yield|assert|new|const|final|var|late|required|extends|implements|with|is|as|in|void|null|true|false|this|super|factory|external|abstract|covariant|deferred|on|show|hide)\b/),
      rule('typ', /\b[A-Z][A-Za-z0-9_]*\b/),
      rule('fn', /\b[a-z_][A-Za-z0-9_]*(?=\s*\()/)
    ],
    sql: [
      rule('com', /--[^\n]*|\/\*[\s\S]*?\*\//),
      rule('str', /'(?:''|[^'])*'/),
      rule('key', /\b(?:select|from|where|insert|into|values|update|set|delete|order|by|limit|replace|on|conflict|and|or|not|null|as|table|index|primary|key|autoGenerate|alter|add|column)\b/i),
      rule('num', /\d+(?:\.\d+)?/)
    ],
    yaml: [
      rule('com', /#[^\n]*/),
      rule('str', /"[^"\\]*"|'[^']*'/),
      rule('key', /[ \t]*[A-Za-z_][\w.-]*(?=\s*:)/),
      rule('num', /\d+(?:\.\d+)?/),
      rule('key', /\b(?:true|false|null)\b/)
    ],
    xml: [
      rule('com', /<!--[\s\S]*?-->/),
      rule('str', /"[^"\\]*"/),
      rule('ann', /<\/?[\w:-]+|\/?>/),
      rule('key', /\b(?:manifest|application|activity|uses-permission|queries|intent|meta-data|info|dict|key)\b/)
    ],
    shell: [
      rule('com', /#[^\n]*/),
      rule('str', /"[^"\\]*"|'[^']*'/),
      rule('key', /\b(?:flutter|dart|cd|run|build|test|analyze|pubspec)\b/),
      rule('num', /\d+(?:\.\d+)?/)
    ],
    text: []
  };

  function line(lineText, rules) {
    var out = '', i = 0;
    while (i < lineText.length) {
      var hit = null;
      for (var r = 0; r < rules.length; r++) {
        var re = rules[r].re;
        re.lastIndex = i;
        var m = re.exec(lineText);
        if (m && m[0].length) { hit = { cls: rules[r].cls, text: m[0] }; break; }
      }
      if (hit) {
        out += '<span class="tok-' + hit.cls + '">' + esc(hit.text) + '</span>';
        i += hit.text.length;
      } else {
        out += esc(lineText.charAt(i));
        i += 1;
      }
    }
    return out;
  }

  function render(source, lang, startLine) {
    var rules = RULES[lang] || RULES.text;
    var from = startLine || 1;
    return String(source).split('\n').map(function (l, i) {
      return '<span class="ln" data-l="' + (from + i) + '">' + (line(l, rules) || ' ') + '</span>';
    }).join('\n');
  }

  global.Highlight = { render: render, escape: esc };
})(window);
