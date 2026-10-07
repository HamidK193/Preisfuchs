import AsyncStorage from '@react-native-async-storage/async-storage';
import { randomUUID } from 'expo-crypto';

// Supabase Edge Function fuer Preismeldungen (siehe supabase/functions/report-price).
// Meldungen sind erst nach Bestaetigung oeffentlich (zweites Geraet oder plausibles Belegfoto).
const BASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
const REPORT_ENDPOINT = BASE_URL ? `${BASE_URL}/functions/v1/report-price` : undefined;

const DEVICE_ID_KEY = 'preisfuchs-device-id';

export type PriceReport = {
  gtin: string;
  // UUID der Filiale aus der Tabelle stores.
  storeUuid: string;
  price: number;
  isOffer: boolean;
  validUntil?: string;
  productName?: string;
  photo?: { base64: string; mime: 'image/jpeg' | 'image/png' | 'image/webp' };
};

export type ReportResult =
  | { status: 'sent'; published: boolean; reason: string | null }
  | { status: 'not_available' }
  | { status: 'error'; message: string };

// Zufaellige, gespeicherte Geraete-ID; der Server speichert nur einen gesalzenen Hash.
async function deviceId(): Promise<string> {
  const saved = await AsyncStorage.getItem(DEVICE_ID_KEY).catch(() => null);
  if (saved) return saved;
  const created = randomUUID();
  await AsyncStorage.setItem(DEVICE_ID_KEY, created).catch(() => undefined);
  return created;
}

const FIELD_MESSAGES: Record<string, string> = {
  gtin: 'Für dieses Produkt fehlt ein gültiger Barcode.',
  store_id: 'Dieser Markt kann gerade nicht gemeldet werden.',
  price: 'Bitte gib einen Preis zwischen 0 und 1000 € ein.',
  photo_base64: 'Das Foto ist zu groß. Bitte nimm es noch einmal auf.',
};

export async function sendPriceReport(report: PriceReport): Promise<ReportResult> {
  if (!REPORT_ENDPOINT || !ANON_KEY) {
    return { status: 'not_available' };
  }
  try {
    const response = await fetch(REPORT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}` },
      body: JSON.stringify({
        device_id: await deviceId(),
        gtin: report.gtin,
        store_id: report.storeUuid,
        price: report.price,
        is_offer: report.isOffer,
        valid_until: report.isOffer ? report.validUntil : undefined,
        product_name: report.productName?.slice(0, 200),
        photo_base64: report.photo?.base64,
        photo_mime: report.photo?.mime,
      }),
    });
    const body = (await response.json().catch(() => ({}))) as {
      published?: boolean;
      reason?: string | null;
      field?: string;
      retry_after_seconds?: number;
    };
    if (response.status === 201) {
      return { status: 'sent', published: Boolean(body.published), reason: body.reason ?? null };
    }
    if (response.status === 429) {
      const wait = body.retry_after_seconds && body.retry_after_seconds >= 3600 ? 'morgen' : 'in einer Minute';
      return { status: 'error', message: `Du hast gerade viele Meldungen geschickt. Bitte versuche es ${wait} noch einmal.` };
    }
    if (response.status === 400) {
      return { status: 'error', message: FIELD_MESSAGES[body.field ?? ''] ?? 'Bitte prüfe deine Eingaben.' };
    }
    return { status: 'error', message: 'Die Meldung konnte gerade nicht gespeichert werden. Bitte versuche es später.' };
  } catch {
    return { status: 'error', message: 'Keine Verbindung. Prüfe dein Internet und versuche es erneut.' };
  }
}
