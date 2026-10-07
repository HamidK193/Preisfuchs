// Farbschema "Fuchsrot" (Variante A, siehe docs/FARBSCHEMA.md):
// Rot fuer Marke, Buttons und Angebote; Gruen nur fuer Ersparnis; Fuchs bleibt orange.
export const Colors = {
  primary: '#E1262D',
  primaryDark: '#B81D23',
  primarySoft: '#FDE8E8',
  // Angebotspreise und Rabatt-Badges
  deal: '#E1262D',
  green: '#0F7A43',
  greenSoft: '#E4F5EA',
  greenText: '#13A05A',
  // Maskottchen-Farbe, nicht fuer UI-Elemente
  fox: '#F07A2A',
  foxSoft: '#FDEBDD',
  background: '#FFFFFF',
  card: '#FFFFFF',
  tile: '#F4F4F5',
  text: '#121212',
  textSecondary: '#6B6B70',
  border: '#E6E6E8',
  danger: '#C2362B',
  warning: '#B7791F',
} as const;

// iOS-Systemschrift (SF Pro); Gewichte statt eigener Schriftdateien.
export const FontWeights = {
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
  extrabold: '800',
} as const;

// Abstaende zwischen Elementen und zum Bildschirmrand.
export const Spacing = {
  one: 4,
  two: 8,
  three: 12,
  four: 16,
  five: 24,
  six: 32,
} as const;

// Innenabstaende nach Elementtyp, damit Karten luftig und Chips kompakt bleiben.
export const Inset = {
  card: 16,
  row: 14,
  compact: 12,
  banner: 20,
  empty: 32,
  chipH: 14,
  chipV: 9,
  pillH: 8,
  pillV: 4,
  buttonH: 24,
  buttonV: 14,
  stepperH: 12,
  stepperV: 8,
  segment: 4,
  segmentItem: 10,
} as const;

// Eckenradius aller eckigen Elemente; Kreise bleiben rund.
export const Radius = {
  small: 5,
  medium: 5,
  large: 5,
  pill: 5,
} as const;
