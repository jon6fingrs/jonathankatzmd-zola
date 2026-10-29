// Minimal SMTP client for one plain-text message, over Cloudflare's TCP
// sockets. Port 465 uses implicit TLS (Fastmail's recommended setting); any
// other port upgrades with STARTTLS. SMTP_TLS=off is for local testing
// against a fake server only, never production.

import { connect } from 'cloudflare:sockets';

const enc = new TextEncoder();
const dec = new TextDecoder();

function b64(str) {
  const bytes = enc.encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

// RFC 2047 encoded-word, only when the text isn't plain ASCII.
function headerText(s) {
  return /^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(s)}?=`;
}

function session(socket) {
  const reader = socket.readable.getReader();
  const writer = socket.writable.getWriter();
  let buf = '';

  // A reply is one or more lines; "250-..." continues, "250 ..." ends it.
  async function reply() {
    for (;;) {
      const lines = buf.split('\r\n');
      for (let i = 0; i < lines.length - 1; i++) {
        if (/^\d{3} /.test(lines[i]) || /^\d{3}$/.test(lines[i])) {
          buf = lines.slice(i + 1).join('\r\n');
          return { code: Number(lines[i].slice(0, 3)), text: lines.slice(0, i + 1).join('\n') };
        }
      }
      const { value, done } = await reader.read();
      if (done) throw new Error('SMTP connection closed');
      buf += dec.decode(value, { stream: true });
    }
  }

  async function expect(...codes) {
    const r = await reply();
    if (!codes.includes(r.code)) throw new Error(`SMTP: expected ${codes.join('/')}, got: ${r.text}`);
    return r;
  }

  async function cmd(line, ...codes) {
    await writer.write(enc.encode(line + '\r\n'));
    return expect(...codes);
  }

  function release() {
    reader.releaseLock();
    writer.releaseLock();
  }

  return { expect, cmd, release, write: (s) => writer.write(enc.encode(s)) };
}

export async function sendMail(env, { heloName, from, to, replyTo, replyToName, subject, text }) {
  const port = Number(env.SMTP_PORT || 465);
  const mode = env.SMTP_TLS === 'off' ? 'off' : port === 465 ? 'on' : 'starttls';
  let socket = connect({ hostname: env.SMTP_HOST, port }, { secureTransport: mode });
  let io = session(socket);

  try {
    await io.expect(220);
    await io.cmd(`EHLO ${heloName}`, 250);
    if (mode === 'starttls') {
      await io.cmd('STARTTLS', 220);
      io.release();
      socket = socket.startTls();
      io = session(socket);
      await io.cmd(`EHLO ${heloName}`, 250);
    }
    await io.cmd('AUTH PLAIN ' + b64(`\0${env.SMTP_USERNAME}\0${env.SMTP_PASSWORD}`), 235);
    await io.cmd(`MAIL FROM:<${from}>`, 250);
    await io.cmd(`RCPT TO:<${to}>`, 250, 251);
    await io.cmd('DATA', 354);

    const host = from.split('@')[1] || heloName;
    const body = b64(text.replace(/\r?\n/g, '\r\n')).replace(/.{1,76}/g, '$&\r\n');
    const message = [
      `From: ${headerText('Website contact form')} <${from}>`,
      `To: <${to}>`,
      // An encoded-word can't sit inside quotes, so quote plain ASCII only.
      `Reply-To: ${headerText(replyToName) === replyToName ? `"${replyToName}"` : headerText(replyToName)} <${replyTo}>`,
      `Subject: ${headerText(subject)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@${host}>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      body,
    ].join('\r\n');
    // Base64 lines never start with ".", so no dot-stuffing is needed.
    await io.write(message + '.\r\n');
    await io.expect(250);
    await io.cmd('QUIT', 221).catch(() => {});
  } finally {
    socket.close().catch(() => {});
  }
}
