export function onRequestGet({ env }) {
  const configured = env.WALLBOX_LEADS_DB && env.TURNSTILE_SECRET_KEY && env.TURNSTILE_SITE_KEY && env.RATE_LIMIT_SECRET;
  const body = configured ? { sitekey: env.TURNSTILE_SITE_KEY } : { error: 'unavailable' };
  return new Response(JSON.stringify(body), { status: configured ? 200 : 503, headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', 'x-content-type-options': 'nosniff' } });
}
