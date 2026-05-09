import { createClient } from "@supabase/supabase-js";
import { demoProducts, type GroceryProduct, type PriceObservation } from "./data";

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
    .limit(250);

  const products = mapProducts(productRows, priceError ? [] : priceRows ?? []);

  return {
    products,
    source: "supabase",
    message: priceRows?.length
      ? "Produkte und Preisbeobachtungen aus Supabase geladen."
      : "Produkte aus Supabase geladen. Bis echte Preise da sind, nutzt Preisfuchs Demo-Preise."
  };
}

function mapProducts(productRows: ProductRow[], priceRows: PriceObservationRow[]): GroceryProduct[] {
  return productRows.map((product) => {
    const matchingPrices = priceRows
      .filter((price) => price.product_id === product.id)
      .map(mapPriceObservation);

    const fallbackPrices = demoProducts.find((demoProduct) => demoProduct.id === product.id)?.prices ?? [];

    return {
      id: product.id,
      name: product.name,
      category: product.category,
      packageSize: product.package_size,
      symbolName: symbolForCategory(product.category),
      prices: matchingPrices.length ? matchingPrices : fallbackPrices
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
      return "leaf";
    case "getraenke":
      return "cup.and.saucer";
    default:
      return "basket";
  }
}
