import { useEffect, useMemo, useRef, useState } from 'react';
import { catalogProducts, products, type Product } from '@/data/products';
import { CATALOG_LIMIT, CATALOG_PAGE_SIZE, loadCatalogPage, mergeCatalog, searchCatalog } from '@/lib/catalog';
import { useAppState } from '@/state/app-state';

export function useCatalogSearch(query: string) {
  const { priceData } = useAppState();
  const local = useMemo(() => {
    return searchCatalog(catalogProducts, query);
    // catalog is updated by the provider before priceData changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [query, priceData]);
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      const start = performance.now();
      searchCatalog(catalogProducts, query);
      if (performance.now() - start >= 100) setSlow(true);
    }, 0);
    return () => clearTimeout(timer);
  }, [query, priceData]);
  const server = slow || catalogProducts.length >= CATALOG_LIMIT;
  const [remote, setRemote] = useState<Product[]>([]);
  const [remoteQuery, setRemoteQuery] = useState<string>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const request = useRef(0), page = useRef(0), busy = useRef(false);
  const fetchPage = async (next: number, token: number) => {
    busy.current = true; setLoading(true); setError(false);
    try {
      const batch = await loadCatalogPage(next, query);
      if (token !== request.current) return;
      const gtins = new Set(batch.map((p) => p.gtin));
      const joined = mergeCatalog(batch, products.filter((p) => gtins.has(p.gtin)));
      const known = new Set(catalogProducts.map((p) => p.id));
      catalogProducts.push(...joined.filter((p) => !known.has(p.id)));
      setRemote((old) => next === 0 ? joined : [...old, ...joined]);
      setRemoteQuery(query);
      page.current = next; setHasMore(batch.length === CATALOG_PAGE_SIZE);
    } catch {
      if (token === request.current) { setRemoteQuery(query); setError(true); setHasMore(false); }
    } finally {
      if (token === request.current) { busy.current = false; setLoading(false); }
    }
  };
  useEffect(() => {
    const token = ++request.current;
    if (!server) return;
    busy.current = true;
    const timer = setTimeout(() => { page.current = 0; setRemote([]); setHasMore(false); void fetchPage(0, token); }, 150);
    return () => { clearTimeout(timer); };
    // Tokens discard late results for an old query.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [server, query, priceData]);
  const matching = remoteQuery === query;
  return { items: server ? matching ? error ? local : remote : [] : local,
    server, loading: server && (!matching || loading), error: matching && error, hasMore: matching && hasMore,
    loadMore: () => { if (server && matching && hasMore && !busy.current) void fetchPage(page.current + 1, request.current); } };
}
