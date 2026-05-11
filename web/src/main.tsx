import { StrictMode, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import {
  ArrowRight,
  Apple,
  Baby,
  BadgePercent,
  CalendarClock,
  CheckCircle2,
  Clock3,
  Croissant,
  DatabaseZap,
  Home,
  Leaf,
  MapPin,
  Milk,
  Minus,
  Navigation,
  PackageCheck,
  PawPrint,
  Plus,
  Search,
  ShieldCheck,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Store,
  Tag,
  Trash2,
  Wheat,
  Wine,
  type LucideIcon
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

type Cart = Record<string, number>;

type CartLine = {
  product: GroceryProduct;
  quantity: number;
  bestPrice?: PriceWithStore;
};

type SingleStorePlan = {
  retailer: string;
  total: number;
  availableCount: number;
  missingCount: number;
  rows: Array<{
    product: GroceryProduct;
    quantity: number;
    price?: PriceWithStore;
    lineTotal?: number;
  }>;
};

type AppView = "home" | "checkout";
type MainTab = "deals" | "products";

const featuredRetailers = ["Lidl", "Aldi Süd", "Rewe", "Edeka", "Kaufland"];

const sidebarLinks: Array<{ id: string; label: string; icon: LucideIcon; categoryId?: string }> = [
  { id: "home", label: "Startseite", icon: Home },
  { id: "produce", label: "Obst & Gemüse", icon: Apple, categoryId: "Obst" },
  { id: "dairy", label: "Milchprodukte", icon: Milk, categoryId: "Molkerei" },
  { id: "bakery", label: "Backwaren", icon: Croissant, categoryId: "Backen" },
  { id: "fresh", label: "Fleisch & Wurst", icon: Store, categoryId: "Fleisch" },
  { id: "frozen", label: "Tiefkühlkost", icon: Sparkles, categoryId: "Tiefkühl" },
  { id: "drinks", label: "Getränke", icon: Wine, categoryId: "Getränke" },
  { id: "pasta", label: "Nudeln & Reis", icon: Wheat, categoryId: "Trockenware" },
  { id: "snacks", label: "Süßigkeiten & Snacks", icon: Tag, categoryId: "Süßigkeiten" },
  { id: "drugstore", label: "Drogerie & Haushalt", icon: PackageCheck, categoryId: "Drogerie" },
  { id: "baby", label: "Baby & Kind", icon: Baby, categoryId: "Baby" },
  { id: "pets", label: "Tierbedarf", icon: PawPrint, categoryId: "Tierbedarf" }
];

const filterOptions = [
  { id: "deals", label: "Angebote anzeigen", enabled: true, icon: BadgePercent },
  { id: "availability", label: "Nur Verfügbarkeit", enabled: false, icon: PackageCheck },
  { id: "bio", label: "Bio-Produkte", enabled: false, icon: Leaf },
  { id: "privateLabel", label: "Eigenmarken", enabled: false, icon: Store },
  { id: "nearby", label: "Nur in der Nähe", enabled: true, icon: MapPin }
];

function App() {
  const [query, setQuery] = useState("");
  const [postcode, setPostcode] = useState("70173");
  const [radiusKm, setRadiusKm] = useState(5);
  const [products, setProducts] = useState<GroceryProduct[]>(demoProducts);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [storeState, setStoreState] = useState<StoreLoadState>("idle");
  const [storeMessage, setStoreMessage] = useState("PLZ eingeben, um Märkte in der Nähe zu laden.");
  const [loadResult, setLoadResult] = useState<ProductLoadResult>({
    products: demoProducts,
    source: "demo",
    message: "Daten werden geladen."
  });
  const [activeCategoryId, setActiveCategoryId] = useState(categories[0].id);
  const [activeProductId, setActiveProductId] = useState(demoProducts[0].id);
  const [cart, setCart] = useState<Cart>({ bananas_1kg: 1, pears_1kg: 1, milk_15: 1, pasta_500: 1 });
  const [view, setView] = useState<AppView>("home");
  const [activeTab, setActiveTab] = useState<MainTab>("deals");
  const [activeProductType, setActiveProductType] = useState<string | null>(null);

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
        result.products.some((product) => product.category === current)
          ? current
          : result.products[0]?.category ?? categories[0].id
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
      setStoreMessage("PLZ eingeben, um Märkte in der Nähe zu laden.");
      return;
    }

    let isMounted = true;
    setStoreState("loading");
    setStoreMessage("Märkte und Öffnungszeiten werden geladen.");

    const timeout = window.setTimeout(() => {
      loadNearbyStores(normalizedPostcode, radiusKm)
        .then((loadedStores) => {
          if (!isMounted) return;
          setStores(loadedStores);
          setStoreState("loaded");
          setStoreMessage(`${loadedStores.length} Märkte im Umkreis von ${radiusKm} km gefunden.`);
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

  const pricedProducts = useMemo(() => products.filter((product) => product.prices.length > 0), [products]);

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    pricedProducts.forEach((product) => counts.set(product.category, (counts.get(product.category) ?? 0) + 1));
    return counts;
  }, [pricedProducts]);

  const categoryProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized) {
      return pricedProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(normalized) ||
          product.category.toLowerCase().includes(normalized) ||
          product.packageSize.toLowerCase().includes(normalized) ||
          product.productType?.toLowerCase().includes(normalized) ||
          product.brand?.toLowerCase().includes(normalized)
      );
    }
    return pricedProducts.filter((product) => product.category === activeCategoryId);
  }, [activeCategoryId, pricedProducts, query]);

  const productTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    categoryProducts.forEach((product) => {
      const productType = productTypeLabel(product);
      counts.set(productType, (counts.get(productType) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [categoryProducts]);

  const visibleProducts = useMemo(() => {
    if (query.trim() || !activeProductType) return categoryProducts;
    return categoryProducts.filter((product) => productTypeLabel(product) === activeProductType);
  }, [activeProductType, categoryProducts, query]);

  useEffect(() => {
    if (query.trim()) return;
    if (!productTypeOptions.length) {
      setActiveProductType(null);
      return;
    }
    if (!activeProductType || !productTypeOptions.some((option) => option.label === activeProductType)) {
      setActiveProductType(productTypeOptions[0].label);
    }
  }, [activeProductType, productTypeOptions, query]);

  useEffect(() => {
    if (!visibleProducts.length) return;
    if (!visibleProducts.some((product) => product.id === activeProductId)) {
      setActiveProductId(visibleProducts[0].id);
    }
  }, [activeProductId, visibleProducts]);

  const activeProduct =
    pricedProducts.find((product) => product.id === activeProductId) ?? visibleProducts[0] ?? pricedProducts[0];
  const activeCategory = findCategory(activeProduct?.category) ?? categories[0];
  const activePriceRows = useMemo(
    () => (activeProduct ? getBestRetailerPrices(activeProduct, stores) : []),
    [activeProduct, stores]
  );
  const cheapest = getCheapest(activePriceRows);
  const cartLines = useMemo(() => buildCartLines(cart, pricedProducts, stores), [cart, pricedProducts, stores]);
  const splitPlan = useMemo(() => buildSplitPlan(cartLines), [cartLines]);
  const singleStorePlans = useMemo(() => buildSingleStorePlans(cartLines, stores), [cartLines, stores]);
  const bestSingleStore = singleStorePlans[0];
  const featuredOffers = useMemo(() => getFeaturedOffers(pricedProducts, stores), [pricedProducts, stores]);
  const cartTotal = splitPlan.total;

  function chooseCategory(categoryId: string) {
    setQuery("");
    setView("home");
    setActiveTab("products");
    setActiveCategoryId(categoryId);
    const firstProduct = pricedProducts.find((product) => product.category === categoryId);
    if (firstProduct) setActiveProductId(firstProduct.id);
    if (firstProduct) setActiveProductType(productTypeLabel(firstProduct));
  }

  function addToCart(productId: string) {
    setCart((current) => ({ ...current, [productId]: (current[productId] ?? 0) + 1 }));
  }

  function updateQuantity(productId: string, delta: number) {
    setCart((current) => {
      const nextQuantity = (current[productId] ?? 0) + delta;
      const next = { ...current };
      if (nextQuantity <= 0) {
        delete next[productId];
      } else {
        next[productId] = nextQuantity;
      }
      return next;
    });
  }

  function removeFromCart(productId: string) {
    setCart((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  if (!activeProduct) {
    return (
      <main className="empty-state">
        <FoxLogo />
        <h1>Preisfuchs</h1>
        <p>Keine Produkte mit echten Preisbeobachtungen gefunden.</p>
      </main>
    );
  }

  return (
    <main className="shop-shell">
      <aside className="sidebar" aria-label="Kategorien und Filter">
        <div className="brand-row">
          <div className="brand-mark">
            <FoxLogo />
          </div>
          <div>
            <h1>Preisfuchs</h1>
            <p>Angebote vergleichen und Einkauf planen</p>
          </div>
        </div>

        <nav className="side-nav" aria-label="Shopbereiche">
          {sidebarLinks.map((item) => {
            const Icon = item.icon;
            const isActive =
              (item.id === "home" && view === "home" && activeTab === "deals") ||
              (item.categoryId ? activeCategoryId === item.categoryId && activeTab === "products" : false);
            return (
              <button
                className={isActive ? "side-nav-button active" : "side-nav-button"}
                key={item.id}
                onClick={() => {
                  if (item.id === "home") {
                    setView("home");
                    setActiveTab("deals");
                    setQuery("");
                    return;
                  }
                  if (item.categoryId) chooseCategory(item.categoryId);
                }}
                type="button"
              >
                <Icon size={19} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="filter-panel" aria-label="Filter">
          <h2>Filter</h2>
          {filterOptions.map((item) => {
            const Icon = item.icon;
            return (
              <div className="filter-row" key={item.id}>
                <Icon size={18} />
                <span>{item.label}</span>
                <button className={item.enabled ? "filter-toggle active" : "filter-toggle"} type="button">
                  <span />
                </button>
              </div>
            );
          })}
        </section>

        <div className={loadResult.source === "supabase" ? "data-source-card live" : "data-source-card"}>
          <ShieldCheck size={18} />
          <strong>Datenquelle</strong>
          <span>Preise aus Open Prices, kaufDA-Angeboten und Supabase.</span>
          <small>{loadResult.message}</small>
        </div>
      </aside>

      <section className="shop-content" aria-live="polite">
        <header className="market-topbar">
          <label className="market-search">
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setView("home");
                setActiveTab("products");
              }}
              placeholder="Produkte, Marken oder Kategorien suchen..."
              type="search"
            />
            <Search size={23} aria-hidden="true" />
          </label>

          <label className="top-select">
            <MapPin size={18} />
            <input
              value={postcode}
              onChange={(event) => setPostcode(event.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              aria-label="Postleitzahl"
            />
            <span>Stuttgart</span>
          </label>

          <label className="top-select radius">
            <select value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} aria-label="Umkreis">
              {[2, 5, 10, 15, 30].map((value) => (
                <option key={value} value={value}>{value} km</option>
              ))}
            </select>
          </label>

          <button className="topbar-cart-pill" onClick={() => setView("checkout")} type="button">
            <ShoppingCart size={20} />
            <span>Warenkorb</span>
            <strong>{currency.format(cartTotal)}</strong>
          </button>
        </header>

        {view === "checkout" ? (
          <CheckoutPage
            cartLines={cartLines}
            splitPlan={splitPlan}
            bestSingleStore={bestSingleStore}
            activeCategory={activeCategory}
            cartTotal={cartTotal}
            onBack={() => setView("home")}
            onQuantity={updateQuantity}
            onRemove={removeFromCart}
          />
        ) : (
          <>
        <section className="deal-hero">
          <div className="deal-hero-copy">
            <h3>Die besten Angebote</h3>
            <h4>aus deiner Nähe - diese Woche sparen!</h4>
            <p>
              Lege Bananen, Birnen, Milch und Co. in den Warenkorb. Preisfuchs zeigt dir den besten Laden oder
              die günstigste Aufteilung über mehrere Märkte.
            </p>
            <div className="hero-actions">
              <button onClick={() => setActiveTab("deals")} type="button">
                Alle Angebote ansehen
              </button>
            </div>
          </div>
          <div className="hero-produce">
            <img src={activeProduct.imageUrl ?? activeCategory.imageUrl} alt={activeProduct.name} />
            <div className="discount-tag">%</div>
          </div>
        </section>

        <div className="main-tabs" role="tablist" aria-label="Hauptbereiche">
          <button className={activeTab === "deals" ? "active" : ""} onClick={() => setActiveTab("deals")} type="button">
            Prospekte & Deals
          </button>
          <button className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")} type="button">
            Beliebte Produkte
          </button>
          <button onClick={() => setView("checkout")} type="button">
            Kasse & Sparoptionen
          </button>
        </div>

        {activeTab === "deals" ? (
          <section className="deal-tab-panel" aria-label="Prospekte und Deals">
            <div className="deal-carousel">
              {featuredOffers.slice(0, 5).map(({ product, price }) => (
                <article className="prospect-card" key={`${product.id}-${price.id}`}>
                  <div className="prospect-retailer">
                    <RetailerBadge name={price.retailer} logo />
                    <strong>{price.retailer}</strong>
                  </div>
                  <img src={product.imageUrl ?? activeCategory.imageUrl} alt={product.name} loading="lazy" />
                  <h3>{product.name}</h3>
                  <span>{product.packageSize}</span>
                  <div className="prospect-price">
                    <strong>{currency.format(price.price)}</strong>
                    <small>-{Math.max(10, Math.round((1 - price.price / (price.price + 0.4)) * 100))}%</small>
                  </div>
                  <small>Gültig bis {validUntilText(price.observedAt)}</small>
                  <button onClick={() => addToCart(product.id)} type="button">
                    <ShoppingCart size={17} /> In den Warenkorb
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="shopping-layout">
          <div className="product-area">
            <section className="product-strip" aria-label={query ? "Suchergebnisse" : `Produkte in ${activeCategory.label}`}>
              <div className="section-heading">
                <div>
                  <p className="section-label">{query ? "Suchergebnisse" : activeCategory.label}</p>
                  <h3>{query ? `${visibleProducts.length} Treffer` : `${activeProductType ?? "Produkte"} auswählen`}</h3>
                </div>
                <div className="product-sort-actions">
                  <button type="button">Sortieren: Beste Treffer</button>
                  <button type="button">Angebote zuerst</button>
                </div>
              </div>

              {!query.trim() && productTypeOptions.length > 1 ? (
                <div className="product-type-picker" aria-label="Produktart wählen">
                  {productTypeOptions.map((option) => (
                    <button
                      className={option.label === activeProductType ? "active" : ""}
                      key={option.label}
                      onClick={() => setActiveProductType(option.label)}
                      type="button"
                    >
                      <span>{option.label}</span>
                      <small>{option.count} Artikel</small>
                    </button>
                  ))}
                </div>
              ) : null}

              <div className="product-card-grid">
                {visibleProducts.map((product) => {
                  const price = getCheapest(getBestRetailerPrices(product, stores));
                  const quantity = cart[product.id] ?? 0;
                  return (
                    <article className={product.id === activeProduct.id ? "product-card active" : "product-card"} key={product.id}>
                      <button className="product-image-button" onClick={() => setActiveProductId(product.id)} type="button">
                        <img src={product.imageUrl ?? activeCategory.imageUrl} alt={product.name} loading="lazy" />
                      </button>
                      <div className="product-card-copy">
                        {product.brand ? <span className="brand-chip">{product.brand}</span> : null}
                        <h4>{product.name}</h4>
                        <small>{product.packageSize}</small>
                      </div>
                      <div className="product-price-row">
                        <div>
                          <strong>{price ? currency.format(price.price) : "Keine Daten"}</strong>
                          {price?.unitPrice && price.unit ? <small>{currency.format(price.unitPrice)} / {price.unit}</small> : null}
                        </div>
                        {price ? <RetailerBadge name={price.retailer} compact logo /> : null}
                      </div>
                      {quantity ? (
                        <div className="quantity-stepper">
                          <button onClick={() => updateQuantity(product.id, -1)} type="button" aria-label={`${product.name} entfernen`}>
                            <Minus size={16} />
                          </button>
                          <span>{quantity}</span>
                          <button onClick={() => updateQuantity(product.id, 1)} type="button" aria-label={`${product.name} hinzufügen`}>
                            <Plus size={16} />
                          </button>
                        </div>
                      ) : (
                        <button className="add-button" onClick={() => addToCart(product.id)} type="button">
                          <ShoppingCart size={17} /> In den Warenkorb
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="comparison-panel">
              <div className="section-heading">
                <div>
                  <p className="section-label">Marktvergleich</p>
                  <h3>{activeProduct.name}: Preise und Filialen</h3>
                </div>
                <Store size={22} aria-hidden="true" />
              </div>

              <div className="price-table">
                {activePriceRows.length ? activePriceRows
                  .slice()
                  .sort((a, b) => a.price - b.price)
                  .map((price, index) => (
                    <div className="price-row" key={price.id}>
                      <div className="rank">{index === 0 ? <CheckCircle2 size={20} /> : index + 1}</div>
                      <RetailerBadge name={price.retailer} logo />
                      <div className="store-copy">
                        <strong>{price.retailer}</strong>
                        <span><MapPin size={14} /> {price.store?.name ?? "Nächste passende Filiale"}</span>
                        <small>{price.store?.address ?? price.storeLocation}</small>
                        <small><Clock3 size={13} /> {price.store?.openingHours ?? "Öffnungszeiten nicht geladen"}</small>
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
                      Für dieses Produkt gibt es in deinem Umkreis noch keine passende Preisbeobachtung.
                    </div>
                  )}
              </div>
            </section>
          </div>

          <aside className="cart-panel compact-cart" id="checkout" aria-label="Warenkorb und Kasse">
            <div className="cart-panel-header">
              <div>
                <p className="section-label">Warenkorb</p>
                <h3>Dein Einkauf</h3>
              </div>
              <strong>{currency.format(cartTotal)}</strong>
            </div>

            <div className="cart-list">
              {cartLines.length ? cartLines.map((line) => (
                <div className="cart-item" key={line.product.id}>
                  <img src={line.product.imageUrl ?? activeCategory.imageUrl} alt="" loading="lazy" />
                  <div>
                    <strong>{line.product.name}</strong>
                    <span>{line.quantity} x {line.bestPrice ? currency.format(line.bestPrice.price) : "Keine Daten"}</span>
                    {line.bestPrice ? <small>{line.bestPrice.retailer} - {line.bestPrice.source}</small> : null}
                  </div>
                  <div className="cart-item-actions">
                    <button onClick={() => updateQuantity(line.product.id, -1)} type="button" aria-label="Menge reduzieren">
                      <Minus size={15} />
                    </button>
                    <span>{line.quantity}</span>
                    <button onClick={() => updateQuantity(line.product.id, 1)} type="button" aria-label="Menge erhöhen">
                      <Plus size={15} />
                    </button>
                    <button onClick={() => removeFromCart(line.product.id)} type="button" aria-label="Artikel entfernen">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              )) : (
                <div className="cart-empty">Füge Produkte hinzu, um den günstigsten Einkauf zu berechnen.</div>
              )}
            </div>

            <div className="checkout-options">
              <article className="checkout-card">
                <div className="checkout-card-title">
                  <Store size={19} />
                  <strong>Nur ein Laden</strong>
                </div>
                {bestSingleStore ? (
                  <>
                    <div className="checkout-total">
                      <RetailerBadge name={bestSingleStore.retailer} compact />
                      <strong>{currency.format(bestSingleStore.total)}</strong>
                    </div>
                    <span>
                      {bestSingleStore.missingCount
                        ? `${bestSingleStore.availableCount} von ${cartLines.length} Artikeln verfügbar`
                        : "Alle Artikel in einem Laden am günstigsten"}
                    </span>
                  </>
                ) : (
                  <span>Keine Laden-Kombination berechenbar.</span>
                )}
              </article>

              <article className="checkout-card best">
                <div className="checkout-card-title">
                  <Tag size={19} />
                  <strong>Maximal sparen</strong>
                </div>
                <div className="checkout-total">
                  <span>{splitPlan.retailerCount} Läden</span>
                  <strong>{currency.format(splitPlan.total)}</strong>
                </div>
                <div className="split-list">
                  {splitPlan.rows.map((row) => (
                    <div key={row.product.id}>
                      <span>{row.product.name}</span>
                      <b>{row.price ? `${row.price.retailer} - ${currency.format(row.lineTotal)}` : "Keine Daten"}</b>
                    </div>
                  ))}
                </div>
              </article>
            </div>

            <button className="checkout-button" type="button">
              Zur Kasse vergleichen <ArrowRight size={18} />
            </button>

            <div className="trust-note">
              <ShieldCheck size={18} />
              <span>Quellen und Aktualität bleiben sichtbar. Preisfuchs behauptet keine Live-Filialpreise.</span>
            </div>
          </aside>
        </section>
        </>
        )}
      </section>
    </main>
  );
}

function CheckoutPage({
  cartLines,
  splitPlan,
  bestSingleStore,
  activeCategory,
  cartTotal,
  onBack,
  onQuantity,
  onRemove
}: {
  cartLines: CartLine[];
  splitPlan: ReturnType<typeof buildSplitPlan>;
  bestSingleStore?: SingleStorePlan;
  activeCategory: { imageUrl: string };
  cartTotal: number;
  onBack: () => void;
  onQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
}) {
  return (
    <section className="checkout-page" aria-label="Kasse">
      <div className="checkout-hero">
        <button onClick={onBack} type="button">Zurück zum Shop</button>
        <h2>Kasse & Sparoptionen</h2>
        <p>Vergleiche deinen Warenkorb als Ein-Laden-Einkauf oder als günstigste Route über mehrere Märkte.</p>
      </div>

      <div className="checkout-page-grid">
        <article className="cart-panel checkout-cart">
          <div className="cart-panel-header">
            <div>
              <p className="section-label">Warenkorb</p>
              <h3>Dein Einkauf</h3>
            </div>
            <strong>{currency.format(cartTotal)}</strong>
          </div>

          <div className="cart-list">
            {cartLines.length ? cartLines.map((line) => (
              <div className="cart-item" key={line.product.id}>
                <img src={line.product.imageUrl ?? activeCategory.imageUrl} alt="" loading="lazy" />
                <div>
                  <strong>{line.product.name}</strong>
                  <span>{line.quantity} x {line.bestPrice ? currency.format(line.bestPrice.price) : "Keine Daten"}</span>
                  {line.bestPrice ? <small>{line.bestPrice.retailer} - {line.bestPrice.source}</small> : null}
                </div>
                <div className="cart-item-actions">
                  <button onClick={() => onQuantity(line.product.id, -1)} type="button" aria-label="Menge reduzieren">
                    <Minus size={15} />
                  </button>
                  <span>{line.quantity}</span>
                  <button onClick={() => onQuantity(line.product.id, 1)} type="button" aria-label="Menge erhöhen">
                    <Plus size={15} />
                  </button>
                  <button onClick={() => onRemove(line.product.id)} type="button" aria-label="Artikel entfernen">
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            )) : (
              <div className="cart-empty">Füge Produkte hinzu, um den günstigsten Einkauf zu berechnen.</div>
            )}
          </div>
        </article>

        <section className="savings-page-panel">
          <article className="savings-card single">
            <div className="checkout-card-title">
              <Store size={20} />
              <strong>Ein Laden</strong>
            </div>
            {bestSingleStore ? (
              <>
                <div className="savings-total">
                  <RetailerBadge name={bestSingleStore.retailer} logo />
                  <strong>{currency.format(bestSingleStore.total)}</strong>
                </div>
                <span>
                  {bestSingleStore.missingCount
                    ? `${bestSingleStore.availableCount} von ${cartLines.length} Artikeln verfügbar`
                    : "Alle Artikel in einem Laden am günstigsten"}
                </span>
                <div className="split-list">
                  {bestSingleStore.rows.map((row) => (
                    <div key={row.product.id}>
                      <span>{row.product.name}</span>
                      <b>{row.price ? currency.format(row.lineTotal ?? 0) : "fehlt"}</b>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <span>Keine Laden-Kombination berechenbar.</span>
            )}
          </article>

          <article className="savings-card best">
            <div className="checkout-card-title">
              <Tag size={20} />
              <strong>Maximal sparen</strong>
            </div>
            <div className="savings-total">
              <span>{splitPlan.retailerCount} Läden</span>
              <strong>{currency.format(splitPlan.total)}</strong>
            </div>
            <div className="split-list">
              {splitPlan.rows.map((row) => (
                <div key={row.product.id}>
                  <span>{row.product.name}</span>
                  <b>{row.price ? `${row.price.retailer} - ${currency.format(row.lineTotal)}` : "Keine Daten"}</b>
                </div>
              ))}
            </div>
          </article>
        </section>
      </div>
    </section>
  );
}

function FoxLogo() {
  return (
    <svg className="fox-logo" viewBox="0 0 64 64" role="img" aria-label="Preisfuchs Logo">
      <path className="fox-ear" d="M12 7l16 9-15 13z" />
      <path className="fox-ear right" d="M52 7l-16 9 15 13z" />
      <path className="fox-head" d="M10 25l12-11 10 5 10-5 12 11-6 21-16 11-16-11z" />
      <path className="fox-face" d="M19 31l13 21 13-21-13 5z" />
      <path className="fox-muzzle" d="M25 43h14l-7 9z" />
      <circle cx="24" cy="32" r="2.4" />
      <circle cx="40" cy="32" r="2.4" />
      <path className="fox-nose" d="M28 42h8l-4 4z" />
    </svg>
  );
}

function RetailerBadge({ name, compact = false, logo = false }: { name: string; compact?: boolean; logo?: boolean }) {
  const brand = retailerBrand(name);
  return (
    <div className={`${compact ? "retailer-badge compact" : "retailer-badge"} ${logo ? "logo" : ""} ${brand.className}`}>
      {brand.label}
    </div>
  );
}

function retailerBrand(name: string) {
  const normalized = normalizeRetailer(name);
  if (normalized.includes("lidl")) return { label: "Lidl", className: "lidl" };
  if (normalized.includes("rewe")) return { label: "REWE", className: "rewe" };
  if (normalized.includes("edeka")) return { label: "EDEKA", className: "edeka" };
  if (normalized.includes("kaufland")) return { label: "Kaufland", className: "kaufland" };
  if (normalized.includes("aldi")) return { label: "ALDI SÜD", className: "aldi" };
  return { label: name, className: "generic" };
}

function productTypeLabel(product: GroceryProduct) {
  return product.productType || product.category || "Produkte";
}

function findCategory(categoryId?: string) {
  if (!categoryId) return undefined;
  return categories.find((category) => category.id === categoryId || normalizeFilterKey(category.id) === normalizeFilterKey(categoryId));
}

function normalizeFilterKey(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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

function getBestRetailerPrices(product: GroceryProduct, stores: StoreInfo[]) {
  const displayPrices = getDisplayPrices(product, stores);
  const sourcePrices = displayPrices.length ? displayPrices : product.prices;
  const bestByRetailer = new Map<string, PriceWithStore>();

  sourcePrices.forEach((price) => {
    const key = normalizeRetailer(price.retailer);
    const current = bestByRetailer.get(key);
    if (!current || price.price < current.price) {
      bestByRetailer.set(key, price);
    }
  });

  return Array.from(bestByRetailer.values());
}

function buildCartLines(cart: Cart, products: GroceryProduct[], stores: StoreInfo[]): CartLine[] {
  return Object.entries(cart)
    .map<CartLine | null>(([productId, quantity]) => {
      const product = products.find((item) => item.id === productId);
      if (!product || quantity <= 0) return null;
      return {
        product,
        quantity,
        bestPrice: getCheapest(getBestRetailerPrices(product, stores))
      };
    })
    .filter((line): line is CartLine => line !== null);
}

function buildSplitPlan(cartLines: CartLine[]) {
  const rows = cartLines.map((line) => ({
    product: line.product,
    quantity: line.quantity,
    price: line.bestPrice,
    lineTotal: (line.bestPrice?.price ?? 0) * line.quantity
  }));
  const retailers = new Set(rows.map((row) => row.price?.retailer).filter(Boolean));

  return {
    rows,
    total: rows.reduce((sum, row) => sum + row.lineTotal, 0),
    retailerCount: retailers.size
  };
}

function buildSingleStorePlans(cartLines: CartLine[], stores: StoreInfo[]): SingleStorePlan[] {
  const retailerKeys = new Set<string>();
  cartLines.forEach((line) => {
    getBestRetailerPrices(line.product, stores).forEach((price) => retailerKeys.add(normalizeRetailer(price.retailer)));
  });

  return Array.from(retailerKeys)
    .map((retailerKey) => {
      const rows = cartLines.map((line) => {
        const price = getBestRetailerPrices(line.product, stores).find((candidate) =>
          sameRetailer(candidate.retailer, retailerKey)
        );
        return {
          product: line.product,
          quantity: line.quantity,
          price,
          lineTotal: price ? price.price * line.quantity : undefined
        };
      });
      const availableRows = rows.filter((row) => row.price);
      return {
        retailer: availableRows[0]?.price?.retailer ?? retailerKey,
        total: availableRows.reduce((sum, row) => sum + (row.lineTotal ?? 0), 0),
        availableCount: availableRows.length,
        missingCount: rows.length - availableRows.length,
        rows
      };
    })
    .sort((a, b) => {
      if (a.missingCount !== b.missingCount) return a.missingCount - b.missingCount;
      return a.total - b.total;
    });
}

function getFeaturedOffers(products: GroceryProduct[], stores: StoreInfo[]) {
  return products
    .map((product) => ({ product, price: getCheapest(getBestRetailerPrices(product, stores)) }))
    .filter((item): item is { product: GroceryProduct; price: PriceWithStore } => Boolean(item.price))
    .sort((a, b) => {
      const sourceScore = Number(b.price.source.toLowerCase().includes("angebot")) - Number(a.price.source.toLowerCase().includes("angebot"));
      return sourceScore || a.price.price - b.price.price;
    })
    .slice(0, 6);
}

function getCheapest<T extends PriceObservation>(prices: T[]): T | undefined {
  return prices.slice().sort((a, b) => a.price - b.price)[0];
}

function sameRetailer(left: string, right: string) {
  return normalizeRetailer(left) === normalizeRetailer(right);
}

function normalizeRetailer(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\u00c3\u00bc/g, "u")
    .replace(/\u00c3\u0178/g, "ss")
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  if (normalized.includes("aldi")) return "aldi";
  if (normalized.includes("lidl")) return "lidl";
  if (normalized.includes("rewe")) return "rewe";
  if (normalized.includes("edeka") || normalized.includes("e center")) return "edeka";
  if (normalized.includes("kaufland")) return "kaufland";
  return normalized;
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

function validUntilText(value: string) {
  const date = new Date(value);
  date.setDate(date.getDate() + 5);
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit" }).format(date);
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
