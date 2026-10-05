/* Cookie-less first-party event tracker (validation MVP). Events: page_view, comparison_view, product_view, outbound_click, demo_click, lead_cta, lead_start, lead_submit, filter_use.
   Carries utm_* and a referrer class so Google/Bing/ChatGPT/Claude/Perplexity/SNS/direct can be told apart. Session id lives in sessionStorage only (no cookies). */
(function () {
  var q = new URLSearchParams(location.search);
  var loadedAt = Date.now();
  var tc; try { if (q.get('internal') === '1') localStorage.setItem('df_internal', '1'); if (localStorage.getItem('df_internal') === '1') tc = 'internal'; } catch (e) {}
  function refClass() {
    var s = q.get('utm_source'); if (s) { s = s.toLowerCase(); if (/chatgpt|openai/.test(s)) return 'chatgpt'; if (/claude|anthropic/.test(s)) return 'claude'; if (/perplexity/.test(s)) return 'perplexity'; if (/gemini/.test(s)) return 'gemini'; if (/copilot/.test(s)) return 'copilot'; }
    var r = document.referrer; if (!r) return 'direct'; var h; try { h = new URL(r).hostname.toLowerCase(); } catch (e) { return 'unknown'; }
    if (h === location.hostname) return 'internal';
    if (/(^|\.)chatgpt\.com$|(^|\.)openai\.com$/.test(h)) return 'chatgpt'; if (/claude\.ai$|anthropic\.com$/.test(h)) return 'claude'; if (/perplexity\.ai$/.test(h)) return 'perplexity';
    if (/gemini\.google\.com$|bard\.google\.com$/.test(h)) return 'gemini'; if (/copilot\.microsoft\.com$/.test(h)) return 'copilot';
    if (/(^|\.)google\.[a-z.]+$/.test(h)) return 'google'; if (/bing\.com$/.test(h)) return 'bing'; if (/yahoo\.(co\.jp|com)$/.test(h)) return 'yahoo';
    if (/(^|\.)(x|twitter|t)\.com$|facebook\.com$|threads\.net$|linkedin\.com$|reddit\.com$|youtube\.com$|zenn\.dev$|qiita\.com$/.test(h)) return 'sns';
    return 'other';
  }
  var sid = sessionStorage.getItem('df_sid'); if (!sid) { sid = Math.random().toString(36).slice(2) + Date.now().toString(36); sessionStorage.setItem('df_sid', sid); }
  var firstRef = sessionStorage.getItem('df_ref'); if (!firstRef) { firstRef = refClass(); sessionStorage.setItem('df_ref', firstRef); }
  var utm = {}; ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { var v = q.get(k) || sessionStorage.getItem('df_' + k); if (v) { utm[k] = v; sessionStorage.setItem('df_' + k, v); } });
  var path = location.pathname, ptype = /\/product\//.test(path) ? 'product' : /\/category\/|\/compare\//.test(path) ? 'comparison' : /\/inquiry\//.test(path) ? 'inquiry' : 'other';
  var API = ((window.DF_CONFIG && window.DF_CONFIG.endpoint) || '').replace(/\/$/, '');
  var seg = /mcp|composio|freee/i.test(location.pathname + location.search) ? 'mcp' : 'general';
  function send(name, extra) {
    var d = Object.assign({ event: name, seg: seg, tc: tc, sid: sid, ts: new Date().toISOString(), path: path, page_type: ptype, referrer_class: firstRef }, utm, extra || {});
    // fetch+keepalive (credentials omitted). sendBeacon is NOT used: it sends credentialed requests, which a wildcard-free CORS policy without Allow-Credentials blocks.
    try { fetch(API + '/api/event', { method: 'POST', mode: 'cors', credentials: 'omit', keepalive: true, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(d) }).catch(function () {}); } catch (e) {}
  }
  window.dfTrack = send;
  send('page_view');
  if (ptype === 'comparison') send('comparison_view', { page: path });
  if (ptype === 'product') send('product_view', { product: path.split('/').pop().replace('.html', '') });
  document.addEventListener('click', function (e) {
    var a = e.target.closest && e.target.closest('a'); if (!a) return;
    var ev = a.getAttribute('data-event'); var href = a.getAttribute('href') || '';
    if (ev === 'lead_cta') send('cta_click', { cta: a.getAttribute('data-cta') });
    if (ev === 'demo_click') send('demo_click', { product: a.getAttribute('data-product') });
    if (/\/out\//.test(href)) send('outbound_click', { target: href });
    if (ev === 'lead_cta') send('lead_cta', { target: href });
  });
  if ('IntersectionObserver' in window) {
    var seen = new Set(); var io = new IntersectionObserver(function (es) { es.forEach(function (en) { if (en.isIntersecting) { var k = en.target.getAttribute('data-cta') + '|' + en.target.getAttribute('href'); if (!seen.has(k)) { seen.add(k); send('cta_impression', { cta: en.target.getAttribute('data-cta') }); } } }); }, { threshold: 0.6 });
    document.querySelectorAll('a[data-event="lead_cta"]').forEach(function (a) { io.observe(a); });
  }
  var form = document.getElementById('lead');
  if (form) {
    ['product', 'cat'].forEach(function (k) { if (q.get(k)) { var el = k === 'cat' ? document.getElementById('cat') : document.getElementById('prods'); if (el) el.value = q.get(k); } });
    ['utm_source', 'utm_medium', 'utm_campaign'].forEach(function (k) { if (form.elements[k]) form.elements[k].value = utm[k] || ''; });
    form.elements['referrer_class'].value = firstRef; form.elements['page'].value = document.referrer ? 'ref' : 'direct';
    var started = false; form.addEventListener('focusin', function () { if (!started) { started = true; send('lead_start'); } });
    form.addEventListener('submit', function (e) {
      e.preventDefault(); send('lead_submit');
      var btn = document.getElementById('submit'), done = document.getElementById('done');
      var msg = function (ok, text) { done.className = 'form-msg ' + (ok ? 'ok' : 'err'); done.textContent = text; if (ok) { form.hidden = true; } if (btn) { btn.disabled = false; btn.textContent = '送信する'; } try { done.scrollIntoView({ block: 'center' }); } catch (x) {} };
      if (btn) { btn.disabled = true; btn.textContent = '送信中…'; }
      var fd = new FormData(form); var o = {}; fd.forEach(function (v, k) { o[k] = v; }); o.sid = sid; o.tc = tc; o.t_ms = Date.now() - loadedAt;
      fetch(API + '/api/lead', { method: 'POST', mode: 'cors', credentials: 'omit', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(o) }).then(function (r) { return r.json(); }).then(function (j) {
        msg(!!j.ok, j.ok ? '送信しました。ありがとうございます。内容を確認のうえ、ご連絡先のメールアドレスへご案内します。' : '送信できませんでした。入力内容をご確認のうえ、もう一度お試しください。');
      }).catch(function () { msg(false, '送信できませんでした。通信状況をご確認のうえ、もう一度お試しください。'); });
    });
  }
})();
