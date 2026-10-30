import { notifyWallboxLead } from './wallbox-leads/notify.js';

const JSON_HEADERS = { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' };
const MAX_BODY = 8192;
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 10;
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const CLICK_KEYS = ['gclid', 'gbraid', 'wbraid'];
const PROPERTIES = new Set(['', 'casa', 'apartamento']);
const DISTANCES = new Set(['', 'ate_5m', '5_a_10m', '10_a_20m', 'mais_20m', 'nao_sei']);
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function reply(status, data) {
  return new Response(JSON.stringify(data), { status, headers: JSON_HEADERS });
}

function validEnvironment(env) {
  return !!(env.WALLBOX_LEADS_DB && env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY && env.RATE_LIMIT_SECRET);
}

function text(value, limit, required = false) {
  if (value == null && !required) return '';
  if (typeof value !== 'string') throw new Error('invalid');
  const s = value.trim().replace(/\s+/g, ' ');
  if ((required && !s) || s.length > limit || /[\u0000-\u001f\u007f]/.test(s)) throw new Error('invalid');
  return s;
}

function attribution(value, keys, max) {
  if (value == null) return {};
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid');
  const result = {};
  for (const key of keys) {
    const v = value[key];
    // Discard untrusted attribution containing free text, URLs, email or oversized values;
    // untrusted advertising parameters must never block an otherwise valid lead.
    if (typeof v === 'string' && v.length <= max && /^[\p{L}\p{N}_.~+=-]+$/u.test(v)) result[key] = v;
  }
  return result;
}

function parseInput(body, origin) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) throw new Error('invalid');
  const submissionId = text(body.submission_id, 36, true).toLowerCase();
  if (!UUID.test(submissionId)) throw new Error('invalid');
  const name = text(body.name, 100, true);
  if (name.length < 2) throw new Error('invalid');
  const phoneRaw = text(body.phone, 30, true);
  if (!/^[\d ()+\-]+$/.test(phoneRaw)) throw new Error('invalid');
  let phone = phoneRaw.replace(/\D/g, '');
  if (phone.startsWith('55') && (phone.length === 12 || phone.length === 13)) phone = phone.slice(2);
  if (!/^[1-9][1-9]\d{8,9}$/.test(phone)) throw new Error('invalid');
  const vehicle = text(body.vehicle, 80);
  const property = text(body.property, 20);
  const distance = text(body.distance, 20);
  if (!PROPERTIES.has(property) || !DISTANCES.has(distance)) throw new Error('invalid');
  const page = new URL(text(body.page, 300, true));
  if (page.origin !== origin || page.pathname !== '/wallbox/' || page.search || page.hash || page.username || page.password) throw new Error('invalid');
  const referrer = text(body.referrer_origin, 255);
  if (referrer) {
    const parsed = new URL(referrer);
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== referrer || parsed.username || parsed.password) throw new Error('invalid');
  }
  const utm = attribution(body.utm, UTM_KEYS, 120);
  const clickIds = attribution(body.click_ids, CLICK_KEYS, 512);
  const token = text(body.turnstile_token, 2048, true);
  return { submissionId, name, phone, vehicle, property, distance, page: page.origin + page.pathname, referrer, utm, clickIds, token };
}

async function hmac(secret, value) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(value));
  return Array.from(new Uint8Array(signature), b => b.toString(16).padStart(2, '0')).join('');
}

async function throttle(db, secret, ip) {
  const bucket = Math.floor(Date.now() / RATE_WINDOW_MS);
  const key = await hmac(secret, `wallbox-rate:${bucket}:${ip}`);
  const row = await db.prepare('INSERT INTO wallbox_rate_limits (bucket, ip_hash, attempts) VALUES (?, ?, 1) ON CONFLICT(bucket, ip_hash) DO UPDATE SET attempts = attempts + 1 RETURNING attempts').bind(bucket, key).first();
  if (!row || typeof row.attempts !== 'number') throw new Error('database');
  return { allowed: row.attempts <= RATE_LIMIT, bucket };
}

async function verifyTurnstile(env, input, hostname, ip) {
  // A refreshed challenge token needs a new Siteverify attempt; lead idempotency is handled by D1.
  const form = new URLSearchParams({ secret: env.TURNSTILE_SECRET_KEY, response: input.token, remoteip: ip, idempotency_key: crypto.randomUUID() });
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: form, signal: AbortSignal.timeout(5000) });
  if (!res.ok) throw new Error('turnstile_unavailable');
  const v = await res.json();
  return v.success === true && v.hostname === hostname && v.action === 'wallbox_lead';
}

async function readBody(request) {
  if (!request.body) return '';
  const reader = request.body.getReader();
  const chunks = []; let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_BODY) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const body = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder('utf-8', { fatal: true }).decode(body);
}

export async function onRequestPost(context) {
  const { request, env } = context;
  if (!validEnvironment(env)) return reply(503, { ok: false, error: 'unavailable' });
  const url = new URL(request.url);
  if (request.headers.get('origin') !== url.origin || !/^application\/json(?:\s*;|$)/i.test(request.headers.get('content-type') || '')) return reply(403, { ok: false, error: 'invalid_request' });
  const ip = request.headers.get('cf-connecting-ip');
  if (!ip) return reply(503, { ok: false, error: 'unavailable' });
  try {
    const limit = await throttle(env.WALLBOX_LEADS_DB, env.RATE_LIMIT_SECRET, ip);
    if (context.waitUntil) context.waitUntil(env.WALLBOX_LEADS_DB.prepare('DELETE FROM wallbox_rate_limits WHERE bucket < ?').bind(limit.bucket - 2).run().catch(() => {}));
    if (!limit.allowed) return reply(429, { ok: false, error: 'rate_limited' });
    const length = Number(request.headers.get('content-length') || 0);
    if (length > MAX_BODY) return reply(413, { ok: false, error: 'invalid' });
    const raw = await readBody(request);
    if (raw === null) return reply(413, { ok: false, error: 'invalid' });
    let input;
    try { input = parseInput(JSON.parse(raw), url.origin); } catch { return reply(400, { ok: false, error: 'invalid' }); }
    const payload = JSON.stringify([input.name, input.phone, input.vehicle, input.property, input.distance, input.page, input.referrer, input.utm, input.clickIds]);
    const fingerprint = await hmac(env.RATE_LIMIT_SECRET, `wallbox-lead:${payload}`);
    // Verify each attempt, including retries: a previously consumed Turnstile
    // token must never be accepted simply because the lead already exists.
    if (!await verifyTurnstile(env, input, url.hostname, ip)) return reply(403, { ok: false, error: 'verification_failed' });
    const existing = await env.WALLBOX_LEADS_DB.prepare('SELECT id, payload_hash FROM wallbox_leads WHERE id = ?').bind(input.submissionId).first();
    if (existing) {
      if (existing.payload_hash !== fingerprint) return reply(409, { ok: false, error: 'duplicate_conflict' });
      return reply(200, { ok: true, lead_id: existing.id, duplicate: true });
    }
    const created = await env.WALLBOX_LEADS_DB.prepare('INSERT INTO wallbox_leads (id, created_at, name, whatsapp, vehicle, property, distance, source_page, referrer_origin, utm_json, click_ids_json, payload_hash) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(id) DO NOTHING RETURNING id').bind(input.submissionId, new Date().toISOString(), input.name, input.phone, input.vehicle || null, input.property || null, input.distance || null, input.page, input.referrer || null, JSON.stringify(input.utm), JSON.stringify(input.clickIds), fingerprint).first();
    if (created) {
      // Salvar o lead é a prioridade; alertas nunca devem impedir a confirmação.
      // Não enviar em repetições do mesmo UUID e não registrar PII nos logs.
      if (env.RESEND_API_KEY && env.WALLBOX_ALERT_EMAIL && context.waitUntil) {
        context.waitUntil(notifyWallboxLead(env, input).catch(() => {
          console.error('wallbox_notification_failed');
        }));
      }
      return reply(201, { ok: true, lead_id: created.id, duplicate: false });
    }
    const afterRace = await env.WALLBOX_LEADS_DB.prepare('SELECT id, payload_hash FROM wallbox_leads WHERE id = ?').bind(input.submissionId).first();
    if (afterRace?.payload_hash === fingerprint) return reply(200, { ok: true, lead_id: afterRace.id, duplicate: true });
    return reply(409, { ok: false, error: 'duplicate_conflict' });
  } catch {
    return reply(503, { ok: false, error: 'unavailable' });
  }
}
