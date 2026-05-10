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
  imageUrl?: string;
  accentColor?: string;
  prices: PriceObservation[];
};

export type ProductCategory = {
  id: string;
  label: string;
  imageUrl: string;
  accentColor: string;
};

export const categories: ProductCategory[] = [
  {
    id: "Obst",
    label: "Obst",
    imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=480&q=80",
    accentColor: "#f4b83f"
  },
  {
    id: "Gemuese",
    label: "Gemuese",
    imageUrl: "https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=480&q=80",
    accentColor: "#55a95d"
  },
  {
    id: "Frische",
    label: "Frische",
    imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=480&q=80",
    accentColor: "#ec5b43"
  },
  {
    id: "Molkerei",
    label: "Molkerei",
    imageUrl: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=480&q=80",
    accentColor: "#6aa7d8"
  },
  {
    id: "Backen",
    label: "Backen",
    imageUrl: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=480&q=80",
    accentColor: "#c98a43"
  },
  {
    id: "Trockenware",
    label: "Vorrat",
    imageUrl: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=480&q=80",
    accentColor: "#d7a44a"
  },
  {
    id: "Getraenke",
    label: "Getraenke",
    imageUrl: "https://images.unsplash.com/photo-1544145945-f90425340c7e?auto=format&fit=crop&w=480&q=80",
    accentColor: "#4097b8"
  },
  {
    id: "Suessigkeiten",
    label: "Suessigkeiten",
    imageUrl: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=480&q=80",
    accentColor: "#d96b9c"
  },
  {
    id: "Tiefkuehl",
    label: "Tiefkuehl",
    imageUrl: "https://images.unsplash.com/photo-1580915411954-282cb1b0d780?auto=format&fit=crop&w=480&q=80",
    accentColor: "#7aa7d9"
  },
  {
    id: "Fleisch",
    label: "Fleisch",
    imageUrl: "https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&w=480&q=80",
    accentColor: "#c95f4d"
  },
  {
    id: "Drogerie",
    label: "Drogerie",
    imageUrl: "https://images.unsplash.com/photo-1583947215259-38e31be8751f?auto=format&fit=crop&w=480&q=80",
    accentColor: "#55a5a1"
  },
  {
    id: "Baby",
    label: "Baby",
    imageUrl: "https://images.unsplash.com/photo-1515488042361-ee00e0ddd4e4?auto=format&fit=crop&w=480&q=80",
    accentColor: "#dba8b8"
  },
  {
    id: "Tierbedarf",
    label: "Tierbedarf",
    imageUrl: "https://images.unsplash.com/photo-1589924691995-400dc9ecc119?auto=format&fit=crop&w=480&q=80",
    accentColor: "#9a7b58"
  }
];

export const demoProducts: GroceryProduct[] = [
  {
    id: "milk_15",
    name: "Milch 1,5%",
    category: "Molkerei",
    packageSize: "1 l",
    symbolName: "carton",
    imageUrl: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=480&q=80",
    accentColor: "#6aa7d8",
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
    imageUrl: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=480&q=80",
    accentColor: "#f4c765",
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
    imageUrl: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=480&q=80",
    accentColor: "#d7a44a",
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
    imageUrl: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=480&q=80",
    accentColor: "#f4b83f",
    prices: [
      demoPrice("bananas_lidl_demo", "Lidl", 1.39, 1.39, "kg", 1),
      demoPrice("bananas_edeka_demo", "Edeka", 1.49, 1.49, "kg", 0),
      demoPrice("bananas_rewe_demo", "Rewe", 1.69, 1.69, "kg", 3)
    ]
  },
  {
    id: "eggs_10",
    name: "Eier",
    category: "Frische",
    packageSize: "10 Stueck",
    symbolName: "badge",
    imageUrl: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=480&q=80",
    accentColor: "#dcb35b",
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
    imageUrl: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=480&q=80",
    accentColor: "#8b5a38",
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
