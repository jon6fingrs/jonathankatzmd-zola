/* Contact form submission for hugo-contact.
 *
 * hugo-contact requires a signed, timestamped token (_ts_token) obtained from
 * /form-token.js. The server rejects a token that is:
 *   - younger than 2 seconds  (assumed to be a bot)
 *   - older than 900 seconds  (15 min; expired)
 *
 * So the token is fetched on page load, refreshed every 10 minutes, and
 * re-fetched once on a rejection. hugo-contact only accepts name/email/message,
 * so the phone number is folded into the message body.
 */
(function () {
  'use strict';

  var form = document.getElementById('jk-contact-form');
  if (!form) return;
  var statusEl = document.getElementById('jk-contact-status');
  var phoneEl = document.getElementById('jk-contact-phone');
  // Select by id, not by [type=submit]: Zola's minify_html strips the
  // redundant type attribute (submit is a button's default), so an
  // attribute selector finds nothing in the built page.
  var submitBtn = document.getElementById('jk-contact-submit');

  var TOKEN_URL = '/form-token.js';
  var MIN_AGE_MS = 2100;     // server requires >2s
  var REFRESH_MS = 600000;   // 10 min, comfortably inside the 15 min expiry

  var token = null;
  var tokenAt = 0;

  function fetchToken() {
    return fetch(TOKEN_URL, { cache: 'no-store' })
      .then(function (r) { return r.ok ? r.text() : Promise.reject(r); })
      .then(function (js) {
        var m = /token\s*=\s*"([^"]+)"/.exec(js);
        if (!m) return Promise.reject(new Error('token not found'));
        token = m[1];
        tokenAt = Date.now();
      });
  }

  function ensureFresh() {
    var age = Date.now() - tokenAt;
    if (token && age < MIN_AGE_MS) {
      return new Promise(function (res) { setTimeout(res, MIN_AGE_MS - age); });
    }
    return token ? Promise.resolve() : fetchToken();
  }

  function post() {
    // URLSearchParams, NOT FormData. fetch sends FormData as
    // multipart/form-data, and hugo-contact calls r.ParseForm() before
    // reading fields — which in Go parses only
    // application/x-www-form-urlencoded bodies. Once ParseForm has run,
    // r.Form is non-nil, so r.FormValue() never parses a multipart body and
    // every field (including _ts_token) reads back as empty. URLSearchParams
    // makes fetch send urlencoded, which ParseForm does read.
    var el = form.elements;
    var data = new URLSearchParams();
    data.append('name', el['name'].value);
    data.append('email', el['email'].value);

    var msg = el['message'].value;
    var phone = phoneEl && phoneEl.value.trim();
    if (phone) msg += '\n\nPhone: ' + phone;
    data.append('message', msg);

    data.append('_gotcha', el['_gotcha'] ? el['_gotcha'].value : '');
    data.append('_ts_token', token);

    return fetch(form.action, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: data.toString()
    });
  }

  function setStatus(text, isError) {
    statusEl.textContent = text;
    statusEl.classList.toggle('jk-status--error', !!isError);
  }

  form.addEventListener('submit', function (e) {
    e.preventDefault();
    if (!form.checkValidity()) { form.reportValidity(); return; }

    if (submitBtn) submitBtn.disabled = true;
    setStatus('Sending\u2026', false);

    ensureFresh()
      .then(post)
      .then(function (r) {
        if (r.ok) return r;
        // A 400 usually means the token expired while the page sat open.
        if (r.status === 400) {
          return fetchToken()
            .then(function () {
              return new Promise(function (res) { setTimeout(res, MIN_AGE_MS); });
            })
            .then(post);
        }
        return Promise.reject(r);
      })
      .then(function (r) {
        if (!r.ok) return Promise.reject(r);
        setStatus('Thank you \u2014 your message has been sent.', false);
        form.reset();
      })
      .catch(function () {
        setStatus('Sorry, your message could not be sent. Please try again, or call the office.', true);
      })
      .finally(function () {
        if (submitBtn) submitBtn.disabled = false;
      });
  });

  fetchToken().catch(function () {});
  setInterval(function () { fetchToken().catch(function () {}); }, REFRESH_MS);
})();
