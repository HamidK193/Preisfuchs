// Edge Function "report-price": community price reports without an account.
//
// POST JSON { device_id, gtin, store_id, price, is_offer?, valid_until?, observed_on?,
//             product_name?, photo_base64?, photo_mime? }
// A report becomes a public price observation once confirmed:
//   - a second matching report (same GTIN, store, price, within 7 days) from another
//     device AND another IP, or
//   - a receipt/shelf photo, provided the price is plausible against known prices.
// Only salted hashes of device id and IP are stored.
import { createClient } from "npm:@supabase/supabase-js@2";

const MINUTE_LIMIT = 3;
const DAY_LIMIT = 20;
const MATCH_WINDOW_DAYS = 7;
const SOURCE = "Preisfuchs Nutzermeldung";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const SALT = Deno.env.get("REPORT_HASH_SALT") ?? "";

type Report = {
  device_id: string; gtin: string; store_id: string; price: number; is_offer?: boolean;
  valid_until?: string | null; observed_on?: string | null; product_name?: string | null;
  photo_base64?: string | null; photo_mime?: string | null;
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", ...extra } });
}

async function sha256(value: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${SALT}:${value}`));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function isValidGtin(value: string) {
  if (!/^\d{8}$|^\d{12,14}$/.test(value)) return false;
  const digits = [...value].map(Number);
  const check = digits.pop()!;
  const sum = digits.reverse().reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 3 : 1), 0);
  return (10 - (sum % 10)) % 10 === check;
}

function isIsoDate(value: unknown) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(value));
}

function validate(body: Partial<Report>): string | null {
  if (typeof body.device_id !== "string" || body.device_id.length < 16 || body.device_id.length > 100) return "device_id";
  if (typeof body.gtin !== "string" || !isValidGtin(body.gtin)) return "gtin";
  if (typeof body.store_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.store_id)) return "store_id";
  if (typeof body.price !== "number" || !(body.price > 0 && body.price < 1000)) return "price";
  if (body.valid_until != null && !isIsoDate(body.valid_until)) return "valid_until";
  if (body.observed_on != null && !isIsoDate(body.observed_on)) return "observed_on";
  if (body.product_name != null && (typeof body.product_name !== "string" || body.product_name.length > 200)) return "product_name";
  if (body.photo_base64 != null) {
    if (!["image/jpeg", "image/png", "image/webp"].includes(body.photo_mime ?? "")) return "photo_mime";
    if (body.photo_base64.length > 4_000_000) return "photo_base64";
  }
  return null;
}

async function countSince(column: "device_hash" | "ip_hash", hash: string, since: Date) {
  const { count } = await supabase.from("price_reports").select("id", { count: "exact", head: true })
    .eq(column, hash).gte("created_at", since.toISOString());
  return count ?? 0;
}

async function publish(report: Record<string, any>, confidence: number) {
  const { data: article } = await supabase.from("catalog_articles").select("id,product_id,name,brand_name")
    .eq("gtin", report.gtin).eq("review_status", "verified").limit(1).maybeSingle();
  if (!article) return { published: false, reason: "no_verified_article" };
  const { data: store } = await supabase.from("stores").select("id,retailer_id,state,city,retailers(name)")
    .eq("id", report.store_id).single();
  // Many-to-one embeds arrive as an object at runtime; untyped clients declare an array.
  const retailers = store?.retailers as { name: string } | { name: string }[] | null | undefined;
  const retailerName = (Array.isArray(retailers) ? retailers[0]?.name : retailers?.name) ?? report.retailer_id;
  const { data: observation, error } = await supabase.from("price_observations").insert({
    product_id: article.product_id, article_id: article.id, retailer_id: report.retailer_id, store_id: report.store_id,
    product_name: article.name, brand_name: article.brand_name, retailer_name: retailerName,
    price: report.price, currency: "EUR", observed_at: `${report.observed_on}T12:00:00+00:00`,
    valid_until: report.is_offer ? report.valid_until : null, offer_type: report.is_offer ? "sale" : "regular",
    source: SOURCE, source_license: "Preisfuchs (eigene Nutzermeldungen)", source_ref: report.id,
    price_basis: "pack", country_code: "DE", region: store?.state ?? null,
    location_label: [retailerName, store?.city].filter(Boolean).join(", "), location_source_ref: null,
    confidence, is_public: true, review_reasons: [],
  }).select("id").single();
  if (error) throw error;
  return { published: true, observation_id: observation.id };
}

// The photo counts as confirmation only if the price fits known public prices for this GTIN.
async function photoPlausible(gtin: string, price: number) {
  const { data } = await supabase.from("current_price_observations").select("price,article_id")
    .eq("comparison_key", `gtin:${gtin}`).limit(20);
  if (!data?.length) return true;
  const prices = data.map((row) => Number(row.price)).sort((a, b) => a - b);
  const median = prices[Math.floor(prices.length / 2)];
  return price >= median * 0.5 && price <= median * 2;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);
  let body: Partial<Report>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const invalid = validate(body);
  if (invalid) return json({ error: "invalid_field", field: invalid }, 400);
  const report = body as Report;

  const ip = request.headers.get("x-forwarded-for")?.split(",")[0].trim() ?? "unknown";
  const [deviceHash, ipHash] = await Promise.all([sha256(`device:${report.device_id}`), sha256(`ip:${ip}`)]);
  const minuteAgo = new Date(Date.now() - 60_000);
  const dayAgo = new Date(Date.now() - 86_400_000);
  const [deviceMinute, ipMinute, deviceDay, ipDay] = await Promise.all([
    countSince("device_hash", deviceHash, minuteAgo), countSince("ip_hash", ipHash, minuteAgo),
    countSince("device_hash", deviceHash, dayAgo), countSince("ip_hash", ipHash, dayAgo),
  ]);
  if (Math.max(deviceMinute, ipMinute) >= MINUTE_LIMIT) {
    return json({ error: "rate_limited", retry_after_seconds: 60 }, 429, { "Retry-After": "60" });
  }
  if (Math.max(deviceDay, ipDay) >= DAY_LIMIT) {
    return json({ error: "rate_limited", retry_after_seconds: 3600 }, 429, { "Retry-After": "3600" });
  }

  const { data: store } = await supabase.from("stores").select("id,retailer_id").eq("id", report.store_id)
    .eq("is_active", true).maybeSingle();
  if (!store) return json({ error: "invalid_field", field: "store_id" }, 400);

  const observedOn = report.observed_on ?? new Date().toISOString().slice(0, 10);
  let photoPath: string | null = null;
  if (report.photo_base64) {
    const bytes = Uint8Array.from(atob(report.photo_base64), (c) => c.charCodeAt(0));
    photoPath = `${observedOn}/${crypto.randomUUID()}.${report.photo_mime!.split("/")[1]}`;
    const { error } = await supabase.storage.from("price-report-photos").upload(photoPath, bytes,
      { contentType: report.photo_mime!, upsert: false });
    if (error) return json({ error: "photo_upload_failed" }, 500);
  }

  const { data: inserted, error: insertError } = await supabase.from("price_reports").insert({
    gtin: report.gtin, store_id: store.id, retailer_id: store.retailer_id,
    product_name: report.product_name ?? null, price: Math.round(report.price * 100) / 100,
    is_offer: report.is_offer ?? false, valid_until: report.valid_until ?? null, observed_on: observedOn,
    photo_path: photoPath, device_hash: deviceHash, ip_hash: ipHash,
  }).select("*").single();
  if (insertError) return json({ error: "insert_failed" }, 500);

  const windowStart = new Date(Date.parse(observedOn) - MATCH_WINDOW_DAYS * 86_400_000).toISOString().slice(0, 10);
  const { data: matches } = await supabase.from("price_reports").select("id")
    .eq("gtin", inserted.gtin).eq("store_id", inserted.store_id).eq("price", inserted.price)
    .eq("status", "pending").neq("device_hash", deviceHash).neq("ip_hash", ipHash)
    .gte("observed_on", windowStart).neq("id", inserted.id).limit(1);

  let status = "pending";
  let reason: string | null = null;
  let observationId: string | null = null;
  let confirmedBy: "second_report" | "photo" | null = null;
  if (matches?.length) confirmedBy = "second_report";
  else if (photoPath && await photoPlausible(inserted.gtin, inserted.price)) confirmedBy = "photo";
  else if (photoPath) { status = "needs_review"; reason = "photo_price_implausible"; }

  if (confirmedBy) {
    const result = await publish(inserted, confirmedBy === "second_report" ? 0.75 : 0.7);
    status = result.published ? "confirmed" : "needs_review";
    reason = result.published ? confirmedBy : result.reason ?? null;
    observationId = result.published ? result.observation_id ?? null : null;
    const ids = confirmedBy === "second_report" ? [inserted.id, matches![0].id] : [inserted.id];
    await supabase.from("price_reports").update({ status, status_reason: reason, observation_id: observationId })
      .in("id", ids);
  } else if (status !== "pending") {
    await supabase.from("price_reports").update({ status, status_reason: reason }).eq("id", inserted.id);
  }

  return json({ id: inserted.id, status, reason, published: Boolean(observationId) }, 201);
});
