import type { StoreId } from '@/data/stores';

export type ReportKind = 'falscher_preis' | 'neuer_preis' | 'nicht_verfuegbar';

export type PriceReport = {
  productId: string;
  storeId: StoreId;
  kind: ReportKind;
  // Gemeldeter Preis in Euro; bei "nicht verfuegbar" leer.
  price?: number;
  note?: string;
};

export type ReportResult = { status: 'sent' } | { status: 'not_available' } | { status: 'error'; message: string };

// Wird gesetzt, sobald die Supabase Edge Function fuer Preismeldungen bereitsteht.
// Meldungen sind dort erst nach Bestaetigung oeffentlich (zwei gleiche Meldungen oder Foto).
export const REPORT_ENDPOINT: string | undefined = undefined;

export async function sendPriceReport(report: PriceReport): Promise<ReportResult> {
  if (!REPORT_ENDPOINT) {
    return { status: 'not_available' };
  }
  try {
    const response = await fetch(REPORT_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(report),
    });
    if (response.status === 429) {
      return { status: 'error', message: 'Du hast gerade viele Meldungen geschickt. Bitte versuche es später noch einmal.' };
    }
    if (!response.ok) {
      return { status: 'error', message: 'Die Meldung konnte nicht gesendet werden.' };
    }
    return { status: 'sent' };
  } catch {
    return { status: 'error', message: 'Keine Verbindung. Prüfe dein Internet und versuche es erneut.' };
  }
}
