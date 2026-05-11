import { createClient } from "@supabase/supabase-js";
import { categories, demoProducts, type GroceryProduct, type PriceObservation } from "./data";
import { productImageOverrides } from "./productImages";

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
const supabase = supabaseUrl && supabaseAnonKey ? createClient(supabaseUrl, supabaseAnonKey) : null;

export async function loadProducts(): Promise<ProductLoadResult> {
  if (!supabase) {
    return {
      products: await enrichProductImages(demoProducts),
      source: "demo",
      message: "Supabase Browser-Key fehlt. Demo-Daten aktiv."
    };
  }

  const { data: productRows, error: productError } = await supabase
    .from("products")
    .select("id,name,category,package_size")
    .order("name");

  if (productError || !productRows?.length) {
    return {
      products: await enrichProductImages(demoProducts),
      source: "demo",
      message: productError?.message ?? "Keine Produkte in Supabase gefunden. Demo-Daten aktiv."
    };
  }

  const { data: priceRows, error: priceError } = await supabase
    .from("price_observations")
    .select("id,product_id,product_name,retailer_name,price,unit_price,unit,observed_at,source,source_url,confidence")
    .order("observed_at", { ascending: false })
    .limit(5000);

  const products = await enrichProductImages(mapProducts(productRows, priceError ? [] : priceRows ?? []));

  return {
    products,
    source: "supabase",
    message: priceRows?.length
      ? "Produkte und Preisbeobachtungen aus Supabase geladen."
      : "Produkte aus Supabase geladen. Noch keine echten Preisbeobachtungen gefunden."
  };
}

function mapProducts(productRows: ProductRow[], priceRows: PriceObservationRow[]): GroceryProduct[] {
  return productRows.flatMap((product) => {
    const matchingRows = priceRows.filter((price) => price.product_id === product.id);
    if (!matchingRows.length) {
      return [mapBaseProduct(product, [])];
    }

    const variantGroups = groupOfferVariants(product, matchingRows);
    return variantGroups.map(([variantKey, rows], index) => {
      const firstRow = rows[0];
      const displayName = cleanOfferProductName(firstRow.product_name, product.name);
      const packageSize = detectPackageSize(firstRow.product_name) ?? product.package_size;
      const brand = inferBrand(displayName);
      const isBaseProductName = normalizeProductKey(displayName) === normalizeProductKey(product.name);
      const classification = classifyOfferVariant(displayName, product);
      const imageSeedId = isBaseProductName ? product.id : classification.imageSeedId;

      return {
        ...mapBaseProduct(product, rows.map(mapPriceObservation)),
        id: index === 0 ? product.id : `${product.id}__${shortHash(variantKey)}`,
        sourceProductId: product.id,
        name: displayName,
        brand,
        productType: classification.productType,
        category: classification.category,
        packageSize,
        symbolName: symbolForCategory(classification.category),
        imageUrl: imageForProduct(imageSeedId, classification.category, displayName, isBaseProductName),
        accentColor: accentForCategory(classification.category)
      };
    });
  });
}

function mapBaseProduct(product: ProductRow, prices: PriceObservation[]): GroceryProduct {
  return {
    id: product.id,
    sourceProductId: product.id,
    name: product.name,
    brand: inferBrand(product.name),
    productType: productTypeForProduct(product.id, product.category, product.name),
    category: product.category,
    packageSize: product.package_size,
    symbolName: symbolForCategory(product.category),
    imageUrl: imageForProduct(product.id, product.category, product.name, true),
    accentColor: accentForCategory(product.category),
    prices
  };
}

function mapPriceObservation(row: PriceObservationRow): PriceObservation {
  return {
    id: row.id,
    retailer: row.retailer_name,
    storeLocation: "Baden-Württemberg",
    productName: row.product_name,
    price: Number(row.price),
    unitPrice: row.unit_price === null ? undefined : Number(row.unit_price),
    unit: row.unit ?? undefined,
    observedAt: row.observed_at,
    source: row.source,
    sourceDetail: row.source_url ?? row.source,
    confidence: Number(row.confidence)
  };
}

function groupOfferVariants(product: ProductRow, rows: PriceObservationRow[]) {
  const groups = new Map<string, PriceObservationRow[]>();
  rows.forEach((row) => {
    const name = cleanOfferProductName(row.product_name, product.name);
    const packageSize = detectPackageSize(row.product_name) ?? product.package_size;
    const key = normalizeProductKey(`${product.id} ${name} ${packageSize}`);
    const existing = groups.get(key) ?? [];
    existing.push(row);
    groups.set(key, existing);
  });

  return Array.from(groups.entries()).sort((left, right) => {
    const leftBest = Math.min(...left[1].map((row) => Number(row.price)));
    const rightBest = Math.min(...right[1].map((row) => Number(row.price)));
    return leftBest - rightBest;
  });
}

function cleanOfferProductName(rawName: string | null | undefined, fallback: string) {
  const cleaned = (rawName ?? fallback)
    .replace(/\s+/g, " ")
    .replace(/\b(mehr angebote|uvp)\b/gi, "")
    .trim();
  return cleaned || fallback;
}

type OfferClassification = {
  category: string;
  productType: string;
  imageSeedId: string;
};

function classifyOfferVariant(name: string, product: ProductRow): OfferClassification {
  const key = normalizeProductKey(name);
  const baseType = productTypeForProduct(product.id, product.category, product.name);
  const baseClassification = {
    category: product.category,
    productType: baseType,
    imageSeedId: product.id
  };

  const rules: Array<{ category: string; productType: string; imageSeedId: string; patterns: string[] }> = [
    { category: "Getränke", productType: "Saft & Schorle", imageSeedId: "orange_juice_1l", patterns: ["direktsaft", "saft", "schorle", "nektar", "smoothie", "milder apfel", "apfel direkt"] },
    { category: "Getränke", productType: "Wasser", imageSeedId: "water_15l", patterns: ["wasser", "mineralwasser", "quelle", "quell"] },
    { category: "Getränke", productType: "Cola", imageSeedId: "cola_125l", patterns: ["cola", "pepsi", "fanta", "sprite"] },
    { category: "Baby", productType: "Babybrei", imageSeedId: "baby_food_190", patterns: ["hipp", "baby", "babykeks", "fruchtbrei", "fruchtpuree", "fruchtpüree", "gläschen", "glaeschen", "wiffkids", "quetschie"] },
    { category: "Fleisch", productType: "Wurst", imageSeedId: "sausages_400", patterns: ["rugenwalder", "rügenwalder", "wurst", "gutsleberwurst", "leberwurst", "salami", "schinken", "mortadella", "aufschnitt"] },
    { category: "Süßigkeiten", productType: "Fruchtgummi", imageSeedId: "gummy_bears_200", patterns: ["trolli", "haribo", "katjes", "fruchtgummi", "gummibarchen", "gummibärchen", "apfel garten"] },
    { category: "Süßigkeiten", productType: "Schokolade", imageSeedId: "chocolate_100", patterns: ["milka", "schokolade", "choco", "after eight", "crossies"] },
    { category: "Süßigkeiten", productType: "Chips", imageSeedId: "chips_175", patterns: ["chips", "pringles", "nacho", "tortilla", "lays", "lay s"] },
    { category: "Süßigkeiten", productType: "Kekse & Gebäck", imageSeedId: "cookies_200", patterns: ["keks", "kekse", "cookie", "cookies", "leibniz"] },
    { category: "Süßigkeiten", productType: "Nüsse", imageSeedId: "nuts_200", patterns: ["nuss", "nüsse", "nusse", "studentenfutter", "mandel", "cashew", "pistazien"] },
    { category: "Tiefkühl", productType: "Desserts", imageSeedId: "icecream_500", patterns: ["eis", "ice cream", "churros", "cheesecake"] },
    { category: "Backen", productType: "Kuchen", imageSeedId: "toast_500", patterns: ["rührkuchen", "ruehrkuchen", "kuchen"] },
    { category: "Molkerei", productType: "Joghurt", imageSeedId: "yogurt_500", patterns: ["joghurt", "yogurt"] },
    { category: "Molkerei", productType: "Käse", imageSeedId: "cheese_slices_400", patterns: ["käse", "kaese", "gouda", "emmentaler", "mozzarella"] },
    { category: "Molkerei", productType: "Milch", imageSeedId: "milk_15", patterns: ["milch", "h milch", "vollmilch"] },
    { category: "Obst", productType: "Äpfel", imageSeedId: "apples_1kg", patterns: ["tafelapfel", "tafeläpfel", "apfel lose", "apfel rot", "rote apfel", "pink lady", "kanzi", "cosmic crisp", "gala", "elstar", "braeburn", "jonagold"] },
    { category: "Obst", productType: "Granatäpfel", imageSeedId: "apples_1kg", patterns: ["granatapfel"] },
    { category: "Obst", productType: "Bananen", imageSeedId: "bananas_1kg", patterns: ["banane", "bananen"] },
    { category: "Obst", productType: "Birnen", imageSeedId: "pears_1kg", patterns: ["birne", "birnen", "conference"] },
    { category: "Obst", productType: "Zitronen", imageSeedId: "lemons_500", patterns: ["zitrone", "zitronen"] },
    { category: "Obst", productType: "Erdbeeren", imageSeedId: "strawberries_500", patterns: ["erdbeere", "erdbeeren"] },
    { category: "Obst", productType: "Orangen", imageSeedId: "oranges_1kg", patterns: ["orange", "orangen"] },
    { category: "Obst", productType: "Trauben", imageSeedId: "grapes_500", patterns: ["traube", "trauben", "weintrauben"] },
    { category: "Gemüse", productType: "Tomaten", imageSeedId: "tomatoes_500", patterns: ["tomate", "tomaten", "rispentomaten"] },
    { category: "Gemüse", productType: "Gurken", imageSeedId: "cucumber_each", patterns: ["gurke", "gurken", "salatgurke"] },
    { category: "Gemüse", productType: "Paprika", imageSeedId: "bell_peppers_500", patterns: ["paprika"] },
    { category: "Gemüse", productType: "Karotten", imageSeedId: "carrots_1kg", patterns: ["karotte", "karotten", "möhre", "moehre", "möhren", "moehren"] },
    { category: "Gemüse", productType: "Kartoffeln", imageSeedId: "potatoes_25kg", patterns: ["kartoffel", "kartoffeln"] }
  ];

  const matchedRule = rules.find((rule) => rule.patterns.some((pattern) => key.includes(normalizeProductKey(pattern))));
  return matchedRule ?? baseClassification;
}

function detectPackageSize(value: string | null | undefined) {
  const match = value?.match(/\b\d+(?:[,.]\d+)?\s?(?:kg|g|l|ml|Liter|Rollen|Stück|WL|Beutel|Packung)\b/i);
  return match?.[0]?.replace(/\s+/, " ");
}

function inferBrand(name: string) {
  const knownBrands = [
    "Milka",
    "funny-frisch",
    "Haribo",
    "Katjes",
    "Leibniz",
    "Kerrygold",
    "Meggle",
    "Barilla",
    "Milbona",
    "K-CLASSIC",
    "K-Bio",
    "Gut & Günstig",
    "REWE Regional",
    "Snack Day",
    "Solevita",
    "Innocent",
    "Rio D'Oro",
    "Valensina",
    "Trolli",
    "Pringles",
    "Lay's",
    "Rügenwalder Mühle",
    "WIFFKIDS",
    "Chiquita",
    "Dr. Oetker",
    "Iglo",
    "Coca-Cola",
    "Volvic",
    "Persil",
    "Fairy",
    "Pampers",
    "HiPP",
    "Sheba",
    "Pedigree"
  ];
  const normalizedName = normalizeProductKey(name);
  return knownBrands.find((brand) => normalizedName.includes(normalizeProductKey(brand)));
}

function productTypeForProduct(id: string, category: string, name: string) {
  const typeOverrides: Record<string, string> = {
    milk_15: "Milch",
    butter_250: "Butter",
    eggs_10: "Eier",
    yogurt_500: "Joghurt",
    cheese_slices_400: "Käse",
    quark_500: "Quark",
    cream_200: "Sahne",
    mozzarella_125: "Mozzarella",
    bananas_1kg: "Bananen",
    apples_1kg: "Äpfel",
    oranges_1kg: "Orangen",
    strawberries_500: "Erdbeeren",
    grapes_500: "Trauben",
    pears_1kg: "Birnen",
    lemons_500: "Zitronen",
    tomatoes_500: "Tomaten",
    cucumber_each: "Gurken",
    carrots_1kg: "Karotten",
    potatoes_25kg: "Kartoffeln",
    onions_1kg: "Zwiebeln",
    bell_peppers_500: "Paprika",
    salad_each: "Salat",
    broccoli_500: "Brokkoli",
    pasta_500: "Nudeln",
    rice_1kg: "Reis",
    oats_500: "Haferflocken",
    lentils_500: "Linsen",
    canned_tomatoes_400: "Dosentomaten",
    tuna_195: "Thunfisch",
    flour_1kg: "Mehl",
    sugar_1kg: "Zucker",
    oil_1l: "Öl",
    baking_powder: "Backpulver",
    cocoa_250: "Kakao",
    yeast: "Hefe",
    coffee_500: "Kaffee",
    water_15l: "Wasser",
    orange_juice_1l: "Saft",
    cola_125l: "Cola",
    tea_20: "Tee",
    beer_05: "Bier",
    chocolate_100: "Schokolade",
    gummy_bears_200: "Gummibärchen",
    cookies_200: "Kekse",
    chips_175: "Chips",
    nuts_200: "Nüsse",
    frozen_pizza_each: "Pizza",
    fries_750: "Pommes",
    icecream_500: "Eis",
    frozen_vegetables_750: "TK-Gemüse",
    fish_sticks_450: "Fischstäbchen",
    toast_500: "Toast",
    bread_rolls_6: "Brötchen",
    wholegrain_bread_500: "Brot",
    muesli_500: "Müsli",
    cornflakes_500: "Cornflakes",
    jam_450: "Marmelade",
    honey_500: "Honig",
    ketchup_500: "Ketchup",
    mayonnaise_500: "Mayonnaise",
    mustard_250: "Senf",
    chicken_breast_400: "Hähnchen",
    minced_meat_500: "Hackfleisch",
    salami_200: "Salami",
    ham_200: "Schinken",
    sausages_400: "Würstchen",
    toilet_paper_10: "Toilettenpapier",
    detergent_20: "Waschmittel",
    dish_soap_500: "Spülmittel",
    kitchen_towels_4: "Küchenrollen",
    diapers_4: "Windeln",
    baby_food_190: "Babybrei",
    wet_wipes_80: "Feuchttücher",
    cat_food_400: "Katzenfutter",
    dog_food_1kg: "Hundefutter",
    cat_litter_10l: "Katzenstreu"
  };
  return typeOverrides[id] ?? categoryTypeFallback(category, name);
}

function categoryTypeFallback(category: string, name: string) {
  if (category === "Süßigkeiten") return "Snacks";
  if (category === "Gemüse") return "Gemüse";
  return name.split(" ")[0] ?? category;
}

function normalizeProductKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function shortHash(value: string) {
  let hash = 0;
  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }
  return hash.toString(36);
}

function symbolForCategory(category: string) {
  switch (normalizeProductKey(category)) {
    case "molkerei":
      return "carton";
    case "obst":
    case "gemuse":
    case "frische":
      return "leaf";
    case "getranke":
      return "cup.and.saucer";
    default:
      return "basket";
  }
}

function accentForCategory(category: string) {
  return categories.find((item) => item.id === category || normalizeProductKey(item.id) === normalizeProductKey(category))
    ?.accentColor ?? "#55a95d";
}

async function enrichProductImages(products: GroceryProduct[]) {
  const cache = readProductImageCache();
  const nextCache = { ...cache };

  const enriched = await Promise.all(
    products.map(async (product) => {
      const fallbackImage = fallbackImageForProduct(product.id, product.category, product.name, product.productType);
      const cacheKey = `${product.id}|${product.name}|${product.packageSize}`;
      const exactImageUrl = directProductImageFor(product);

      if (exactImageUrl) {
        return { ...product, imageUrl: exactImageUrl };
      }

      if (product.imageUrl) {
        return product;
      }

      if (cache[cacheKey]) {
        return { ...product, imageUrl: cache[cacheKey] };
      }

      if (!shouldFetchOpenFoodFactsImage(product)) {
        return { ...product, imageUrl: product.imageUrl ?? fallbackImage };
      }

      const imageUrl = await fetchOpenFoodFactsImage(product);
      if (!imageUrl) return { ...product, imageUrl: product.imageUrl ?? fallbackImage };

      nextCache[cacheKey] = imageUrl;
      return { ...product, imageUrl };
    })
  );

  writeProductImageCache(nextCache);
  return enriched;
}

function shouldFetchOpenFoodFactsImage(product: GroceryProduct) {
  return !["obst", "gemuse", "frische"].includes(normalizeProductKey(product.category));
}

function directProductImageFor(product: GroceryProduct) {
  const key = normalizeProductKey(`${product.brand ?? ""} ${product.name} ${product.packageSize ?? ""}`);
  const directImages: Array<{ patterns: string[]; imageUrl: string }> = [
    {
      patterns: ["haribo goldbaren", "haribo goldbaeren"],
      imageUrl: "https://assets.haribo.com/image/upload/s--WFKgWKdK--/ar_3310:4000,c_fill,f_auto,q_60/w_753/v1/consumer-sites/general/Goldb%C3%A4ren_packshot_front.png"
    },
    {
      patterns: ["katjes tappsy", "katjes fruchtgummi"],
      imageUrl: "https://shop.katjes.de/cdn/shop/files/404199306_Tappsy_CGI_FRONT_Sticker_grande.webp?v=1771938732"
    },
    {
      patterns: ["pringles hot spicy", "pringles hot and spicy"],
      imageUrl: "https://images.openfoodfacts.org/images/products/505/399/013/9545/front_en.98.400.jpg"
    },
    {
      patterns: ["milka alpenmilch", "alpenmilch schokolade"],
      imageUrl: "https://upload.wikimedia.org/wikipedia/commons/thumb/9/90/Milka_Alpine_Milk_Chocolate_bar_100g.jpg/960px-Milka_Alpine_Milk_Chocolate_bar_100g.jpg"
    },
    {
      patterns: ["barilla spaghetti n 5", "barilla spaghetti"],
      imageUrl: productImageOverrides.pasta_500
    },
    {
      patterns: ["milbona h milch", "milbona h milch 1 5"],
      imageUrl: productImageOverrides.milk_15
    },
    {
      patterns: ["milbona gouda", "gouda scheiben"],
      imageUrl: productImageOverrides.cheese_slices_400
    },
    {
      patterns: ["kolln blutenzarte", "kolln haferflocken", "koln blutenzarte"],
      imageUrl: productImageOverrides.oats_500
    },
    {
      patterns: ["hipp bio fruchtbrei apfel banane babykeks", "hipp fruchtbrei apfel banane", "hipp apfel banane babykeks"],
      imageUrl: "https://shop.hipp.de/media/catalog/product/cache/a937ca5527c42b117b11c41e12607fdf/8/5/8579-01_fs-e.jpg"
    },
    {
      patterns: ["funny frisch chipsfrisch oriental", "funny frisch oriental"],
      imageUrl: "https://produkte.globus.de/thumbnail/a7/c9/31/1755640148/4003586107183_11307100_800x800.jpg?1755649996"
    },
    {
      patterns: ["fairy spulmittel", "fairy original"],
      imageUrl: "https://images.cdn.europe-west1.gcp.commercetools.com/723b2575-66c7-4d92-ae49-82bf1d168d26/00-731515-0183297420-UCai6Kbv-large.jpg"
    }
  ];

  return directImages.find((item) =>
    item.patterns.some((pattern) => key.includes(normalizeProductKey(pattern)))
  )?.imageUrl;
}

function readProductImageCache() {
  try {
    const raw = window.localStorage.getItem("preisfuchs-product-images-v5");
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function writeProductImageCache(cache: Record<string, string>) {
  try {
    window.localStorage.setItem("preisfuchs-product-images-v5", JSON.stringify(cache));
  } catch {
    // Browser storage may be disabled; product cards still use fallback images.
  }
}

type OpenFoodFactsProduct = {
  product_name?: string;
  brands?: string;
  generic_name?: string;
  quantity?: string;
  image_front_url?: string;
  image_url?: string;
  image_small_url?: string;
  countries_tags?: string[];
};

async function fetchOpenFoodFactsImage(product: GroceryProduct) {
  const candidates: OpenFoodFactsProduct[] = [];

  for (const searchTerms of imageSearchCandidates(product)) {
    const params = new URLSearchParams({
      search_terms: searchTerms,
      search_simple: "1",
      action: "process",
      json: "1",
      page_size: "12",
      fields: "code,product_name,brands,generic_name,quantity,countries_tags,image_front_url,image_url,image_small_url"
    });

    try {
      const response = await fetch(`https://world.openfoodfacts.org/cgi/search.pl?${params.toString()}`, {
        headers: { Accept: "application/json" }
      });
      if (!response.ok) continue;

      const payload = (await response.json()) as { products?: OpenFoodFactsProduct[] };
      candidates.push(...(payload.products ?? []));
    } catch {
      continue;
    }
  }

  return pickBestProductImage(product, candidates);
}

function imageSearchCandidates(product: GroceryProduct) {
  const overrides: Record<string, string> = {
    milk_15: "Milch 1,5 Deutschland",
    pasta_500: "Spaghetti Deutschland",
    gummy_bears_200: "Haribo Goldbären",
    frozen_pizza_each: "Tiefkühlpizza Deutschland",
    cola_125l: "Cola 1,25 Deutschland",
    orange_juice_1l: "Orangensaft Deutschland",
    water_15l: "Mineralwasser Deutschland",
    coffee_500: "Kaffee gemahlen Deutschland",
    chocolate_100: "Schokolade Vollmilch Deutschland",
    chips_175: "Chips Deutschland",
    detergent_20: "Waschmittel Deutschland",
    diapers_4: "Windeln Deutschland",
    cat_food_400: "Katzenfutter Deutschland",
    dog_food_1kg: "Hundefutter Deutschland"
  };

  const terms = [
    `${product.brand ?? ""} ${product.name} ${product.packageSize}`.trim(),
    `${product.name} ${product.packageSize}`,
    `${product.brand ?? ""} ${product.productType ?? ""}`.trim(),
    overrides[product.sourceProductId ?? product.id],
    product.name
  ].filter((term): term is string => Boolean(term));

  return Array.from(new Set(terms.map((term) => term.replace(/\s+/g, " ").trim()))).slice(0, 4);
}

function pickBestProductImage(product: GroceryProduct, candidates: OpenFoodFactsProduct[]) {
  const scored = candidates
    .map((candidate) => ({
      imageUrl: candidate.image_front_url ?? candidate.image_url ?? candidate.image_small_url,
      score: scoreProductImageCandidate(product, candidate)
    }))
    .filter((candidate): candidate is { imageUrl: string; score: number } => Boolean(candidate.imageUrl))
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  return best && best.score >= imageMatchThreshold(product) ? best.imageUrl : undefined;
}

function scoreProductImageCandidate(product: GroceryProduct, candidate: OpenFoodFactsProduct) {
  const targetTokens = productImageTokens(`${product.brand ?? ""} ${product.name} ${product.productType ?? ""}`);
  const candidateText = normalizeProductKey([
    candidate.brands,
    candidate.product_name,
    candidate.generic_name,
    candidate.quantity
  ].filter(Boolean).join(" "));
  if (!candidateText) return 0;

  const matchingTokens = targetTokens.filter((token) => candidateText.includes(token));
  const brandScore = product.brand && candidateText.includes(normalizeProductKey(product.brand)) ? 2.6 : 0;
  const typeScore = product.productType && candidateText.includes(normalizeProductKey(product.productType)) ? 0.9 : 0;
  const countryScore = candidate.countries_tags?.includes("en:germany") ? 0.4 : 0;
  const packageScore = product.packageSize && candidateText.includes(normalizeProductKey(product.packageSize)) ? 0.4 : 0;

  return brandScore + typeScore + countryScore + packageScore + matchingTokens.length;
}

function imageMatchThreshold(product: GroceryProduct) {
  return product.brand ? 3.1 : 2.4;
}

function productImageTokens(value: string) {
  const stopWords = new Set([
    "und",
    "oder",
    "mit",
    "der",
    "die",
    "das",
    "ein",
    "eine",
    "bio",
    "premium",
    "regional",
    "dtsch",
    "ital",
    "deutschland",
    "versch",
    "sorten",
    "artikel"
  ]);
  return normalizeProductKey(value)
    .split(" ")
    .filter((token) => token.length > 2 && !stopWords.has(token));
}

function imageForProduct(id: string, category: string, name: string, useBaseImage: boolean) {
  if (!useBaseImage) return undefined;
  return fallbackImageForProduct(id, category, name);
}

function fallbackImageForProduct(id: string, category: string, name: string, productType?: string) {
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

  if (productImageOverrides[id]) return productImageOverrides[id];
  if (knownImages[id]) return knownImages[id];
  const typeKey = normalizeProductKey(productType ?? "");
  const nameKey = normalizeProductKey(name);
  const typeImageMap: Record<string, string> = {
    "saft schorle": knownImages.orange_juice_1l,
    wasser: knownImages.water_15l,
    cola: knownImages.cola_125l,
    babybrei: productImageOverrides.baby_food_190 ?? knownImages.bananas_1kg,
    wurst: knownImages.sausages_400,
    fruchtgummi: knownImages.gummy_bears_200,
    schokolade: knownImages.chocolate_100,
    chips: knownImages.chips_175,
    "kekse geback": knownImages.cookies_200,
    nusse: knownImages.nuts_200,
    desserts: knownImages.icecream_500,
    kuchen: knownImages.toast_500,
    joghurt: knownImages.yogurt_500,
    kase: knownImages.cheese_slices_400,
    milch: knownImages.milk_15,
    apfel: knownImages.apples_1kg,
    granatapfel: knownImages.apples_1kg,
    bananen: knownImages.bananas_1kg,
    birnen: knownImages.pears_1kg,
    zitronen: knownImages.lemons_500,
    erdbeeren: knownImages.strawberries_500,
    orangen: knownImages.oranges_1kg,
    trauben: knownImages.grapes_500,
    tomaten: knownImages.tomatoes_500,
    gurken: knownImages.cucumber_each,
    paprika: knownImages.bell_peppers_500,
    karotten: knownImages.carrots_1kg,
    kartoffeln: knownImages.potatoes_25kg
  };
  if (typeImageMap[typeKey]) return typeImageMap[typeKey];
  if (nameKey.includes("banane")) return knownImages.bananas_1kg;
  if (nameKey.includes("ei")) return knownImages.eggs_10;
  return categories.find((item) => item.id === category)?.imageUrl;
}
