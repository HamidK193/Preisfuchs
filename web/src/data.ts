export type PriceObservation = {
  id: string;
  retailer: string;
  storeLocation: string;
  price: number;
  unitPrice?: number;
  unit?: string;
  observedAt: string;
  source: string;
  sourceDetail: string;
  confidence: number;
};

export type GroceryProduct = {
  id: string;
  name: string;
  category: string;
  packageSize: string;
  symbolName: string;
  prices: PriceObservation[];
};

export const demoProducts: GroceryProduct[] = [
  {
    id: "milk_15",
    name: "Milch 1,5%",
    category: "Molkerei",
    packageSize: "1 l",
    symbolName: "carton",
    prices: [
      demoPrice("milk_aldi_demo", "Aldi Sued", 0.99, 0.99, "l", 0),
      demoPrice("milk_lidl_demo", "Lidl", 1.05, 1.05, "l", 1),
      demoPrice("milk_rewe_demo", "Rewe", 1.19, 1.19, "l", 2)
    ]
  },
  {
    id: "butter_250",
    name: "Butter",
    category: "Molkerei",
    packageSize: "250 g",
    symbolName: "cube.box",
    prices: [
      demoPrice("butter_lidl_demo", "Lidl", 1.79, 7.16, "kg", 0),
      demoPrice("butter_kaufland_demo", "Kaufland", 1.89, 7.56, "kg", 1),
      demoPrice("butter_edeka_demo", "Edeka", 2.29, 9.16, "kg", 3)
    ]
  },
  {
    id: "pasta_500",
    name: "Nudeln",
    category: "Trockenware",
    packageSize: "500 g",
    symbolName: "takeoutbag.and.cup.and.straw",
    prices: [
      demoPrice("pasta_aldi_demo", "Aldi Sued", 0.89, 1.78, "kg", 0),
      demoPrice("pasta_kaufland_demo", "Kaufland", 0.99, 1.98, "kg", 2),
      demoPrice("pasta_rewe_demo", "Rewe", 1.19, 2.38, "kg", 1)
    ]
  },
  {
    id: "bananas_1kg",
    name: "Bananen",
    category: "Obst",
    packageSize: "1 kg",
    symbolName: "leaf",
    prices: [
      demoPrice("bananas_lidl_demo", "Lidl", 1.39, 1.39, "kg", 1),
      demoPrice("bananas_edeka_demo", "Edeka", 1.49, 1.49, "kg", 0),
      demoPrice("bananas_rewe_demo", "Rewe", 1.69, 1.69, "kg", 3)
    ]
  },
  {
    id: "eggs_10",
    name: "Eier",
    category: "Grundnahrungsmittel",
    packageSize: "10 Stueck",
    symbolName: "badge",
    prices: [
      demoPrice("eggs_aldi_demo", "Aldi Sued", 2.19, undefined, undefined, 1),
      demoPrice("eggs_lidl_demo", "Lidl", 2.29, undefined, undefined, 0),
      demoPrice("eggs_edeka_demo", "Edeka", 2.59, undefined, undefined, 2)
    ]
  },
  {
    id: "coffee_500",
    name: "Kaffee",
    category: "Getraenke",
    packageSize: "500 g",
    symbolName: "cup.and.saucer",
    prices: [
      demoPrice("coffee_kaufland_demo", "Kaufland", 4.49, 8.98, "kg", 0),
      demoPrice("coffee_rewe_demo", "Rewe", 4.99, 9.98, "kg", 1),
      demoPrice("coffee_edeka_demo", "Edeka", 5.49, 10.98, "kg", 3)
    ]
  }
];

function demoPrice(
  id: string,
  retailer: string,
  price: number,
  unitPrice?: number,
  unit?: string,
  daysAgo = 0
): PriceObservation {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  date.setHours(6, 0, 0, 0);

  return {
    id,
    retailer,
    storeLocation: "Baden-Wuerttemberg",
    price,
    unitPrice,
    unit,
    observedAt: date.toISOString(),
    source: "Demo-Daten",
    sourceDetail: "MVP-Beispiel",
    confidence: 0.4
  };
}
