import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  BadgeEuro,
  CalendarClock,
  CheckCircle2,
  Clock3,
  DatabaseZap,
  ExternalLink,
  ListChecks,
  MapPin,
  Navigation,
  Search,
  ShieldCheck,
  ShoppingCart,
  SlidersHorizontal,
  Store,
  Tag
} from "lucide-react";
import { categories, demoProducts, type GroceryProduct, type PriceObservation } from "./data";
import { loadProducts, type ProductLoadResult } from "./supabase";
import { findNearestStore, loadNearbyStores, type StoreInfo } from "./stores";
import "./styles.css";

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR"
});

type StoreLoadState = "idle" | "loading" | "loaded" | "failed";

type PriceWithStore = PriceObservation & {
  store?: StoreInfo;
};

function App() {
  const [query, setQuery] = useState("");
  const [postcode, setPostcode] = useState("70173");
  const [radiusKm, setRadiusKm] = useState(5);
  const [products, setProducts] = useState<GroceryProduct[]>(demoProducts);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [storeState, setStoreState] = useState<StoreLoadState>("idle");
  const [storeMessage, setStoreMessage] = useState("PLZ eingeben, um Maerkte in der Naehe zu laden.");
  const [loadResult, setLoadResult] = useState<ProductLoadResult>({
    products: demoProducts,
    source: "demo",
    message: "Daten werden geladen."
  });
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0].id);
  const [activeProductId, setActiveProductId] = useState(demoProducts[0].id);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(["milk_15", "butter_250", "pasta_500"]));

  useEffect(() => {
    let isMounted = true;

    loadProducts().then((result) => {
      if (!isMounted) return;
      setProducts(result.products);
      setLoadResult(result);
      setActiveProductId((current) =>
        result.products.some((product) => product.id === current) ? current : result.products[0]?.id ?? ""
      );
      setActiveCategoryId((current) =>
        result.products.some((product) => product.category === current) ? current : result.products[0]?.category ?? categories[0].id
      );
    });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const normalizedPostcode = postcode.trim();
    if (normalizedPostcode.length < 4) {
      setStores([]);
      setStoreState("idle");
      setStoreMessage("PLZ eingeben, um Maerkte in der Naehe zu laden.");
      return;
    }

    let isMounted = true;
    setStoreState("loading");
    setStoreMessage("Maerkte und Oeffnungszeiten werden geladen.");

    const timeout = window.setTimeout(() => {
      loadNearbyStores(normalizedPostcode, radiusKm)
        .then((loadedStores) => {
          if (!isMounted) return;
          setStores(loadedStores);
          setStoreState("loaded");
          setStoreMessage(`${loadedStores.length} Maerkte im Umkreis von ${radiusKm} km gefunden.`);
        })
        .catch((error: Error) => {
          if (!isMounted) return;
          setStores([]);
          setStoreState("failed");
          setStoreMessage(error.message);
        });
    }, 450);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [postcode, radiusKm]);

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    products.forEach((product) => counts.set(product.category, (counts.get(product.category) ?? 0) + 1));
    return counts;
  }, [products]);

  const visibleProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized) {
      return products.filter(
        (product) =>
          product.name.toLowerCase().includes(normalized) ||
          product.category.toLowerCase().includes(normalized)
      );
    }
    return products.filter((product) => product.category === activeCategoryId);
  }, [activeCategoryId, products, query]);

  useEffect(() => {
    if (!visibleProducts.length) return;
    if (!visibleProducts.some((product) => product.id === activeProductId)) {
      setActiveProductId(visibleProducts[0].id);
    }
  }, [activeProductId, visibleProducts]);

  const activeProduct = products.find((product) => product.id === activeProductId) ?? visibleProducts[0] ?? products[0];
  const activeCategory = categories.find((category) => category.id === activeProduct?.category) ?? categories[0];
  const activePrices = useMemo(() => getDisplayPrices(activeProduct, stores), [activeProduct, stores]);
  const cheapest = getCheapest(activePrices);
  const selectedProducts = products.filter((product) => selectedIds.has(product.id));
  const basketTotal = selectedProducts.reduce((sum, product) => sum + (getCheapest(getDisplayPrices(product, stores))?.price ?? 0), 0);
  const nearestStoreCount = stores.length;

  function chooseCategory(categoryId: string) {
    setQuery("");
    setActiveCategoryId(categoryId);
    const firstProduct = products.find((product) => product.category === categoryId);
    if (firstProduct) setActiveProductId(firstProduct.id);
  }

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

  if (!activeProduct) {
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
      <aside className="sidebar" aria-label="Kategorien">
        <div className="brand-row">
          <div className="brand-mark">
            <BadgeEuro size={24} aria-hidden="true" />
          </div>
          <div>
            <h1>Preisfuchs</h1>
            <p>Lebensmittelpreise in deiner Naehe</p>
          </div>
        </div>

        <div className={loadResult.source === "supabase" ? "data-status live" : "data-status"}>
          <DatabaseZap size={17} />
          <span>{loadResult.message}</span>
        </div>

        <section className="location-card" aria-label="Standortfilter">
          <div className="location-heading">
            <SlidersHorizontal size={18} />
            <strong>Standortfilter</strong>
          </div>

          <label className="field-label">
            Postleitzahl
            <input
              value={postcode}
              onChange={(event) => setPostcode(event.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              placeholder="z.B. 70173"
              type="text"
            />
          </label>

          <label className="field-label">
            Umkreis: {radiusKm} km
            <input
              value={radiusKm}
              min={1}
              max={30}
              step={1}
              onChange={(event) => setRadiusKm(Number(event.target.value))}
              type="range"
            />
          </label>

          <div className={`store-status ${storeState}`}>
            <Navigation size={15} />
            <span>{storeMessage}</span>
          </div>
        </section>

        <label className="search-field">
          <Search size={18} aria-hidden="true" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Lebensmittel suchen"
            type="search"
          />
        </label>

        <nav className="category-list" aria-label="Produktkategorien">
          {categories.map((category) => {
            const count = productCounts.get(category.id) ?? 0;
            return (
              <button
                className={activeCategoryId === category.id && !query ? "category-button active" : "category-button"}
                key={category.id}
                onClick={() => chooseCategory(category.id)}
                type="button"
              >
                <img src={category.imageUrl} alt="" loading="lazy" />
                <span>
                  <strong>{category.label}</strong>
                  <small>{count} Produkte</small>
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      <section className="content" aria-live="polite">
        <header className="topbar">
          <div>
            <h2>Lebensmittel clever vergleichen</h2>
            <p className="topbar-subtitle">
              {postcode ? `PLZ ${postcode} - ${radiusKm} km - ${nearestStoreCount} Maerkte gefunden` : "Standortfilter aktivieren"}
            </p>
          </div>
          <a className="source-link" href="https://prices.openfoodfacts.org" target="_blank" rel="noreferrer">
            Datenquelle <ExternalLink size={16} />
          </a>
        </header>

        <section
          className="active-product-hero"
          style={{ borderColor: `${activeProduct.accentColor ?? activeCategory.accentColor}55` }}
        >
          <div className="product-hero-copy">
            <span>{activeCategory.label}</span>
            <h3>{activeProduct.name}</h3>
            <p>{activeProduct.packageSize} - Preise aus Angeboten und Preisbeobachtungen in Baden-Wuerttemberg.</p>
            <div className="hero-price">
              <small>Guensigster Preis</small>
              <strong>{cheapest ? currency.format(cheapest.price) : "offen"}</strong>
            </div>
          </div>
          <img src={activeProduct.imageUrl ?? activeCategory.imageUrl} alt={activeProduct.name} />
        </section>

        <section className="product-strip" aria-label={query ? "Suchergebnisse" : `Produkte in ${activeCategory.label}`}>
          <div className="strip-heading">
            <div>
              <p className="section-label">{query ? "Suchergebnisse" : activeCategory.label}</p>
              <h3>{query ? `${visibleProducts.length} Treffer` : "Produkte auswaehlen"}</h3>
            </div>
          </div>

          <div className="product-card-grid">
            {visibleProducts.map((product) => {
              const price = getCheapest(getDisplayPrices(product, stores));
              return (
                <button
                  className={product.id === activeProduct.id ? "product-card active" : "product-card"}
                  key={product.id}
                  onClick={() => setActiveProductId(product.id)}
                  type="button"
                >
                  <img src={product.imageUrl ?? activeCategory.imageUrl} alt="" loading="lazy" />
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.packageSize}</small>
                  </span>
                  <b>{price ? currency.format(price.price) : "offen"}</b>
                </button>
              );
            })}
          </div>
        </section>

        <section className="summary-grid">
          <article className="best-price-panel">
            <div className="panel-icon">
              <Tag size={24} aria-hidden="true" />
            </div>
            <div>
              <p>Bester Preis in deinem Umkreis</p>
              <strong>{cheapest ? currency.format(cheapest.price) : "offen"}</strong>
              <span>{cheapest ? `${cheapest.retailer} - ${cheapest.store?.distanceKm.toFixed(1) ?? "?"} km` : "Noch keine passende Preisbeobachtung"}</span>
            </div>
          </article>

          <article className="trust-panel">
            <ShieldCheck size={22} aria-hidden="true" />
            <div>
              <strong>Quelle sichtbar</strong>
              <span>{cheapest ? `${cheapest.source} - ${freshnessText(cheapest.observedAt)}` : "Wird angezeigt, sobald Preise vorliegen"}</span>
            </div>
          </article>

          <article className="trust-panel">
            <Store size={22} aria-hidden="true" />
            <div>
              <strong>Filialdaten</strong>
              <span>{storeState === "loaded" ? "Adresse und Oeffnungszeiten aus OpenStreetMap" : "Wird ueber PLZ geladen"}</span>
            </div>
          </article>
        </section>

        <section className="comparison-layout">
          <article className="comparison-panel">
            <div className="panel-heading">
              <div>
                <p className="section-label">Marktvergleich</p>
                <h3>Preise, Filialen und Oeffnungszeiten</h3>
              </div>
              <Store size={22} aria-hidden="true" />
            </div>

            <div className="price-table">
              {activePrices.length ? activePrices
                .slice()
                .sort((a, b) => a.price - b.price)
                .map((price, index) => (
                  <div className="price-row" key={price.id}>
                    <div className="rank">{index === 0 ? <CheckCircle2 size={20} /> : index + 1}</div>
                    <div className="store-copy">
                      <strong>{price.retailer}</strong>
                      <span><MapPin size={14} /> {price.store?.name ?? "Filiale wird geladen"}</span>
                      <small>{price.store?.address ?? price.storeLocation}</small>
                      <small><Clock3 size={13} /> {price.store?.openingHours ?? "Oeffnungszeiten nicht geladen"}</small>
                    </div>
                    <div className="price-cell">
                      <strong>{currency.format(price.price)}</strong>
                      {price.unitPrice && price.unit ? (
                        <span>{currency.format(price.unitPrice)} / {price.unit}</span>
                      ) : null}
                    </div>
                    <div className="freshness">
                      <CalendarClock size={15} />
                      <span>{price.store ? `${price.store.distanceKm.toFixed(1)} km - ` : ""}{freshnessText(price.observedAt)}</span>
                    </div>
                  </div>
                )) : (
                  <div className="no-price-row">
                    Fuer dieses Produkt gibt es in deinem Umkreis noch keine passende Preisbeobachtung. Erhoehe den Radius oder probiere eine andere PLZ.
                  </div>
                )}
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
              {visibleProducts.map((product) => {
                const price = getCheapest(getDisplayPrices(product, stores));
                return (
                  <button className="basket-item" key={product.id} onClick={() => toggleProduct(product.id)} type="button">
                    <ListChecks size={18} className={selectedIds.has(product.id) ? "selected" : ""} />
                    <span>{product.name}</span>
                    <b>{price ? currency.format(price.price) : "offen"}</b>
                  </button>
                );
              })}
            </div>
          </article>
        </section>
      </section>
    </main>
  );
}

function getDisplayPrices(product: GroceryProduct, stores: StoreInfo[]): PriceWithStore[] {
  if (!stores.length) {
    return product.prices;
  }

  return product.prices
    .map((price) => ({
      ...price,
      store: findNearestStore(price.retailer, stores)
    }))
    .filter((price) => Boolean(price.store));
}

function getCheapest<T extends PriceObservation>(prices: T[]) {
  return prices.slice().sort((a, b) => a.price - b.price)[0];
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
