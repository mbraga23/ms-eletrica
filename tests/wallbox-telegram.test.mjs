import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { notifyWallboxTelegram } from '../functions/api/wallbox-leads/telegram.js';

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });
const env = { TELEGRAM_BOT_TOKEN: 'fake-token-for-test', TELEGRAM_CHAT_ID: '12345' };

test('envia mensagem sem dados pessoais ao único chat configurado', async () => {
  let calls = 0;
  globalThis.fetch = async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.telegram.org/botfake-token-for-test/sendMessage');
    assert.equal(options.method, 'POST');
    assert.ok(options.signal instanceof AbortSignal);
    const body = JSON.parse(options.body);
    assert.deepEqual(Object.keys(body).sort(), ['chat_id', 'text']);
    assert.equal(body.chat_id, '12345');
    assert.match(body.text, /NOVO ORÇAMENTO — MS ELÉTRICA/);
    assert.match(body.text, /Verifique seu Gmail/);
    return Response.json({ ok: true });
  };
  assert.equal(await notifyWallboxTelegram(env), true);
  assert.equal(calls, 1);
});

test('não chama a API com token ou chat ausente', async () => {
  globalThis.fetch = () => { throw Error('não deve chamar a API'); };
  assert.equal(await notifyWallboxTelegram({ TELEGRAM_CHAT_ID: '12345' }), false);
  assert.equal(await notifyWallboxTelegram({ TELEGRAM_BOT_TOKEN: 'fake-token-for-test' }), false);
});

test('erros HTTP ou resposta negativa são tratados sem detalhes do provedor', async () => {
  globalThis.fetch = async () => new Response('Service error', { status: 503 });
  await assert.rejects(notifyWallboxTelegram(env), { message: 'telegram_notification_failed' });
  globalThis.fetch = async () => Response.json({ ok: false });
  await assert.rejects(notifyWallboxTelegram(env), { message: 'telegram_notification_failed' });
});

test('indisponibilidade de rede não expõe o erro original ou o token', async () => {
  globalThis.fetch = async () => { throw new Error('fake-token-for-test'); };
  await assert.rejects(notifyWallboxTelegram(env), { message: 'telegram_notification_failed' });
});
