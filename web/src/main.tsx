import { StrictMode, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BadgeEuro,
  CalendarClock,
  CheckCircle2,
  DatabaseZap,
  ExternalLink,
  ListChecks,
  MapPin,
  Search,
  ShieldCheck,
  ShoppingCart,
  Store,
  Tag
} from "lucide-react";
import "./styles.css";

type PriceObservation = {
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

type GroceryProduct = {
  id: string;
  name: string;
  category: string;
  packageSize: string;
  symbolName: string;
  prices: PriceObservation[];
};

const products: GroceryProduct[] = [
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

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR"
});

function App() {
  const [query, setQuery] = useState("");
  const [activeProductId, setActiveProductId] = useState(products[0].id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(["milk_15", "butter_250", "pasta_500"]));

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.category.toLowerCase().includes(normalized)
    );
  }, [query]);

  const activeProduct = products.find((product) => product.id === activeProductId) ?? products[0];
  const cheapest = getCheapest(activeProduct);
  const selectedProducts = products.filter((product) => selectedIds.has(product.id));
  const basketTotal = selectedProducts.reduce((sum, product) => sum + getCheapest(product).price, 0);

  function toggleProduct(productId: string) {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  }

  return (
    <main className="app-shell">
      <aside className="sidebar" aria-label="Produktnavigation">
        <div className="brand-row">
          <div className="brand-mark">
            <BadgeEuro size={24} aria-hidden="true" />
          </div>
          <div>
            <h1>Preisfuchs</h1>
            <p>Baden-Wuerttemberg</p>
          </div>
        </div>

        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Lebensmittel suchen"
            type="search"
          />
        </label>

        <nav className="product-list" aria-label="Produkte">
          {filteredProducts.map((product) => {
            const price = getCheapest(product);
            return (
              <button
                className={product.id === activeProduct.id ? "product-button active" : "product-button"}
                key={product.id}
                onClick={() => setActiveProductId(product.id)}
                type="button"
              >
                <span>
                  <strong>{product.name}</strong>
                  <small>{product.category} · {product.packageSize}</small>
                </span>
                <b>{currency.format(price.price)}</b>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="content" aria-live="polite">
        <header className="topbar">
          <div>
            <p className="section-label">Lebensmittel-Preisvergleich</p>
            <h2>{activeProduct.name}</h2>
          </div>
          <a className="source-link" href="https://prices.openfoodfacts.org" target="_blank" rel="noreferrer">
            Open Prices <ExternalLink size={16} />
          </a>
        </header>

        <section className="summary-grid">
          <article className="best-price-panel">
            <div className="panel-icon">
              <Tag size={24} aria-hidden="true" />
            </div>
            <div>
              <p>Bester beobachteter Preis</p>
              <strong>{currency.format(cheapest.price)}</strong>
              <span>{cheapest.retailer} · {cheapest.storeLocation}</span>
            </div>
          </article>

          <article className="trust-panel">
            <ShieldCheck size={22} aria-hidden="true" />
            <div>
              <strong>Quelle sichtbar</strong>
              <span>{cheapest.source} · {freshnessText(cheapest.observedAt)}</span>
            </div>
          </article>

          <article className="trust-panel">
            <DatabaseZap size={22} aria-hidden="true" />
            <div>
              <strong>Update vorbereitet</strong>
              <span>Supabase + taeglicher GitHub-Job</span>
            </div>
          </article>
        </section>

        <section className="comparison-layout">
          <article className="comparison-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Marktvergleich</p>
                <h3>Preise nach Markt</h3>
              </div>
              <Store size={22} aria-hidden="true" />
            </div>

            <div className="price-table">
              {activeProduct.prices
                .slice()
                .sort((a, b) => a.price - b.price)
                .map((price, index) => (
                  <div className="price-row" key={price.id}>
                    <div className="rank">{index === 0 ? <CheckCircle2 size={20} /> : index + 1}</div>
                    <div>
                      <strong>{price.retailer}</strong>
                      <span><MapPin size={14} /> {price.storeLocation}</span>
                    </div>
                    <div className="price-cell">
                      <strong>{currency.format(price.price)}</strong>
                      {price.unitPrice && price.unit ? (
                        <span>{currency.format(price.unitPrice)} / {price.unit}</span>
                      ) : null}
                    </div>
                    <div className="freshness">
                      <CalendarClock size={15} />
                      {freshnessText(price.observedAt)}
                    </div>
                  </div>
                ))}
            </div>
          </article>

          <article className="basket-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Einkaufsliste</p>
                <h3>Test-Warenkorb</h3>
              </div>
              <ShoppingCart size={22} aria-hidden="true" />
            </div>

            <div className="basket-total">
              <span>Geschaetztes Minimum</span>
              <strong>{currency.format(basketTotal)}</strong>
            </div>

            <div className="basket-list">
              {products.map((product) => (
                <button className="basket-item" key={product.id} onClick={() => toggleProduct(product.id)} type="button">
                  <ListChecks size={18} className={selectedIds.has(product.id) ? "selected" : ""} />
                  <span>{product.name}</span>
                  <b>{currency.format(getCheapest(product).price)}</b>
                </button>
              ))}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function getCheapest(product: GroceryProduct) {
  return product.prices.slice().sort((a, b) => a.price - b.price)[0];
}

function freshnessText(value: string) {
  const observed = new Date(value);
  const today = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.max(0, Math.floor((today.getTime() - observed.getTime()) / msPerDay));
  if (diff === 0) return "heute aktualisiert";
  if (diff === 1) return "gestern aktualisiert";
  return `vor ${diff} Tagen aktualisiert`;
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
