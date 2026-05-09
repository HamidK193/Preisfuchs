import { StrictMode, useEffect, useMemo, useState } from "react";
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
import { demoProducts, type GroceryProduct } from "./data";
import { loadProducts, type ProductLoadResult } from "./supabase";
import "./styles.css";

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR"
});

function App() {
  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<GroceryProduct[]>(demoProducts);
  const [loadResult, setLoadResult] = useState<ProductLoadResult>({
    products: demoProducts,
    source: "demo",
    message: "Daten werden geladen."
  });
  const [activeProductId, setActiveProductId] = useState(demoProducts[0].id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(["milk_15", "butter_250", "pasta_500"]));

  useEffect(() => {
    let isMounted = true;

    loadProducts().then((result) => {
      if (!isMounted) return;
      setProducts(result.products);
      setLoadResult(result);
      setActiveProductId((current) => result.products.some((product) => product.id === current) ? current : result.products[0]?.id ?? "");
    });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return products;
    return products.filter(
      (product) =>
        product.name.toLowerCase().includes(normalized) ||
        product.category.toLowerCase().includes(normalized)
    );
  }, [products, query]);

  const activeProduct = products.find((product) => product.id === activeProductId) ?? products[0];
  const cheapest = activeProduct ? getCheapest(activeProduct) : undefined;
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

  if (!activeProduct || !cheapest) {
    return (
      <main className="empty-state">
        <BadgeEuro size={40} />
        <h1>Preisfuchs</h1>
        <p>Keine Produkte gefunden.</p>
      </main>
    );
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

        <div className={loadResult.source === "supabase" ? "data-status live" : "data-status"}>
          <DatabaseZap size={17} />
          <span>{loadResult.message}</span>
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
              <strong>{loadResult.source === "supabase" ? "Supabase verbunden" : "Demo-Modus"}</strong>
              <span>{loadResult.source === "supabase" ? "Live-Produkte aus deiner Datenbank" : "Browser-Key fehlt oder keine Daten"}</span>
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
