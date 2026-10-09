// Rechtstexte der Testversion. Vor einer Veroeffentlichung muessen Impressum,
// Datenschutzerklaerung und Nutzungsbedingungen rechtlich geprueft und vervollstaendigt werden.

export type LegalDocument = { id: string; title: string; subtitle: string; body: string[] };

export const legalDocuments: LegalDocument[] = [
  {
    id: 'impressum',
    title: 'Impressum',
    subtitle: 'Angaben gemäß § 5 DDG',
    body: [
      'Preisfuchs ist eine Testversion und noch nicht öffentlich veröffentlicht.',
      'Die Angaben zum Anbieter (Name, Anschrift, Kontakt) werden vor der Veröffentlichung im App Store ergänzt.',
    ],
  },
  {
    id: 'datenschutz',
    title: 'Datenschutzerklärung',
    subtitle: 'Wie Preisfuchs mit deinen Daten umgeht',
    body: [
      'Ohne Konto speichert Preisfuchs Warenkorb, Favoriten, Preisalarme und Einstellungen nur auf deinem Gerät.',
      'Deinen Standort nutzt Preisfuchs nur nach deiner Freigabe, um die Postleitzahl zu bestimmen. Er wird nicht übertragen.',
      'Anzeigen und Nutzungsstatistik werden nur mit deiner Einwilligung eingesetzt. Du kannst sie unter Profil → Datenschutz & Werbung jederzeit ändern.',
      'Preismeldungen: Du kannst ohne Konto Preise melden. Dafür speichert der Server nur gesalzene Hashwerte einer zufälligen Geräte-Kennung und deiner IP-Adresse, um Missbrauch zu begrenzen. Optionale Belegfotos liegen in einem nicht öffentlichen Speicher und dienen nur zur Prüfung des Preises. Fotografiere bitte nur das Preisschild – keine Gesichter, keine Kartendaten oder andere persönliche Angaben.',
      'Familie & Gruppen (optional): Wenn du dich mit deiner E-Mail-Adresse anmeldest, speichert der Server (Supabase, Rechenzentrum London) deine E-Mail-Adresse, deinen Anzeigenamen in Gruppen sowie die Listen, die du mit einer Gruppe teilst, inklusive wer welchen Artikel hinzugefügt oder abgehakt hat. Diese Daten sehen nur Mitglieder derselben Gruppe. Wenn du eine Gruppe verlässt, wirst du aus ihr entfernt; deine Listen bleiben auf deinem Gerät.',
      'Die vollständige Datenschutzerklärung wird vor der Veröffentlichung ergänzt.',
    ],
  },
  {
    id: 'nutzungsbedingungen',
    title: 'Nutzungsbedingungen',
    subtitle: 'Regeln für die Nutzung von Preisfuchs',
    body: [
      'Preise in Preisfuchs sind Beobachtungen aus Prospekten, offenen Datenbanken und Meldungen der Community. Sie sind keine garantierten Marktpreise; im Markt kann der Preis abweichen.',
      'Die Preis-Rangliste ist nicht käuflich. Anzeigen und gesponserte Inhalte sind immer gekennzeichnet.',
      'Die vollständigen Nutzungsbedingungen werden vor der Veröffentlichung ergänzt.',
    ],
  },
  {
    id: 'lizenzen',
    title: 'Lizenzen & Marken',
    subtitle: 'Open-Source, Datenquellen, Händlerlogos',
    body: [
      'Preisdaten: Open Prices, Open Database License (ODbL).',
      'Produktdaten: Open Food Facts, Open Database License (ODbL).',
      'Standortdaten: © OpenStreetMap-Mitwirkende, Open Database License (ODbL).',
      'Händlerlogos: Wikimedia Commons, gemeinfrei. Die Logos sind Marken der jeweiligen Händler und dienen nur zur Kennzeichnung des Markts. Sie bedeuten keine Partnerschaft oder Empfehlung.',
      'Produktbilder in der Testversion: Unsplash (Demo).',
      'Die App nutzt Open-Source-Software, u. a. React Native und Expo (MIT-Lizenz).',
    ],
  },
];

export function getLegalDocument(id: string): LegalDocument | undefined {
  return legalDocuments.find((document) => document.id === id);
}
