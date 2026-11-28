// Edge Function "report-price": a signed-in user reports a shelf price.
//
// POST JSON { gtin, store_id, price, is_offer?, valid_until?, observed_on?, product_name?, photo_path? }
// Header: Authorization: Bearer <user access token> (email-OTP session; the anon key is rejected).
// The report is stored as "unverified" and never reaches price_observations before a
// moderator verifies it (private.moderate_price_report). Photos are uploaded by the app
// itself into the private bucket "price-report-photos" at "<user id>/<uuid>.<jpg|png|webp>";
// this function only checks that the referenced object exists in the user's own folder.
// Rate limits (5/min, 30/day per user) are enforced by a DB trigger; checked here for friendly errors.
import { createClient } from "npm:@supabase/supabase-js@2";

const DAY_LIMIT = 30;
const MINUTE_LIMIT = 5;
const MAX_PRICE = 200; // exclusive
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

type Report = {
  gtin: string; store_id: string; price: number; is_offer?: boolean; valid_until?: string | null;
  observed_on?: string | null; product_name?: string | null; photo_path?: string | null;
};

function json(body: unknown, status = 200, extra: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json", ...extra } });
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

function validate(body: Partial<Report>, userId: string): string | null {
  if (typeof body.gtin !== "string" || !isValidGtin(body.gtin)) return "gtin";
  if (typeof body.store_id !== "string" || !/^[0-9a-f-]{36}$/i.test(body.store_id)) return "store_id";
  if (typeof body.price !== "number" || !(body.price >= 0.01 && body.price < MAX_PRICE)) return "price";
  if (body.is_offer != null && typeof body.is_offer !== "boolean") return "is_offer";
  if (body.valid_until != null && !isIsoDate(body.valid_until)) return "valid_until";
  if (body.observed_on != null) {
    if (!isIsoDate(body.observed_on)) return "observed_on";
    const age = Date.now() - Date.parse(body.observed_on as string);
    if (age < -86_400_000 || age > 14 * 86_400_000) return "observed_on";
  }
  if (body.product_name != null && (typeof body.product_name !== "string" || body.product_name.length > 200)) return "product_name";
  if (body.photo_path != null) {
    const re = new RegExp(`^${userId}/[0-9a-f-]{36}\\.(jpg|png|webp)$`);
    if (typeof body.photo_path !== "string" || !re.test(body.photo_path)) return "photo_path";
  }
  return null;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (request.method !== "POST") return json({ error: "method_not_allowed" }, 405);

  const token = request.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  const { data: auth } = await supabase.auth.getUser(token);
  const user = auth?.user;
  if (!user || user.is_anonymous) return json({ error: "login_required" }, 401);

  let body: Partial<Report>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid_json" }, 400);
  }
  const invalid = validate(body, user.id);
  if (invalid) return json({ error: "invalid_field", field: invalid }, 400);
  const report = body as Report;

  const since = (ms: number) => new Date(Date.now() - ms).toISOString();
  const countSince = async (ms: number) =>
    (await supabase.from("price_reports").select("id", { count: "exact", head: true })
      .eq("user_id", user.id).gte("created_at", since(ms))).count ?? 0;
  const [perMinute, perDay] = await Promise.all([countSince(60_000), countSince(86_400_000)]);
  if (perMinute >= MINUTE_LIMIT) return json({ error: "rate_limited", retry_after_seconds: 60 }, 429, { "Retry-After": "60" });
  if (perDay >= DAY_LIMIT) return json({ error: "rate_limited", retry_after_seconds: 3600 }, 429, { "Retry-After": "3600" });

  const [{ data: store }, { data: article }] = await Promise.all([
    supabase.from("stores").select("id,retailer_id").eq("id", report.store_id).eq("is_active", true).maybeSingle(),
    supabase.from("catalog_articles").select("id").eq("gtin", report.gtin).limit(1).maybeSingle(),
  ]);
  if (!store) return json({ error: "invalid_field", field: "store_id" }, 400);
  if (!article) return json({ error: "unknown_product", field: "gtin" }, 400);

  if (report.photo_path) {
    const [folder, file] = report.photo_path.split("/");
    const { data: found } = await supabase.storage.from("price-report-photos").list(folder, { search: file, limit: 1 });
    if (!found?.some((o) => o.name === file)) return json({ error: "invalid_field", field: "photo_path" }, 400);
  }

  const observedOn = report.observed_on ?? new Date().toISOString().slice(0, 10);
  const price = Math.round(report.price * 100) / 100;
  const { data: duplicate } = await supabase.from("price_reports").select("id").eq("user_id", user.id)
    .eq("gtin", report.gtin).eq("store_id", store.id).eq("price", price).eq("observed_on", observedOn)
    .in("status", ["unverified", "verified"]).limit(1).maybeSingle();
  if (duplicate) return json({ error: "duplicate", id: duplicate.id }, 409);

  const { data: inserted, error } = await supabase.from("price_reports").insert({
    user_id: user.id, gtin: report.gtin, store_id: store.id, retailer_id: store.retailer_id,
    product_name: report.product_name ?? null, price, is_offer: report.is_offer ?? false,
    valid_until: report.is_offer ? report.valid_until ?? null : null, observed_on: observedOn,
    photo_path: report.photo_path ?? null,
  }).select("id,status,created_at").single();
  if (error) {
    if (error.code === "P0429") return json({ error: "rate_limited", retry_after_seconds: 60 }, 429, { "Retry-After": "60" });
    return json({ error: "insert_failed" }, 500);
  }
  return json({ id: inserted.id, status: inserted.status, is_verified: false, created_at: inserted.created_at }, 201);
});
