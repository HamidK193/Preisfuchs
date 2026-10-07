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
  Share2,
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
import {
  buildCartLines,
  buildSingleStorePlans,
  buildSplitPlan,
  filterProductsForComparison,
  getBestRetailerPrices,
  getCheapest,
  getFeaturedOffers,
  isObservationActive,
  normalizeRetailer,
  type Cart,
  type CartLine,
  type SingleStorePlan
} from "./comparison";
import { buildCartShareUrl, persistCart, readInitialCart } from "./cartShare";
import { loadProducts, type ProductLoadResult } from "./supabase";
import { loadNearbyStores, type StoreInfo } from "./stores";
import "./shop.css";

const currency = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR"
});

type StoreLoadState = "idle" | "loading" | "loaded" | "failed";

type AppView = "home" | "checkout";
type MainTab = "deals" | "products";
type RemovedCartItem = { productId: string; productName: string; quantity: number };

const featuredRetailers = ["Lidl", "Aldi Süd", "Rewe", "Edeka", "Kaufland"];

const sidebarLinks: Array<{ id: string; label: string; icon: LucideIcon; categoryId?: string }> = [
  { id: "home", label: "Startseite", icon: Home },
  { id: "all-products", label: "Alle Produkte", icon: ShoppingBag, categoryId: "all" },
  { id: "fruit", label: "Obst", icon: Apple, categoryId: "Obst" },
  { id: "vegetables", label: "Gemüse", icon: Leaf, categoryId: "Gemüse" },
  { id: "fresh", label: "Eier & Frische", icon: PackageCheck, categoryId: "Frische" },
  { id: "dairy", label: "Milchprodukte", icon: Milk, categoryId: "Molkerei" },
  { id: "baking", label: "Backen", icon: Wheat, categoryId: "Backen" },
  { id: "bakery", label: "Brot & Backwaren", icon: Croissant, categoryId: "Backwaren" },
  { id: "meat", label: "Fleisch & Wurst", icon: Store, categoryId: "Fleisch" },
  { id: "frozen", label: "Tiefkühlkost", icon: Sparkles, categoryId: "Tiefkühl" },
  { id: "drinks", label: "Getränke", icon: Wine, categoryId: "Getränke" },
  { id: "pasta", label: "Nudeln & Reis", icon: Wheat, categoryId: "Trockenware" },
  { id: "snacks", label: "Süßigkeiten & Snacks", icon: Tag, categoryId: "Süßigkeiten" },
  { id: "drugstore", label: "Drogerie & Haushalt", icon: PackageCheck, categoryId: "Drogerie" },
  { id: "baby", label: "Baby & Kind", icon: Baby, categoryId: "Baby" },
  { id: "pets", label: "Tierbedarf", icon: PawPrint, categoryId: "Tierbedarf" }
];

function App() {
  const [query, setQuery] = useState("");
  const [postcode, setPostcode] = useState("70173");
  const [radiusKm, setRadiusKm] = useState(5);
  const [products, setProducts] = useState<GroceryProduct[]>(demoProducts);
  const [stores, setStores] = useState<StoreInfo[]>([]);
  const [storeState, setStoreState] = useState<StoreLoadState>("idle");
  const [storeMessage, setStoreMessage] = useState("PLZ eingeben, um Märkte in der Nähe zu laden.");
  const [locationLabel, setLocationLabel] = useState("Ort");
  const [loadResult, setLoadResult] = useState<ProductLoadResult>({
    products: demoProducts,
    source: "demo",
    message: "Daten werden geladen."
  });
  const [activeCategoryId, setActiveCategoryId] = useState("all");
  const [onlyPriced, setOnlyPriced] = useState(true);
  const [activeProductId, setActiveProductId] = useState(demoProducts[0].id);
  const [cart, setCart] = useState<Cart>(readInitialCart);
  const [view, setView] = useState<AppView>(() =>
    new URLSearchParams(window.location.search).has("cart") ? "checkout" : "home"
  );
  const [activeTab, setActiveTab] = useState<MainTab>("deals");
  const [activeProductType, setActiveProductType] = useState<string | null>(null);
  const [includeAppDiscounts, setIncludeAppDiscounts] = useState(
    () => new URLSearchParams(window.location.search).get("app") === "1"
  );
  const [includePersonalizedDiscounts, setIncludePersonalizedDiscounts] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("app") === "1" && params.get("personalized") === "1";
  });
  const [shareFeedback, setShareFeedback] = useState("");
  const [removedCartItem, setRemovedCartItem] = useState<RemovedCartItem | null>(null);

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
        current === "all" || result.products.some((product) => product.category === current)
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
    if (normalizedPostcode.length !== 5) {
      setStores([]);
      setStoreState("idle");
      setLocationLabel("Ort");
      setStoreMessage("Vollständige 5-stellige PLZ eingeben, um Märkte in der Nähe zu laden.");
      return;
    }

    let isMounted = true;
    setStoreState("loading");
    setStoreMessage("Märkte und Öffnungszeiten werden geladen.");

    const timeout = window.setTimeout(() => {
      loadNearbyStores(normalizedPostcode, radiusKm)
        .then((result) => {
          if (!isMounted) return;
          setStores(result.stores);
          setLocationLabel(result.locationLabel);
          setStoreState("loaded");
          setStoreMessage(
            `${result.stores.length} ${result.stores.length === 1 ? "Markt" : "Märkte"} im Umkreis von ${radiusKm} km gefunden.`
          );
        })
        .catch((error: Error) => {
          if (!isMounted) return;
          setStores([]);
          setLocationLabel("Ort");
          setStoreState("failed");
          setStoreMessage(error.message);
        });
    }, 1_100);

    return () => {
      isMounted = false;
      window.clearTimeout(timeout);
    };
  }, [postcode, radiusKm]);

  useEffect(() => {
    persistCart(cart);
  }, [cart]);

  useEffect(() => {
    if (!removedCartItem) return;
    const timeout = window.setTimeout(() => setRemovedCartItem(null), 6_000);
    return () => window.clearTimeout(timeout);
  }, [removedCartItem]);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (includeAppDiscounts) url.searchParams.set("app", "1");
    else url.searchParams.delete("app");
    if (includeAppDiscounts && includePersonalizedDiscounts) url.searchParams.set("personalized", "1");
    else url.searchParams.delete("personalized");
    window.history.replaceState(window.history.state, "", url);
  }, [includeAppDiscounts, includePersonalizedDiscounts]);

  const comparisonProducts = useMemo(
    () => filterProductsForComparison(products, { includeAppDiscounts, includePersonalizedDiscounts }),
    [includeAppDiscounts, includePersonalizedDiscounts, products]
  );
  const catalogProducts = useMemo(
    () => onlyPriced
      ? comparisonProducts.filter((product) => getBestRetailerPrices(product, stores).length > 0)
      : comparisonProducts,
    [comparisonProducts, onlyPriced, stores]
  );
  const appDiscountCount = useMemo(
    () => products.reduce(
      (count, product) => count + product.prices.filter(
        (price) => price.requiresApp && !price.personalized && isObservationActive(price)
      ).length,
      0
    ),
    [products]
  );
  const personalizedDiscountCount = useMemo(
    () => products.reduce(
      (count, product) => count + product.prices.filter((price) => price.personalized && isObservationActive(price)).length,
      0
    ),
    [products]
  );

  const productCounts = useMemo(() => {
    const counts = new Map<string, number>();
    catalogProducts.forEach((product) => counts.set(product.category, (counts.get(product.category) ?? 0) + 1));
    return counts;
  }, [catalogProducts]);

  const categoryProducts = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (normalized) {
      return catalogProducts.filter(
        (product) =>
          product.name.toLowerCase().includes(normalized) ||
          product.category.toLowerCase().includes(normalized) ||
          product.packageSize.toLowerCase().includes(normalized) ||
          product.productType?.toLowerCase().includes(normalized) ||
          product.brand?.toLowerCase().includes(normalized)
      );
    }
    if (activeCategoryId === "all") return catalogProducts;
    return catalogProducts.filter((product) => product.category === activeCategoryId);
  }, [activeCategoryId, catalogProducts, query]);

  const productTypeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    categoryProducts.forEach((product) => {
      const productType = productTypeLabel(product);
      counts.set(productType, (counts.get(productType) ?? 0) + 1);
    });
    return Array.from(counts.entries()).map(([label, count]) => ({ label, count }));
  }, [categoryProducts]);

  const visibleProducts = useMemo(() => {
    if (query.trim() || activeCategoryId === "all" || !activeProductType) return categoryProducts;
    return categoryProducts.filter((product) => productTypeLabel(product) === activeProductType);
  }, [activeCategoryId, activeProductType, categoryProducts, query]);

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
    catalogProducts.find((product) => product.id === activeProductId) ?? visibleProducts[0] ?? comparisonProducts[0];
  const activeCategory = findCategory(activeCategoryId === "all" || query.trim() ? activeProduct?.category : activeCategoryId) ?? categories[0];
  const activePriceRows = useMemo(
    () => (activeProduct ? getBestRetailerPrices(activeProduct, stores) : []),
    [activeProduct, stores]
  );
  const cheapest = getCheapest(activePriceRows);
  const cartLines = useMemo(
    () => buildCartLines(cart, comparisonProducts, stores),
    [cart, comparisonProducts, stores]
  );
  const splitPlan = useMemo(() => buildSplitPlan(cartLines), [cartLines]);
  const singleStorePlans = useMemo(() => buildSingleStorePlans(cartLines, stores), [cartLines, stores]);
  const bestSingleStore = singleStorePlans[0];
  const featuredOffers = useMemo(() => getFeaturedOffers(catalogProducts, stores), [catalogProducts, stores]);
  const cartTotal = splitPlan.total;
  const splitSavings = bestSingleStore?.complete && splitPlan.complete
    ? Math.max(0, bestSingleStore.total - splitPlan.total)
    : 0;

  function chooseCategory(categoryId: string) {
    setQuery("");
    setView("home");
    setActiveTab("products");
    setActiveCategoryId(categoryId);
    const firstProduct = categoryId === "all"
      ? catalogProducts[0]
      : catalogProducts.find((product) => product.category === categoryId);
    if (firstProduct) setActiveProductId(firstProduct.id);
    if (firstProduct) setActiveProductType(productTypeLabel(firstProduct));
  }

  function addToCart(productId: string) {
    setCart((current) => ({ ...current, [productId]: Math.min(99, (current[productId] ?? 0) + 1) }));
  }

  function updateQuantity(productId: string, delta: number) {
    if (delta < 0 && (cart[productId] ?? 0) <= 1) {
      removeFromCart(productId);
      return;
    }
    setCart((current) => {
      const nextQuantity = Math.min(99, (current[productId] ?? 0) + delta);
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
    const quantity = cart[productId];
    if (!quantity) return;
    const productName = products.find((product) => product.id === productId)?.name ?? "Artikel";
    setRemovedCartItem({ productId, productName, quantity });
    setCart((current) => {
      const next = { ...current };
      delete next[productId];
      return next;
    });
  }

  function undoCartRemoval() {
    if (!removedCartItem) return;
    setCart((current) => ({
      ...current,
      [removedCartItem.productId]: Math.min(99, (current[removedCartItem.productId] ?? 0) + removedCartItem.quantity)
    }));
    setRemovedCartItem(null);
  }

  function toggleAppDiscounts() {
    if (includeAppDiscounts) setIncludePersonalizedDiscounts(false);
    setIncludeAppDiscounts((current) => !current);
  }

  async function shareCart() {
    if (!cartLines.length) {
      setShareFeedback("Lege zuerst mindestens ein Produkt in den Warenkorb.");
      return;
    }

    const url = buildCartShareUrl(cart, window.location.href, {
      includeAppDiscounts,
      includePersonalizedDiscounts
    });
    try {
      if (navigator.share) {
        await navigator.share({
          title: "Mein Preisfuchs-Warenkorb",
          text: "Vergleiche diesen gemeinsamen Einkaufszettel mit Preisfuchs.",
          url
        });
        setShareFeedback("Warenkorb wurde zum Teilen geöffnet.");
        return;
      }
      await navigator.clipboard.writeText(url);
      setShareFeedback("Warenkorb-Link wurde kopiert.");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setShareFeedback(`Kopiere diesen Link: ${url}`);
    }
  }

  if (!activeProduct) {
    return (
      <main className="empty-state">
        <FoxLogo />
        <h1>Preisfuchs</h1>
        <p>Im Katalog wurden keine Produkte gefunden.</p>
      </main>
    );
  }

  return (
    <main className="shop-shell">
      <a className="skip-link" href="#main-content">Zum Hauptinhalt</a>
      <aside className="sidebar" aria-label="Kategorien und Filter">
        <div className="brand-row">
          <div className="brand-mark">
            <FoxLogo />
          </div>
          <div>
            <h1>Preisfuchs</h1>
            <p>Dein Einkauf. Gut verglichen.</p>
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
                aria-pressed={isActive}
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
                <Icon size={19} aria-hidden="true" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>

        <section className="filter-panel" aria-label="Filter">
          <h2>Deine Auswahl</h2>
          <label className="catalog-filter">
            <input type="checkbox" checked={onlyPriced} onChange={(event) => setOnlyPriced(event.target.checked)} />
            Nur mit Preisbeobachtung
          </label>
          <div className="filter-row app-discount-filter">
            <BadgePercent size={18} aria-hidden="true" />
            <span>
              App-Rabatte
              <small>{appDiscountCount ? `${appDiscountCount} gefunden` : "mit Bedingungen"}</small>
            </span>
            <button
              aria-label="App-Rabatte ein- oder ausschalten"
              aria-pressed={includeAppDiscounts}
              className={includeAppDiscounts ? "filter-toggle active" : "filter-toggle"}
              onClick={toggleAppDiscounts}
              type="button"
            >
              <span />
            </button>
          </div>
          {includeAppDiscounts ? (
            <div className="filter-row personalized-discount-filter">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>
                Personalisierte Coupons
                <small>{personalizedDiscountCount ? `${personalizedDiscountCount} gemeldet` : "nur nach eigener Prüfung"}</small>
              </span>
              <button
                aria-label="Personalisierte Coupons ein- oder ausschalten"
                aria-pressed={includePersonalizedDiscounts}
                className={includePersonalizedDiscounts ? "filter-toggle active" : "filter-toggle"}
                onClick={() => setIncludePersonalizedDiscounts((current) => !current)}
                type="button"
              >
                <span />
              </button>
            </div>
          ) : null}
        </section>

        <div className={loadResult.source === "supabase" ? "data-source-card live" : "data-source-card"}>
          <ShieldCheck size={18} aria-hidden="true" />
          <strong>Datenquelle</strong>
          <span>Preisbeobachtungen aus offenen Quellen und dokumentierten Angebotsdaten.</span>
          <small>{loadResult.source === "demo" ? "Beispielpreise zum Ausprobieren. Keine aktuellen Angebote." : "Quelle und Datum stehen an jeder Preisbeobachtung."}</small>
          <small className="source-attribution">
            <a href="https://prices.openfoodfacts.org" rel="noreferrer" target="_blank">Open Prices</a>
            {" · "}
            <a href="https://www.openstreetmap.org/copyright" rel="noreferrer" target="_blank">© OpenStreetMap-Mitwirkende</a>
          </small>
        </div>
      </aside>

      <section className="shop-content" id="main-content" tabIndex={-1}>
        <header className="market-topbar">
          <label className="market-search">
            <input
              aria-label="Produkte suchen"
              autoComplete="off"
              name="product-search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setView("home");
                setActiveTab("products");
              }}
              placeholder="Produkte, Marken oder Kategorien suchen…"
              type="search"
            />
            <Search size={23} aria-hidden="true" />
          </label>

          <label className="top-select">
            <MapPin size={18} aria-hidden="true" />
            <input
              autoComplete="postal-code"
              name="postcode"
              value={postcode}
              onChange={(event) => setPostcode(event.target.value.replace(/\D/g, "").slice(0, 5))}
              inputMode="numeric"
              aria-label="Postleitzahl"
            />
            <span>{locationLabel}</span>
          </label>

          <label className="top-select radius">
            <select name="radius" value={radiusKm} onChange={(event) => setRadiusKm(Number(event.target.value))} aria-label="Umkreis">
              {[2, 5, 10, 15, 30].map((value) => (
                <option key={value} value={value}>{value} km</option>
              ))}
            </select>
          </label>

          <button
            aria-label={`Warenkorb: ${cartLines.length} Artikel, ${splitPlan.complete || !cartLines.length ? "Summe" : "Teilsumme"} ${currency.format(cartTotal)}`}
            className="topbar-cart-pill"
            onClick={() => setView("checkout")}
            type="button"
          >
            <ShoppingCart size={20} aria-hidden="true" />
            <span>Warenkorb</span>
            <strong>{cartLines.length && !splitPlan.complete ? <small>Teilsumme</small> : null}{currency.format(cartTotal)}</strong>
          </button>
        </header>

        <div className="catalog-status" role="status">
          <span className="status-dot" aria-hidden="true" />
          <strong>{loadResult.source === "demo" ? "Demo zum Ausprobieren" : "Beobachtete Preise"}</strong>
          <span>{loadResult.source === "demo" ? "Beispielpreise, keine aktuellen Angebote." : "Quelle und Datum stehen am Preis. Filialpreise können abweichen."}</span>
        </div>

        <div className={`store-lookup-status ${storeState}`} role="status" aria-live="polite">
          <MapPin size={16} aria-hidden="true" />
          <span>{storeMessage}</span>
        </div>

        <div className={includeAppDiscounts ? "app-discount-notice active" : "app-discount-notice"}>
          <BadgePercent size={19} aria-hidden="true" />
          <div>
            <strong>{includeAppDiscounts ? "Öffentliche App-Rabatte eingeschaltet" : "Vergleich ohne App-Rabatte"}</strong>
            <span>
              {includePersonalizedDiscounts ? "Personalisierte Coupons sind eingeschaltet. Prüfe, ob sie für dich gelten." : "Personalisierte Coupons sind ausgeschaltet."}
            </span>
          </div>
          <button onClick={toggleAppDiscounts} type="button">
            {includeAppDiscounts ? "Ohne App vergleichen" : "Mit App vergleichen"}
          </button>
          {includeAppDiscounts ? (
            <button className="mobile-coupon-toggle" aria-pressed={includePersonalizedDiscounts} onClick={() => setIncludePersonalizedDiscounts((current) => !current)} type="button">
              {includePersonalizedDiscounts ? "Persönliche Coupons ausschalten" : "Persönliche Coupons einschalten"}
            </button>
          ) : null}
        </div>

        {view === "checkout" ? (
          <CheckoutPage
            cartLines={cartLines}
            splitPlan={splitPlan}
            bestSingleStore={bestSingleStore}
            activeCategory={activeCategory}
            cartTotal={cartTotal}
            onShare={shareCart}
            shareFeedback={shareFeedback}
            onBack={() => setView("home")}
            onQuantity={updateQuantity}
            onRemove={removeFromCart}
          />
        ) : (
          <>
        {activeTab === "deals" && !query ? <section className="deal-hero">
          <div className="deal-hero-copy">
            <p className="section-label">Einkaufen in Baden-Württemberg</p>
            <h2>Dein Einkauf.<br /><span>Gut verglichen.</span></h2>
            <p>
              Was steht auf deinem Zettel? Vergleiche beobachtete Preise für deinen
              Einkauf – in einem Laden oder auf mehrere Märkte aufgeteilt.
            </p>
            <div className="hero-actions">
              <button onClick={() => chooseCategory("all")} type="button">
                Einkauf zusammenstellen <ArrowRight size={18} aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="hero-receipt" aria-label="Dein Einkaufszettel im Überblick">
            <ShoppingBag size={26} aria-hidden="true" />
            <span>DEIN EINKAUFSZETTEL</span>
            <strong>{cartLines.length ? `${cartLines.length} Artikel auf deinem Zettel` : "Was brauchst du heute?"}</strong>
            <div><span>Ein Laden</span><Store size={18} aria-hidden="true" /></div>
            <div><span>Mehrere Läden</span><span>↔</span></div>
            <p>Du entscheidest, was zu deinem Einkauf passt.</p>
          </div>
        </section> : null}

        <div className="retailer-coverage" aria-label="Händler und Preisabdeckung">
          <span>Deine Märkte</span>
          {featuredRetailers.map((retailer) => {
            const count = comparisonProducts.filter((product) => getBestRetailerPrices(product, stores).some((price) => normalizeRetailer(price.retailer) === normalizeRetailer(retailer))).length;
            return <div key={retailer}><RetailerBadge name={retailer} compact /><small>{count} Artikel mit {loadResult.source === "demo" ? "Demopreis" : "Beobachtung"}</small></div>;
          })}
        </div>

        <nav className="main-tabs" aria-label="Hauptbereiche">
          <button aria-pressed={activeTab === "deals"} className={activeTab === "deals" ? "active" : ""} onClick={() => setActiveTab("deals")} type="button">
            Prospekte & Deals
          </button>
          <button aria-pressed={activeTab === "products"} className={activeTab === "products" ? "active" : ""} onClick={() => setActiveTab("products")} type="button">
            Produkte
          </button>
          <button onClick={() => setView("checkout")} type="button">
            Einkauf vergleichen
          </button>
        </nav>

        {activeTab === "deals" ? (
          <section className="deal-tab-panel" aria-label="Prospekte und Deals">
            <div className="deal-carousel">
              {featuredOffers.slice(0, 5).map(({ product, price }) => (
                <article className="prospect-card" key={`${product.id}-${price.id}`}>
                  <div className="prospect-retailer">
                    <RetailerBadge name={price.retailer} logo />
                    <strong>{price.retailer}</strong>
                  </div>
                  <AppPriceBadge price={price} />
                  <img data-image-kind={product.imageKind} src={product.imageUrl ?? activeCategory.imageUrl} alt={product.name} loading="lazy" width="240" height="240" />
                  <h3>{product.name}</h3>
                  <span>{product.packageSize}</span>
                  <ProductImageCredit product={product} />
                  <div className="prospect-price">
                    <strong>{currency.format(price.price)}</strong>
                    {price.regularPrice ? <del>{currency.format(price.regularPrice)}</del> : (
                      price.offerType === "sale" ? <small>Angebot</small> : null
                    )}
                  </div>
                  <small><PriceSource price={price} /> · {formatDate(price.observedAt)}</small>
                  {freshnessText(price.observedAt).includes("veraltet") ? <small>Möglicherweise veraltet</small> : null}
                  {price.validUntil ? <small>Gültig bis {formatDate(price.validUntil)}</small> : null}
                  <button onClick={() => addToCart(product.id)} type="button">
                    <ShoppingCart size={17} aria-hidden="true" /> In den Warenkorb
                  </button>
                </article>
              ))}
            </div>
          </section>
        ) : null}

        <section className="shopping-layout">
          <div className="product-area">
            <section className="product-strip" aria-label={query ? "Suchergebnisse" : activeCategoryId === "all" ? "Alle Produkte" : `Produkte in ${activeCategory.label}`}>
              <div className="section-heading">
                <div>
                  <p className="section-label">{query ? "Suchergebnisse" : activeCategoryId === "all" ? "Gesamter Katalog" : activeCategory.label}</p>
                  <h3>{query || activeCategoryId === "all" ? `${visibleProducts.length} Produkte` : `${activeProductType ?? "Produkte"} auswählen`}</h3>
                </div>
                <label className="catalog-filter"><input type="checkbox" checked={onlyPriced} onChange={(event) => setOnlyPriced(event.target.checked)} /> Mit Preisbeobachtung</label>
              </div>

              {!query.trim() && activeCategoryId !== "all" && productTypeOptions.length > 1 ? (
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
                {!visibleProducts.length ? <div className="no-price-row"><strong>Hier fehlen noch passende Preise.</strong><p>Versuche einen anderen Suchbegriff oder zeige auch Produkte ohne Preis an.</p><button type="button" onClick={() => { setOnlyPriced(false); setActiveProductType(null); }}>Auch ohne Preis anzeigen</button></div> : null}
                {visibleProducts.map((product) => {
                  const price = getCheapest(getBestRetailerPrices(product, stores));
                  const quantity = cart[product.id] ?? 0;
                  return (
                    <article className={product.id === activeProduct.id ? "product-card active" : "product-card"} key={product.id}>
                      <button className="product-image-button" onClick={() => setActiveProductId(product.id)} type="button">
                        <img data-image-kind={product.imageKind} src={product.imageUrl ?? activeCategory.imageUrl} alt={product.name} loading="lazy" width="180" height="180" />
                      </button>
                      <div className="product-card-copy">
                        {product.brand ? <span className="brand-chip">{product.brand}</span> : null}
                        {product.reviewRequired ? <span className="identity-review">Artikelzuordnung ungeprüft</span> : null}
                        <h4>{product.name}</h4>
                        <small>{product.packageSize}</small>
                        <ProductImageCredit product={product} />
                      </div>
                      <div className="product-price-row">
                        <div>
                          <strong>{price ? currency.format(price.price) : "Keine Daten"}</strong>
                          {price?.regularPrice ? <del>{currency.format(price.regularPrice)}</del> : null}
                          {price?.unitPrice && price.unit ? <small>{currency.format(price.unitPrice)} / {price.unit}</small> : null}
                        </div>
                        {price ? (
                          <div className="product-price-source">
                            <RetailerBadge name={price.retailer} compact logo />
                            <AppPriceBadge price={price} compact />
                          </div>
                        ) : null}
                      </div>
                      {price ? <small className="product-observation"><PriceSource price={price} /> · {formatDate(price.observedAt)}{freshnessText(price.observedAt).includes("veraltet") ? " · möglicherweise veraltet" : ""}</small> : null}
                      {quantity ? (
                        <div className="quantity-stepper">
                          <button onClick={() => updateQuantity(product.id, -1)} type="button" aria-label={`${product.name} entfernen`}>
                            <Minus size={16} aria-hidden="true" />
                          </button>
                          <span>{quantity}</span>
                          <button onClick={() => updateQuantity(product.id, 1)} type="button" aria-label={`${product.name} hinzufügen`}>
                            <Plus size={16} aria-hidden="true" />
                          </button>
                        </div>
                      ) : (
                        <button className="add-button" onClick={() => addToCart(product.id)} type="button">
                          <ShoppingCart size={17} aria-hidden="true" /> In den Warenkorb
                        </button>
                      )}
                    </article>
                  );
                })}
              </div>
            </section>

            {visibleProducts.length ? <section className="comparison-panel">
              <div className="section-heading">
                <div>
                  <p className="section-label">Marktvergleich</p>
                  <h3>{activeProduct.name}: Preise und nächste Märkte</h3>
                </div>
                <Store size={22} aria-hidden="true" />
              </div>

              <div className="price-table">
                {activePriceRows.length ? activePriceRows
                  .slice()
                  .sort((a, b) => a.price - b.price)
                  .map((price, index) => (
                    <div className="price-row" key={price.id}>
                      <div className="rank">
                        {index === 0 ? <><CheckCircle2 size={20} aria-hidden="true" /><span className="sr-only">Günstigster Preis</span></> : index + 1}
                      </div>
                      <RetailerBadge name={price.retailer} logo />
                      <div className="store-copy">
                        <strong>{price.retailer}</strong>
                        {price.brandName ? (
                          <small>{price.brandType === "private_label" ? "Eigenmarke" : "Marke"}: {price.brandName}</small>
                        ) : null}
                        <span><MapPin size={14} aria-hidden="true" /> {price.locationSourceRef ? "Beobachteter Standort" : price.store ? `Nächste Filiale: ${price.store.name}` : "Keine passende Filiale geladen"}</span>
                        <small>{price.store?.address ?? price.storeLocation}</small>
                        <small><Clock3 size={13} aria-hidden="true" /> {price.store?.openingHours ?? "Öffnungszeiten nicht geladen"}</small>
                        {price.store ? <small className="price-scope-note">Preisbeobachtung ist nicht für diese Filiale bestätigt.</small> : null}
                        <AppPriceBadge price={price} />
                        {price.requiresApp && price.discountDescription ? <small>{price.discountDescription}</small> : null}
                        <small>Quelle: <PriceSource price={price} /> · beobachtet am {formatDate(price.observedAt)}</small>
                        {price.validUntil ? <small>Gültig bis {formatDate(price.validUntil)}</small> : null}
                      </div>
                      <div className="price-cell">
                        <strong>{currency.format(price.price)}</strong>
                        {price.regularPrice ? <del>{currency.format(price.regularPrice)}</del> : null}
                        {price.unitPrice && price.unit ? (
                          <span>{currency.format(price.unitPrice)} / {price.unit}</span>
                        ) : null}
                      </div>
                      <div className="freshness">
                        <CalendarClock size={15} aria-hidden="true" />
                        <span>{price.store ? `${price.store.distanceKm.toFixed(1)} km - ` : ""}{freshnessText(price.observedAt)}</span>
                      </div>
                    </div>
                  )) : (
                    <div className="no-price-row">
                      Für dieses Produkt gibt es in deinem Umkreis noch keine passende Preisbeobachtung.
                    </div>
                  )}
              </div>
            </section> : null}
          </div>

          <aside className="cart-panel compact-cart" id="checkout" aria-label="Warenkorb und Kasse">
            <div className="cart-panel-header">
              <div>
                <p className="section-label">Warenkorb</p>
                <h3>Dein Einkauf</h3>
                {!splitPlan.complete && cartLines.length ? <small className="subtotal-hint">Teilsumme · {splitPlan.missingCount} ohne Preis</small> : null}
              </div>
              <strong>{currency.format(cartTotal)}</strong>
            </div>

            <div className="cart-list">
              {cartLines.length ? cartLines.map((line) => (
                <div className="cart-item" key={line.product.id}>
                  <img data-image-kind={line.product.imageKind} src={line.product.imageUrl ?? activeCategory.imageUrl} alt="" loading="lazy" width="54" height="54" />
                  <div>
                    <strong>{line.product.name}</strong>
                    <span>{line.quantity} x {line.bestPrice ? currency.format(line.bestPrice.price) : "Keine Daten"}</span>
                    {line.bestPrice ? <small>{line.bestPrice.retailer} · <PriceSource price={line.bestPrice} /> · {formatDate(line.bestPrice.observedAt)}</small> : null}
                    <ProductImageCredit product={line.product} />
                  </div>
                  <div className="cart-item-actions">
                    <button onClick={() => updateQuantity(line.product.id, -1)} type="button" aria-label="Menge reduzieren">
                      <Minus size={15} aria-hidden="true" />
                    </button>
                    <span>{line.quantity}</span>
                    <button onClick={() => updateQuantity(line.product.id, 1)} type="button" aria-label="Menge erhöhen">
                      <Plus size={15} aria-hidden="true" />
                    </button>
                    <button onClick={() => removeFromCart(line.product.id)} type="button" aria-label="Artikel entfernen">
                      <Trash2 size={15} aria-hidden="true" />
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
                  <Store size={19} aria-hidden="true" />
                  <strong>Nur ein Laden</strong>
                </div>
                {bestSingleStore ? (
                  <>
                    <div className="checkout-total">
                      <RetailerBadge name={bestSingleStore.retailer} compact />
                      {bestSingleStore.locationLabel ? <small>{bestSingleStore.locationLabel}</small> : null}
                      <strong>{currency.format(bestSingleStore.total)}</strong>
                    </div>
                    <span>
                      {bestSingleStore.missingCount
                        ? `Nur Teilsumme: ${bestSingleStore.availableCount} von ${cartLines.length} Artikeln mit Preis`
                        : "Alle Artikel in einem Laden am günstigsten"}
                    </span>
                    {bestSingleStore.staleCount ? <span className="stale-comparison">{bestSingleStore.staleCount} Preise älter als 14 Tage</span> : null}
                  </>
                ) : (
                  <span>Keine Laden-Kombination berechenbar.</span>
                )}
              </article>

              <article className="checkout-card best">
                <div className="checkout-card-title">
                  <Tag size={19} aria-hidden="true" />
                  <strong>{splitPlan.complete ? "Maximal sparen" : "Vergleich unvollständig"}</strong>
                </div>
                <div className="checkout-total">
                  <span>{splitPlan.retailerCount} Läden</span>
                  <strong>{currency.format(splitPlan.total)}</strong>
                </div>
                {!splitPlan.complete && cartLines.length ? (
                  <span className="incomplete-comparison">Teilsumme für {splitPlan.availableCount} von {cartLines.length} Artikeln</span>
                ) : null}
                {splitPlan.staleCount ? <span className="stale-comparison">{splitPlan.staleCount} Preisbeobachtungen sind älter als 14 Tage</span> : null}
                {splitSavings > 0 ? (
                  <strong className="savings-difference">{currency.format(splitSavings)} günstiger als der beste vollständige Ein-Laden-Einkauf</strong>
                ) : null}
                <div className="split-list">
                  {splitPlan.rows.map((row) => (
                    <div key={row.product.id}>
                      <span>{row.product.name}</span>
                      <b>{row.price ? `${row.price.retailer} - ${currency.format(row.lineTotal ?? 0)}` : "Keine Daten"}</b>
                    </div>
                  ))}
                </div>
                {splitPlan.retailerCount > 1 ? <small className="travel-note">Fahrtkosten und zusätzliche Einkaufszeit sind nicht eingerechnet.</small> : null}
              </article>
            </div>

            <button className="checkout-button" onClick={() => setView("checkout")} type="button">
              Einkauf vergleichen <ArrowRight size={18} aria-hidden="true" />
            </button>

            <div className="trust-note">
              <ShieldCheck size={18} aria-hidden="true" />
              <span>Quellen und Aktualität bleiben sichtbar. Preisfuchs behauptet keine Live-Filialpreise.</span>
            </div>
          </aside>
        </section>
        </>
        )}
      </section>
      {removedCartItem ? (
        <div className="undo-toast" role="status" aria-live="polite">
          <span>{removedCartItem.productName} wurde entfernt.</span>
          <button onClick={undoCartRemoval} type="button">Rückgängig</button>
        </div>
      ) : null}
    </main>
  );
}

function CheckoutPage({
  cartLines,
  splitPlan,
  bestSingleStore,
  activeCategory,
  cartTotal,
  onShare,
  shareFeedback,
  onBack,
  onQuantity,
  onRemove
}: {
  cartLines: CartLine[];
  splitPlan: ReturnType<typeof buildSplitPlan>;
  bestSingleStore?: SingleStorePlan;
  activeCategory: { imageUrl: string };
  cartTotal: number;
  onShare: () => void;
  shareFeedback: string;
  onBack: () => void;
  onQuantity: (productId: string, delta: number) => void;
  onRemove: (productId: string) => void;
}) {
  const splitSavings = bestSingleStore?.complete && splitPlan.complete
    ? Math.max(0, bestSingleStore.total - splitPlan.total)
    : 0;
  const requiredApps = Array.from(new Set(
    cartLines
      .map((line) => line.bestPrice?.requiresApp ? line.bestPrice.appName ?? `${line.bestPrice.retailer}-App` : null)
      .filter((app): app is string => Boolean(app))
  ));

  return (
    <section className="checkout-page" aria-label="Einkaufsvergleich">
      <div className="checkout-hero">
        <div>
          <button onClick={onBack} type="button">Zurück zum Shop</button>
          <h2>So kannst du einkaufen</h2>
          <p>Vergleiche deinen Warenkorb als Ein-Laden-Einkauf oder als günstigste Aufteilung über mehrere Märkte.</p>
        </div>
        <div className="share-cart-actions">
          <button className="share-cart-button" onClick={onShare} type="button">
            <Share2 size={18} aria-hidden="true" /> Warenkorb teilen
          </button>
          <small>Jede Person mit dem Link sieht Produkt-IDs, Mengen und Rabattoptionen.</small>
        </div>
      </div>
      {shareFeedback ? <p className="share-feedback" role="status">{shareFeedback}</p> : null}

      <div className="checkout-page-grid">
        <article className="cart-panel checkout-cart">
          <div className="cart-panel-header">
            <div>
              <p className="section-label">Warenkorb</p>
              <h3>Dein Einkauf</h3>
              {!splitPlan.complete && cartLines.length ? <small className="subtotal-hint">Teilsumme · {splitPlan.missingCount} ohne Preis</small> : null}
            </div>
            <strong>{currency.format(cartTotal)}</strong>
          </div>

          <div className="cart-list">
            {cartLines.length ? cartLines.map((line) => (
              <div className="cart-item" key={line.product.id}>
                <img data-image-kind={line.product.imageKind} src={line.product.imageUrl ?? activeCategory.imageUrl} alt="" loading="lazy" width="54" height="54" />
                <div>
                  <strong>{line.product.name}</strong>
                  <span>{line.quantity} x {line.bestPrice ? currency.format(line.bestPrice.price) : "Keine Daten"}</span>
                  {line.bestPrice ? <small>{line.bestPrice.retailer} · <PriceSource price={line.bestPrice} /> · {formatDate(line.bestPrice.observedAt)}</small> : null}
                  <ProductImageCredit product={line.product} />
                </div>
                <div className="cart-item-actions">
                  <button onClick={() => onQuantity(line.product.id, -1)} type="button" aria-label="Menge reduzieren">
                    <Minus size={15} aria-hidden="true" />
                  </button>
                  <span>{line.quantity}</span>
                  <button onClick={() => onQuantity(line.product.id, 1)} type="button" aria-label="Menge erhöhen">
                    <Plus size={15} aria-hidden="true" />
                  </button>
                  <button onClick={() => onRemove(line.product.id)} type="button" aria-label="Artikel entfernen">
                    <Trash2 size={15} aria-hidden="true" />
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
              <Store size={20} aria-hidden="true" />
              <strong>Ein Laden</strong>
            </div>
            {bestSingleStore ? (
              <>
                <div className="savings-total">
                  <RetailerBadge name={bestSingleStore.retailer} logo />
                  {bestSingleStore.locationLabel ? <small>{bestSingleStore.locationLabel}</small> : null}
                  <strong>{currency.format(bestSingleStore.total)}</strong>
                </div>
                <span>
                  {bestSingleStore.missingCount
                    ? `Nur Teilsumme: ${bestSingleStore.availableCount} von ${cartLines.length} Artikeln mit Preis`
                    : "Alle Artikel in einem Laden am günstigsten"}
                </span>
                {bestSingleStore.staleCount ? <span className="stale-comparison">{bestSingleStore.staleCount} Preise älter als 14 Tage</span> : null}
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
              <Tag size={20} aria-hidden="true" />
              <strong>{splitPlan.complete ? "Maximal sparen" : "Vergleich unvollständig"}</strong>
            </div>
            <div className="savings-total">
              <span>{splitPlan.retailerCount} Läden</span>
              <strong>{currency.format(splitPlan.total)}</strong>
            </div>
            {!splitPlan.complete && cartLines.length ? (
              <span className="incomplete-comparison">Teilsumme für {splitPlan.availableCount} von {cartLines.length} Artikeln</span>
            ) : null}
            {splitPlan.staleCount ? <span className="stale-comparison">{splitPlan.staleCount} Preisbeobachtungen sind älter als 14 Tage</span> : null}
            {splitSavings > 0 ? (
              <strong className="savings-difference">Du sparst {currency.format(splitSavings)} gegenüber dem besten vollständigen Ein-Laden-Einkauf.</strong>
            ) : null}
            <div className="split-list">
              {splitPlan.rows.map((row) => (
                <div key={row.product.id}>
                  <span>{row.product.name}</span>
                  <b>{row.price ? `${row.price.retailer} - ${currency.format(row.lineTotal ?? 0)}` : "Keine Daten"}</b>
                </div>
              ))}
            </div>
            {splitPlan.retailerCount > 1 ? <small className="travel-note">Fahrtkosten und zusätzliche Einkaufszeit sind nicht eingerechnet.</small> : null}
          </article>
        </section>
      </div>
      {requiredApps.length ? (
        <div className="checkout-app-warning">
          <BadgePercent size={19} aria-hidden="true" />
          <span>Dieser Vergleich setzt {requiredApps.join(" und ")} voraus. Coupons vor dem Bezahlen prüfen und ggf. aktivieren.</span>
        </div>
      ) : null}
    </section>
  );
}

function PriceSource({ price }: { price: PriceObservation }) {
  return price.sourceDetail.startsWith("https://")
    ? <a href={price.sourceDetail} target="_blank" rel="noreferrer">{price.source}</a>
    : <>{price.source}</>;
}

function ProductImageCredit({ product }: { product: GroceryProduct }) {
  if (product.imageCredit) return <small className="image-credit">Foto: <a href={product.imageCredit.source_page} target="_blank" rel="noreferrer">{product.imageCredit.attribution}</a> · <a href={product.imageCredit.license_url} target="_blank" rel="noreferrer">{product.imageCredit.license}</a></small>;
  return product.imageKind === "symbol" ? <small>Symbolbild · kein Packungsfoto</small> : null;
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

function AppPriceBadge({ price, compact = false }: { price: PriceObservation; compact?: boolean }) {
  if (!price.requiresApp) return null;
  const appName = price.appName ?? `${price.retailer}-App`;
  const details = [
    price.couponActivationRequired ? "Coupon aktivieren" : null,
    price.personalized ? "kann personalisiert sein" : null
  ].filter(Boolean).join(" · ");
  return (
    <span className={compact ? "app-price-badge compact" : "app-price-badge"} title={details || `Nur mit ${appName}`}>
      <BadgePercent size={compact ? 12 : 14} aria-hidden="true" /> Nur mit {appName}
    </span>
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

function freshnessText(value: string) {
  const observed = new Date(value);
  const today = new Date();
  const msPerDay = 1000 * 60 * 60 * 24;
  const diff = Math.max(0, Math.floor((today.getTime() - observed.getTime()) / msPerDay));
  if (diff === 0) return "heute beobachtet";
  if (diff === 1) return "gestern beobachtet";
  if (diff > 14) return `vor ${diff} Tagen beobachtet · möglicherweise veraltet`;
  return `vor ${diff} Tagen beobachtet`;
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("de-DE", { day: "2-digit", month: "2-digit", year: "numeric" })
    .format(new Date(value));
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
