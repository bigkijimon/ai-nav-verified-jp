/* Minimal progressive enhancement (no framework): mobile menu, search + chip filters. Pages work without JS. */
(function () {
  var t = document.querySelector('.nav-toggle'), nav = document.getElementById('nav');
  if (t && nav) t.addEventListener('click', function () { var o = nav.classList.toggle('open'); t.setAttribute('aria-expanded', o ? 'true' : 'false'); });
  var chips = [].slice.call(document.querySelectorAll('.chip[data-f]'));
  var items = [].slice.call(document.querySelectorAll('[data-item]'));
  if (!items.length) return;
  var q = document.getElementById('q'), count = document.getElementById('rcount'), more = document.getElementById('more'), empty = document.getElementById('none');
  var LIMIT = more ? parseInt(more.getAttribute('data-limit') || '12', 10) : 0, expanded = false;
  function on() { return chips.filter(function (c) { return c.getAttribute('aria-pressed') === 'true'; }).map(function (c) { return c.getAttribute('data-f'); }); }
  function apply(track) {
    var f = on(), term = q ? q.value.trim().toLowerCase() : '', shown = 0, matched = 0, seen = {};
    items.forEach(function (el) {
      var ok = f.every(function (k) { return el.getAttribute('data-' + k) === '1'; }) && (!term || (el.getAttribute('data-name') || '').indexOf(term) > -1);
      if (ok && !seen[el.getAttribute('data-name')]) { seen[el.getAttribute('data-name')] = 1; matched++; }
      var vis = ok && (!LIMIT || expanded || f.length || term || shown < LIMIT);
      if (ok && vis && el.classList.contains('pcard')) shown++;
      el.hidden = !vis;
    });
    if (count) count.textContent = matched;
    if (empty) empty.hidden = matched !== 0;
    if (more) more.hidden = !(LIMIT && !expanded && !f.length && !term && matched > LIMIT);
    if (track && window.dfTrack) window.dfTrack('filter_use', { filters: f.join(','), mcp_related: f.indexOf('mcp') > -1 });
  }
  chips.forEach(function (c) { c.addEventListener('click', function () { c.setAttribute('aria-pressed', c.getAttribute('aria-pressed') === 'true' ? 'false' : 'true'); apply(true); }); });
  if (q) q.addEventListener('input', function () { apply(false); });
  var sf = document.getElementById('sform'); if (sf) sf.addEventListener('submit', function (e) { e.preventDefault(); apply(false); var r = document.getElementById('results'); if (r) r.scrollIntoView(); });
  if (more) more.addEventListener('click', function () { expanded = true; apply(false); });
  apply(false);
})();
