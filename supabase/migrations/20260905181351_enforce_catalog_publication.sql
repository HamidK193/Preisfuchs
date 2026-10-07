drop policy "published price observations are readable" on public.price_observations;
create policy "published price observations are readable" on public.price_observations
  for select to anon, authenticated using (
    is_public and price_basis = 'pack' and country_code = 'DE' and region = 'Baden-Württemberg'
    and exists (
      select 1 from public.catalog_articles a
      where a.id = article_id and a.review_status = 'verified'
    )
  );
