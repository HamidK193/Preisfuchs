const retailerNameSource = String.raw`(?:aldi(?:\s+s(?:ü|ue)d)?|lidl|rewe|edeka|e[\s-]?center|kaufland|penny|netto(?:\s+marken[\s-]?discount)?|norma|globus|tegut|hit|rossmann|dm|müller)`;

const retailerContextPattern = new RegExp(
  String.raw`\b(?:exklusiv\s+)?(?:bei|von|im|aus\s+dem)\s+${retailerNameSource}(?:\s+(?:markt|filiale))?\b`,
  "giu"
);
const retailerNamePattern = new RegExp(
  String.raw`\b${retailerNameSource}(?:\s+(?:markt|filiale))?\b`,
  "giu"
);
const retailerNameCheckPattern = new RegExp(String.raw`\b${retailerNameSource}\b`, "iu");

export function cleanProductName(rawName: string | null | undefined, fallback = "Produkt") {
  const sanitize = (value: string) => value
    .replace(/\s+/g, " ")
    .replace(/\b(?:mehr angebote|uvp|werbung)\b/giu, " ")
    .replace(retailerContextPattern, " ")
    .replace(retailerNamePattern, " ")
    .replace(/^[\s:|,;\-–—·]+|[\s:|,;\-–—·]+$/g, "")
    .replace(/\s+([,.)])/g, "$1")
    .replace(/\(\s*\)/g, "")
    .replace(/\s+/g, " ")
    .trim();

  return sanitize(rawName ?? "") || sanitize(fallback) || "Produkt";
}

export function containsRetailerName(value: string) {
  return retailerNameCheckPattern.test(value);
}
