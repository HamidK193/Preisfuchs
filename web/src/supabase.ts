import { createClient } from "@supabase/supabase-js";
import { categories, demoProducts, type GroceryProduct, type PriceObservation } from "./data";

type ProductRow = {
  id: string;
  name: string;
  category: string;
  package_size: string;
};

type PriceObservationRow = {
  id: string;
  product_id: string;
  product_name: string;
  retailer_name: string;
  price: string | number;
  unit_price: string | number | null;
  unit: string | null;
  observed_at: string;
  source: string;
  source_url: string | null;
  confidence: string | number;
};

export type ProductLoadResult = {
  products: GroceryProduct[];
  source: "supabase" | "demo";
  message: string;
};

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

export async function loadProducts(): Promise<ProductLoadResult> {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      products: demoProducts,
      source: "demo",
      message: "Supabase Browser-Key fehlt. Demo-Daten aktiv."
    };
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select("id,name,category,package_size")
    .order("name");

  if (productError || !productRows?.length) {
    return {
      products: demoProducts,
      source: "demo",
      message: productError?.message ?? "Keine Produkte in Supabase gefunden. Demo-Daten aktiv."
    };
  }

  const { data: priceRows, error: priceError } = await supabase
    .from("price_observations")
    .select("id,product_id,product_name,retailer_name,price,unit_price,unit,observed_at,source,source_url,confidence")
    .order("observed_at", { ascending: false })
    .limit(5000);

  const products = mapProducts(productRows, priceError ? [] : priceRows ?? []);

  return {
    products,
    source: "supabase",
    message: priceRows?.length
      ? "Produkte und Preisbeobachtungen aus Supabase geladen."
      : "Produkte aus Supabase geladen. Noch keine echten Preisbeobachtungen gefunden."
  };
}

function mapProducts(productRows: ProductRow[], priceRows: PriceObservationRow[]): GroceryProduct[] {
  return productRows.map((product) => {
    const matchingPrices = priceRows
      .filter((price) => price.product_id === product.id)
      .map(mapPriceObservation);

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      packageSize: product.package_size,
      symbolName: symbolForCategory(product.category),
      imageUrl: imageForProduct(product.id, product.category, product.name),
      accentColor: accentForCategory(product.category),
      prices: matchingPrices
    };
  });
}

function mapPriceObservation(row: PriceObservationRow): PriceObservation {
  return {
    id: row.id,
    retailer: row.retailer_name,
    storeLocation: "Baden-Wuerttemberg",
    price: Number(row.price),
    unitPrice: row.unit_price === null ? undefined : Number(row.unit_price),
    unit: row.unit ?? undefined,
    observedAt: row.observed_at,
    source: row.source,
    sourceDetail: row.source_url ?? row.source,
    confidence: Number(row.confidence)
  };
}

function symbolForCategory(category: string) {
  switch (category.toLowerCase()) {
    case "molkerei":
      return "carton";
    case "obst":
    case "gemuese":
    case "frische":
      return "leaf";
    case "getraenke":
      return "cup.and.saucer";
    default:
      return "basket";
  }
}

function accentForCategory(category: string) {
  return categories.find((item) => item.id === category)?.accentColor ?? "#55a95d";
}

function imageForProduct(id: string, category: string, name: string) {
  const knownImages: Record<string, string> = {
    milk_15: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=480&q=80",
    butter_250: "https://images.unsplash.com/photo-1589985270826-4b7bb135bc9d?auto=format&fit=crop&w=480&q=80",
    eggs_10: "https://images.unsplash.com/photo-1582722872445-44dc5f7e3c8f?auto=format&fit=crop&w=480&q=80",
    pasta_500: "https://images.unsplash.com/photo-1551462147-ff29053bfc14?auto=format&fit=crop&w=480&q=80",
    rice_1kg: "https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=480&q=80",
    flour_1kg: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=480&q=80",
    sugar_1kg: "https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=480&q=80",
    coffee_500: "https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=480&q=80",
    bananas_1kg: "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=480&q=80",
    tomatoes_500: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=480&q=80",
    apples_1kg: "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=480&q=80",
    oranges_1kg: "https://images.unsplash.com/photo-1547514701-42782101795e?auto=format&fit=crop&w=480&q=80",
    strawberries_500: "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=480&q=80",
    grapes_500: "https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=480&q=80",
    pears_1kg: "https://images.unsplash.com/photo-1514756331096-242fdeb70d4a?auto=format&fit=crop&w=480&q=80",
    lemons_500: "https://images.unsplash.com/photo-1587496679742-bad502958fbf?auto=format&fit=crop&w=480&q=80",
    potatoes_25kg: "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=480&q=80",
    carrots_1kg: "https://images.unsplash.com/photo-1445282768818-728615cc910a?auto=format&fit=crop&w=480&q=80",
    cucumber_each: "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=480&q=80",
    onions_1kg: "https://images.unsplash.com/photo-1508747703725-719777637510?auto=format&fit=crop&w=480&q=80",
    bell_peppers_500: "https://images.unsplash.com/photo-1563565375-f3fdfdbefa83?auto=format&fit=crop&w=480&q=80",
    salad_each: "https://images.unsplash.com/photo-1622206151226-18ca2c9ab4a1?auto=format&fit=crop&w=480&q=80",
    broccoli_500: "https://images.unsplash.com/photo-1459411621453-7b03977f4bfc?auto=format&fit=crop&w=480&q=80",
    yogurt_500: "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=480&q=80",
    cheese_slices_400: "https://images.unsplash.com/photo-1486297678162-eb2a19b0a32d?auto=format&fit=crop&w=480&q=80",
    quark_500: "https://images.unsplash.com/photo-1628088062854-d1870b4553da?auto=format&fit=crop&w=480&q=80",
    cream_200: "https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=480&q=80",
    mozzarella_125: "https://images.unsplash.com/photo-1625944525533-473f1a3d54e7?auto=format&fit=crop&w=480&q=80",
    oats_500: "https://images.unsplash.com/photo-1614961233913-a5113a4a34ed?auto=format&fit=crop&w=480&q=80",
    lentils_500: "https://images.unsplash.com/photo-1515543904379-3d757afe72e4?auto=format&fit=crop&w=480&q=80",
    canned_tomatoes_400: "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=480&q=80",
    tuna_195: "https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?auto=format&fit=crop&w=480&q=80",
    water_15l: "https://images.unsplash.com/photo-1564419320461-6870880221ad?auto=format&fit=crop&w=480&q=80",
    orange_juice_1l: "https://images.unsplash.com/photo-1600271886742-f049cd451bba?auto=format&fit=crop&w=480&q=80",
    cola_125l: "https://images.unsplash.com/photo-1629203851122-3726ecdf080e?auto=format&fit=crop&w=480&q=80",
    tea_20: "https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=480&q=80",
    beer_05: "https://images.unsplash.com/photo-1608270586620-248524c67de9?auto=format&fit=crop&w=480&q=80",
    chocolate_100: "https://images.unsplash.com/photo-1511381939415-e44015466834?auto=format&fit=crop&w=480&q=80",
    chips_175: "https://images.unsplash.com/photo-1566478989037-eec170784d0b?auto=format&fit=crop&w=480&q=80",
    gummy_bears_200: "https://images.unsplash.com/photo-1582058091505-f87a2e55a40f?auto=format&fit=crop&w=480&q=80",
    cookies_200: "https://images.unsplash.com/photo-1499636136210-6f4ee915583e?auto=format&fit=crop&w=480&q=80",
    nuts_200: "https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&w=480&q=80",
    frozen_pizza_each: "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?auto=format&fit=crop&w=480&q=80",
    fries_750: "https://images.unsplash.com/photo-1573080496219-bb080dd4f877?auto=format&fit=crop&w=480&q=80",
    icecream_500: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=480&q=80",
    frozen_vegetables_750: "https://images.unsplash.com/photo-1590779033100-9f60a05a013d?auto=format&fit=crop&w=480&q=80",
    fish_sticks_450: "https://images.unsplash.com/photo-1524704654690-b56c05c78a00?auto=format&fit=crop&w=480&q=80",
    oil_1l: "https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&w=480&q=80",
    baking_powder: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=480&q=80",
    cocoa_250: "https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=480&q=80",
    yeast: "https://images.unsplash.com/photo-1608198093002-ad4e005484ec?auto=format&fit=crop&w=480&q=80",
  };

  if (knownImages[id]) return knownImages[id];
  if (name.toLowerCase().includes("banane")) return knownImages.bananas_1kg;
  if (name.toLowerCase().includes("ei")) return knownImages.eggs_10;
  return categories.find((item) => item.id === category)?.imageUrl;
}
