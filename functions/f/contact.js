// POST /f/contact: the contact form (templates/contact/section.html,
// static/js/contact.js). Checks the token and spam trap, then sends one email
// through Fastmail's SMTP server.
//
// Status codes matter to contact.js: 400 means "token rejected" and makes it
// fetch a new token and retry once, so other bad input gets 422 instead.

import { checkToken } from '../_lib/token.js';
import { sendMail } from '../_lib/smtp.js';

const REQUIRED = ['SMTP_HOST', 'SMTP_USERNAME', 'SMTP_PASSWORD', 'RECIPIENT_EMAIL', 'TOKEN_SECRET'];
const EMAIL_RE = /^[^\s@<>"(),;:\\]+@[^\s@<>"(),;:\\]+\.[^\s@<>"(),;:\\]+$/;

function reply(status, message) {
  return new Response(JSON.stringify({ ok: status === 200, message }), {
    status,
    headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  });
}

// Strips control characters (CR/LF above all, so nothing can inject headers).
function clean(s) {
  return String(s || '').replace(/[\x00-\x1f\x7f]+/g, ' ').trim();
}

export async function onRequestPost({ request, env }) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (origin && origin !== url.origin) return reply(403, 'Forbidden');

  const missing = REQUIRED.filter((k) => !env[k]);
  if (missing.length) {
    console.error('contact form not configured, missing:', missing.join(', '));
    return reply(503, 'Not configured');
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return reply(422, 'Unreadable form');
  }

  // Spam trap: report success so the bot moves on, but send nothing.
  if (form.get('_gotcha')) return reply(200, 'Sent');

  if (!(await checkToken(env.TOKEN_SECRET, form.get('_ts_token')))) return reply(400, 'Bad or expired token');

  const name = clean(form.get('name')).replace(/["\\]/g, '').slice(0, 200);
  const email = clean(form.get('email'));
  const message = String(form.get('message') || '').trim();
  if (!name || !message || message.length > 10000 || email.length > 254 || !EMAIL_RE.test(email)) {
    return reply(422, 'Please fill in your name, a valid email address and a message.');
  }

  try {
    await sendMail(env, {
      heloName: url.hostname,
      from: env.SMTP_FROM || env.SMTP_USERNAME,
      to: env.RECIPIENT_EMAIL,
      replyTo: email,
      replyToName: name,
      subject: `Website message from ${name}`,
      text: `Name: ${name}\nEmail: ${email}\n\n${message}\n`,
    });
  } catch (err) {
    console.error('contact form send failed:', err && err.message);
    return reply(502, 'Could not send');
  }
  return reply(200, 'Sent');
}
