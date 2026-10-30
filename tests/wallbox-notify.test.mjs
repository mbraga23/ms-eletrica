import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { notifyWallboxLead } from '../functions/api/wallbox-leads/notify.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const lead = {
  submissionId: 'c497dfc9-54a7-471a-b817-f92f6f19db8c',
  name: 'Pessoa Teste', phone: '31987654321',
  vehicle: 'BYD', property: 'casa', distance: 'ate_5m',
  page: 'https://mseletricaetech.com.br/wallbox/',
  utm: { utm_source: 'google', utm_campaign: 'wallbox' }
};
const env = { RESEND_API_KEY: 'test-key', WALLBOX_ALERT_EMAIL: 'test@example.com' };

test('avisa o proprietário somente com os dados necessários', async () => {
  let called = 0;
  globalThis.fetch = async (url, options) => {
    called++;
    assert.equal(url, 'https://api.resend.com/emails');
    assert.equal(options.method, 'POST');
    assert.equal(options.headers.Authorization, 'Bearer test-key');
    assert.equal(options.headers['Idempotency-Key'], 'wallbox-lead/' + lead.submissionId);
    const payload = JSON.parse(options.body);
    assert.deepEqual(payload.to, ['test@example.com']);
    assert.match(payload.from, /avisos@avisos\.mseletricaetech\.com\.br/);
    assert.match(payload.text, /Pessoa Teste/);
    assert.match(payload.text, /https:\/\/wa\.me\/5531987654321/);
    assert.match(payload.text, /google/);
    return new Response(null, { status: 200 });
  };
  assert.equal(await notifyWallboxLead(env, lead), true);
  assert.equal(called, 1);
});

test('sem chave ou destinatário não faz chamada externa', async () => {
  globalThis.fetch = () => { throw Error('should not fetch'); };
  assert.equal(await notifyWallboxLead({}, lead), false);
  assert.equal(await notifyWallboxLead({ RESEND_API_KEY: 'x' }, lead), false);
});

test('falha do Resend é observável sem devolver segredo ou dados do cliente', async () => {
  globalThis.fetch = async () => new Response('Service error', { status: 503 });
  await assert.rejects(notifyWallboxLead(env, lead), { message: 'notification_send_failed' });
});
