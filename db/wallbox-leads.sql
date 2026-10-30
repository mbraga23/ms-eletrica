CREATE TABLE IF NOT EXISTS wallbox_leads (
  id TEXT PRIMARY KEY,
  created_at TEXT NOT NULL,
  name TEXT NOT NULL,
  whatsapp TEXT NOT NULL,
  vehicle TEXT,
  property TEXT CHECK(property IS NULL OR property IN ('casa', 'apartamento')),
  distance TEXT CHECK(distance IS NULL OR distance IN ('ate_5m', '5_a_10m', '10_a_20m', 'mais_20m', 'nao_sei')),
  source_page TEXT NOT NULL,
  referrer_origin TEXT,
  utm_json TEXT NOT NULL,
  click_ids_json TEXT NOT NULL,
  payload_hash TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS wallbox_leads_created_at ON wallbox_leads(created_at DESC);

CREATE TABLE IF NOT EXISTS wallbox_rate_limits (
  bucket INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL,
  PRIMARY KEY (bucket, ip_hash)
);
