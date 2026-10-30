import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { onRequestPost } from '../functions/api/wallbox-leads.js';
import { onRequestGet } from '../functions/api/wallbox-leads/config.js';

let db, env, previousFetch, verdict;
const origin = 'https://mseletricaetech.com.br';
const sample = () => ({ submission_id: crypto.randomUUID(), name: 'Pessoa Teste', phone: '(31) 98257-3307', vehicle: 'BYD', property: 'casa', distance: 'nao_sei', page: `${origin}/wallbox/`, referrer_origin: 'https://www.google.com', utm: { utm_source: 'google', utm_campaign: 'wallbox' }, click_ids: { gclid: 'test-click-id' }, turnstile_token: 'test-token' });
function wrap(sqlite) {
  return { prepare(sql) { let values; return { bind(...args) { values = args; return this; }, async first() { return sqlite.prepare(sql).get(...values) || null; }, async run() { return sqlite.prepare(sql).run(...values); } }; } };
}
async function send(data, opts={}) {
  const headers = { origin, 'content-type': 'application/json', 'cf-connecting-ip': opts.ip || '203.0.113.42', ...opts.headers };
  const request = new Request(`${origin}/api/wallbox-leads`, { method: 'POST', headers, body: typeof data === 'string' ? data : JSON.stringify(data) });
  const response = await onRequestPost({ request, env, waitUntil() {} });
  return { status: response.status, body: await response.json(), headers: response.headers };
}
beforeEach(() => {
  db = new DatabaseSync(':memory:');
  db.exec(readFileSync(new URL('../db/wallbox-leads.sql', import.meta.url), 'utf8'));
  env = { WALLBOX_LEADS_DB: wrap(db), TURNSTILE_SECRET_KEY: 'dummy', TURNSTILE_SITE_KEY: 'dummy', RATE_LIMIT_SECRET: 'a-test-secret-long-enough-for-local-test-only' };
  verdict = { success: true, hostname: 'mseletricaetech.com.br', action: 'wallbox_lead' };
  previousFetch = globalThis.fetch;
  globalThis.fetch = async () => Response.json(verdict);
});
afterEach(() => { globalThis.fetch = previousFetch; db.close(); });

test('registra exatamente um lead e normaliza dados', async () => {
  const item=sample(); const r=await send(item);
  assert.equal(r.status,201); assert.equal(r.body.duplicate,false); assert.equal(r.body.lead_id,item.submission_id);
  const row=db.prepare('SELECT * FROM wallbox_leads').get();
  assert.equal(row.whatsapp,'31982573307'); assert.equal(row.vehicle,'BYD'); assert.equal(row.referrer_origin,'https://www.google.com');
  assert.deepEqual(JSON.parse(row.utm_json), item.utm); assert.deepEqual(JSON.parse(row.click_ids_json), item.click_ids);
  assert.equal(r.headers.get('cache-control'),'no-store');
});
test('repetição segura e conflito de mesmo identificador', async () => {
  const item=sample(); assert.equal((await send(item)).status,201);
  assert.equal((await send(item)).body.duplicate,true);
  assert.equal((await send({...item,name:'Outro nome'})).status,409);
  assert.equal(db.prepare('SELECT count(*) AS n FROM wallbox_leads').get().n,1);
});
test('um token já usado é rejeitado; token novo retoma o mesmo lead', async () => {
  const used = new Set();
  globalThis.fetch = async (_url, options) => {
    const token=options.body.get('response');
    if (used.has(token)) return Response.json({success:false});
    used.add(token);
    return Response.json(verdict);
  };
  const item=sample(); assert.equal((await send(item)).status,201);
  assert.equal((await send(item)).status,403);
  const retry=await send({...item,turnstile_token:'new-token'});
  assert.equal(retry.status,200); assert.equal(retry.body.duplicate,true); assert.equal(retry.body.lead_id,item.submission_id);
  assert.equal(db.prepare('SELECT count(*) AS n FROM wallbox_leads').get().n,1);
});
test('requisições concorrentes com mesmo UUID não duplicam registro', async () => {
  const item=sample();
  globalThis.fetch=async()=>{ await new Promise(resolve=>setTimeout(resolve,10)); return Response.json(verdict); };
  const result=await Promise.all([send(item),send(item)]);
  assert.deepEqual(result.map(r=>r.status).sort(),[200,201]);
  assert.equal(db.prepare('SELECT count(*) AS n FROM wallbox_leads').get().n,1);
});
test('envios inválidos ou com possíveis dados pessoais na origem não são gravados', async () => {
  for(const item of [{...sample(),name:''},{...sample(),phone:'1234'},{...sample(),property:'empresa'},{...sample(),page:`${origin}/wallbox/?nome=Maria`},{...sample(),referrer_origin:'https://example.com/path'}]) assert.equal((await send(item)).status,400);
  assert.equal(db.prepare('SELECT count(*) AS n FROM wallbox_leads').get().n,0);
});
test('atribuição suspeita é descartada sem impedir contato válido', async () => {
  assert.equal((await send({...sample(),utm:{utm_term:'email@example.com',utm_source:'google'}})).status,201);
  assert.deepEqual(JSON.parse(db.prepare('SELECT utm_json FROM wallbox_leads').get().utm_json), {utm_source:'google'});
});
test('verificação Turnstile exige resultado, hostname e action', async () => {
  for(const bad of [{success:false},{success:true,hostname:'outro.com.br',action:'wallbox_lead'},{success:true,hostname:'mseletricaetech.com.br',action:'other'}]) { verdict=bad; assert.equal((await send(sample())).status,403); }
  assert.equal(db.prepare('SELECT count(*) AS n FROM wallbox_leads').get().n,0);
});
test('limite por origem de rede e janela é aplicado no banco', async () => {
  for(let i=0;i<10;i++) assert.equal((await send(sample())).status,201);
  assert.equal((await send(sample())).status,429);
  assert.equal((await send(sample(),{ip:'203.0.113.43'})).status,201);
  assert.equal(db.prepare('SELECT count(*) AS n FROM wallbox_leads').get().n,11);
});
test('requisição cruzada, configuração ausente e erro do verificador falham fechados', async () => {
  assert.equal((await send(sample(),{headers:{origin:'https://outro.example'}})).status,403);
  delete env.TURNSTILE_SECRET_KEY; assert.equal((await send(sample())).status,503); assert.equal((onRequestGet({env})).status,503);
  env.TURNSTILE_SECRET_KEY='dummy'; globalThis.fetch=async()=>{throw new Error('indisponível')}; assert.equal((await send(sample())).status,503);
  assert.equal(db.prepare('SELECT count(*) AS n FROM wallbox_leads').get().n,0);
});
test('rejeita payload acima do limite sem salvar dados', async () => {
  assert.equal((await send({...sample(), vehicle:'x'.repeat(10000)})).status,413);
  assert.equal(db.prepare('SELECT count(*) AS n FROM wallbox_leads').get().n,0);
});
