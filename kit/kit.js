/* Beatlot motion kit. Every time is written in beats (B(n)), like the site and the engine.
   Seek-safe only: fromTo / set at explicit positions, no clocks, no randomness. */
(function () {
  var BPM = 126, SPB = 60 / BPM;
  function B(n) { return n * SPB; }
  function root(r) { return typeof r === 'string' ? document.querySelector(r) : (r || document); }
  function $(s, r) { return root(r).querySelector(s); }
  function $(s, r) { return Array.prototype.slice.call(root(r).querySelectorAll(s)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  var EDGES = '<svg class="edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"><path pathLength="1" d="M0 0H100"/><path pathLength="1" d="M100 0V100"/><path pathLength="1" d="M100 100H0"/><path pathLength="1" d="M0 100V0"/></svg><i class="cn tl"></i><i class="cn tr"></i><i class="cn br"></i><i class="cn bl"></i>';

  // a heading split into words; each word rises from under its line
  function words(el, text) {
    el.innerHTML = text.split(/\s+/).map(function (w) { return '<span class="w"><span>' + esc(w) + '</span></span>'; }).join(' ');
    return $$('.w > span', el);
  }
  function rise(tl, spans, at, step, beats) {
    spans.forEach(function (s, i) { tl.fromTo(s, { yPercent: 112 }, { yPercent: 0, duration: B(beats || 1), ease: 'power3.out' }, B(at + i * step)); });
  }
  // typed text: one span per letter, each switched on at its moment (no onUpdate, so any seek is exact)
  function typed(el, text) {
    el.innerHTML = Array.from(text).map(function (c) { return '<span class="ch">' + esc(c) + '</span>'; }).join('');
    return $$('.ch', el);
  }
  function type(tl, chars, at, beats) {
    chars.forEach(function (c, i) { tl.set(c, { opacity: 1 }, B(at + beats * (i + 1) / chars.length)); });
  }
  // the gallery frame draws one edge per `step` beats, then the corners click in
  function frame(tl, host, at, step) {
    var ps = $$('.edges path', host);
    ps.forEach(function (p, i) { tl.fromTo(p, { strokeDashoffset: 1 }, { strokeDashoffset: 0, duration: B(step), ease: 'none' }, B(at + i * step)); });
    tl.fromTo($$('.cn', host), { scale: 0, rotation: 45 }, { scale: 1, rotation: 45, duration: B(.4), stagger: B(.05), ease: 'back.out(3)' }, B(at + 4 * step));
  }
  function frameDrawn(tl, host) {
    tl.set($$('.edges path', host), { strokeDashoffset: 0 }, 0);
    tl.set($$('.cn', host), { scale: 1, rotation: 45 }, 0);
  }
  // wave + 16 ticks; returns { bars, dot, step(r) }
  function meter(host, o) {
    var n = o.bars || 32, ticks = o.ticks || 16, w = o.width, hs = '';
    for (var i = 0; i < n; i++) {
      var b = i / 2, h;
      if (b < 8) h = .22 + .3 * (b / 8) + .12 * Math.abs(Math.sin(i * 1.7));
      else if (b < 14) h = .72 + .26 * Math.abs(Math.sin(i * 2.3));
      else h = .55 - .1 * (b - 14);
      hs += '<i style="height:' + (h * 100).toFixed(1) + '%;margin:0 ' + (o.gap / 2) + 'px"></i>';
    }
    var g = '<i class="base"></i>';
    for (var k = 0; k < ticks; k++) {
      var cls = k === (o.drop == null ? 8 : o.drop) ? ' drop' : k % 4 === 0 ? ' bar' : '';
      var th = cls === ' drop' ? o.tick * 2.6 : cls === ' bar' ? o.tick * 1.9 : o.tick;
      g += '<i class="tk' + cls + '" style="left:' + ((k + .5) / ticks * w).toFixed(1) + 'px;height:' + th + 'px"></i>';
    }
    g += '<i class="dot" style="width:' + o.dot + 'px;height:' + o.dot + 'px;bottom:' + (-o.dot / 2 + 1) + 'px;margin-left:' + (-o.dot / 2) + 'px"></i>';
    host.innerHTML = '<div class="wave" style="height:' + o.waveH + 'px;margin-bottom:' + o.gapY + 'px">' + hs + '</div><div class="grid" style="height:' + (o.tick * 2.8) + 'px">' + g + '</div>';
    host.style.width = w + 'px';
    var bars = $$('.wave i', host), dot = $('.dot', host), wave = $('.wave', host);
    return {
      bars: bars, dot: dot, wave: wave,
      // put the dot on tick r at beat `at` (a jump, never a glide) and light the wave up to it
      step: function (tl, r, at, pulse) {
        tl.set(dot, { x: (r + .5) / ticks * w }, B(at));
        tl.set(bars.slice(0, (r + 1) * n / ticks), { backgroundColor: '#D9B36A' }, B(at));
        if (pulse !== false) tl.fromTo(wave, { scaleY: pulse || 1.22 }, { scaleY: 1, duration: B(.7), ease: 'power2.out', immediateRender: false }, B(at));
      }
    };
  }
  // a shot inside a Reel: on at `at`, a slow push for `beats`, origin = where the detail is
  function cut(tl, shots, k, at, beats, from, to, origin) {
    shots.forEach(function (s, i) { tl.set(s, { opacity: i === k ? 1 : 0 }, B(at)); });
    var img = $('img', shots[k]);
    tl.fromTo(img, { scale: from, transformOrigin: origin || '50% 50%' }, { scale: to, transformOrigin: origin || '50% 50%', duration: B(beats), ease: 'power1.out' }, B(at));
  }
  // odometer digits (prices), like the site
  function odo(el, str, digitClass) {
    el.innerHTML = String(str).split('').map(function (c) {
      if (!/\d/.test(c)) return '<span>' + esc(c) + '</span>';
      var col = ''; for (var d = 0; d <= 9; d++) col += '<span style="display:block;height:1em">' + d + '</span>';
      return '<span style="display:inline-block;height:1em;overflow:hidden;line-height:1;vertical-align:top"><span class="' + (digitClass || 'oc') + '" data-d="' + c + '" style="display:block">' + col + '</span></span>';
    }).join('');
    return $$('[data-d]', el);
  }
  function roll(tl, cols, at, beats) {
    cols.forEach(function (c, i) { tl.fromTo(c, { yPercent: 0 }, { yPercent: -(+c.dataset.d) * 10, duration: B(beats), ease: 'power3.out' }, B(at + i * .12)); });
  }
  // a chat row opens (height from 0) and fades in
  function row(tl, el, at, beats) {
    tl.fromTo(el, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: B(beats || .6), ease: 'power3.out' }, B(at));
  }
  var MARK = '<svg viewBox="0 0 32 32" fill="none"><path d="M4 22h24" stroke="currentColor" stroke-width="1.4" pathLength="1" class="mk"/><path d="M7 22v-5M12 22v-2.5M17 22v-8M22 22v-2.5M26 22v-5" stroke="currentColor" stroke-width="1.4" pathLength="1" class="mk"/><circle cx="17" cy="9.5" r="2.6" fill="currentColor" class="mkd"/></svg>';
  var CHK = '<svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" stroke-width="1.2"/><path d="M4.8 8.2l2.1 2.1 4.3-4.6" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var TG = '<svg viewBox="0 0 24 24"><path d="M21.5 4.3L2.9 11.5c-1 .4-1 1.6.1 1.9l4.6 1.4 1.8 5.5c.3.8 1.3 1 1.9.4l2.6-2.4 4.7 3.5c.7.5 1.7.1 1.9-.7l3-14c.2-1-.8-1.8-1.8-1.4zM9.6 14.4l8.4-7.5-6.9 8.7-.3 3-1.2-4.2z" fill="currentColor"/></svg>';
  var LOGOS = {
    kestrel: { name: 'Kestrel Motors', handle: '@kestrel.motors', c: ['#121110', '#F1E7D6', '#C9A24A'],
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" rx="14" fill="#121110"/><path d="M52 74C78 42 112 30 150 33C123 41 106 51 97 66C114 59 131 59 143 63C120 67 101 76 88 92Z" fill="#C9A24A"/><text x="100" y="109" text-anchor="middle" font-family="Georgia,serif" font-size="12.5" letter-spacing="4" fill="#F1E7D6">KESTREL MOTORS</text></svg>' },
    lindner: { name: 'Autohaus Lindner', handle: '@autohaus.lindner', c: ['#1F4A3A', '#F2EBDC', '#C2A15F'],
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" rx="14" fill="#F2EBDC"/><circle cx="100" cy="48" r="30" fill="#1F4A3A"/><path d="M100 27C117 38 117 60 100 71C83 60 83 38 100 27Z" fill="#C2A15F"/><path d="M100 33V70" stroke="#1F4A3A" stroke-width="2"/><text x="100" y="104" text-anchor="middle" font-family="Helvetica,Arial,sans-serif" font-weight="700" font-size="13" letter-spacing="3" fill="#1F4A3A">AUTOHAUS LINDNER</text></svg>' },
    velvet: { name: 'Velvet Cars', handle: '@velvetcars', c: ['#5A1726', '#F5E6DA', '#E8C4A6'],
      svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 120"><rect width="200" height="120" rx="14" fill="#5A1726"/><path d="M76 26L100 80L124 26" fill="none" stroke="#E8C4A6" stroke-width="7"/><path d="M66 26H86M114 26H134" stroke="#E8C4A6" stroke-width="3"/><text x="100" y="106" text-anchor="middle" font-family="Georgia,serif" font-style="italic" font-size="16" letter-spacing="2" fill="#F5E6DA">Velvet Cars</text></svg>' }
  };
  window.KIT = { BPM: BPM, SPB: SPB, B: B, $: $, $$: $$, esc: esc, EDGES: EDGES, words: words, rise: rise, typed: typed, type: type, frame: frame, frameDrawn: frameDrawn, meter: meter, row: row, cut: cut, odo: odo, roll: roll, MARK: MARK, CHK: CHK, TG: TG, LOGOS: LOGOS };
})();
