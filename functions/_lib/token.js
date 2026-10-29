// Signed, timestamped form token: "<ms since epoch>.<HMAC-SHA256 of it>".
// Same rules hugo-contact used, so static/js/contact.js works unchanged:
// rejected if younger than 2 s (assumed to be a bot) or older than 15 min.

const MIN_AGE_MS = 2000;
const MAX_AGE_MS = 900000;

const enc = new TextEncoder();

function key(secret) {
  return crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign', 'verify']);
}

function toB64url(buf) {
  return btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64url(s) {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

export async function makeToken(secret, now = Date.now()) {
  const ts = String(now);
  const sig = await crypto.subtle.sign('HMAC', await key(secret), enc.encode(ts));
  return ts + '.' + toB64url(sig);
}

export async function checkToken(secret, token, now = Date.now()) {
  const m = /^(\d{13})\.([A-Za-z0-9_-]{43})$/.exec(token || '');
  if (!m) return false;
  const age = now - Number(m[1]);
  if (age < MIN_AGE_MS || age > MAX_AGE_MS) return false;
  // verify() compares in constant time.
  return crypto.subtle.verify('HMAC', await key(secret), fromB64url(m[2]), enc.encode(m[1]));
}
