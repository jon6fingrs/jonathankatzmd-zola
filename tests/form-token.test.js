// Run with:  node --test tests/
// Guards the contact form's token rules in functions/_lib/token.js, which
// static/js/contact.js depends on: too young (<2 s), too old (>15 min) or
// tampered tokens are rejected.
const test = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../functions/_lib/token.js');
const T0 = 1793316426402;

test('accepts a token between 2 s and 15 min old', async () => {
  const { makeToken, checkToken } = await load();
  const t = await makeToken('s', T0);
  assert.equal(await checkToken('s', t, T0 + 2000), true);
  assert.equal(await checkToken('s', t, T0 + 900000), true);
});

test('rejects tokens that are too young or expired', async () => {
  const { makeToken, checkToken } = await load();
  const t = await makeToken('s', T0);
  assert.equal(await checkToken('s', t, T0 + 1999), false);
  assert.equal(await checkToken('s', t, T0 + 900001), false);
});

test('rejects a wrong secret, an edited timestamp, and junk', async () => {
  const { makeToken, checkToken } = await load();
  const t = await makeToken('s', T0);
  assert.equal(await checkToken('other', t, T0 + 5000), false);
  assert.equal(await checkToken('s', String(T0 - 60000) + t.slice(13), T0 + 5000), false);
  for (const junk of ['', null, 'abc', t + 'x']) assert.equal(await checkToken('s', junk, T0 + 5000), false);
});
