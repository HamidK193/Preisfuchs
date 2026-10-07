-- 2026-10-07: Community price reports without an account.
-- Written only by the Edge Function "report-price" (service role); never readable
-- or writable with the anon key. Reporter identity is stored as salted hashes only.
create table if not exists public.price_reports (
  id uuid primary key default gen_random_uuid(),
  gtin text not null check (gtin ~ '^[0-9]{8,14}$'),
  store_id uuid not null references public.stores(id),
  retailer_id text not null references public.retailers(id),
  product_name text check (char_length(product_name) <= 200),
  price numeric(10, 2) not null check (price > 0 and price < 1000),
  is_offer boolean not null default false,
  valid_until date,
  observed_on date not null default current_date,
  photo_path text,
  device_hash text not null,
  ip_hash text not null,
  status text not null default 'pending'
    check (status in ('pending', 'confirmed', 'needs_review', 'rejected')),
  status_reason text,
  observation_id uuid references public.price_observations(id),
  created_at timestamptz not null default now()
);
create index if not exists idx_price_reports_match
  on public.price_reports(gtin, store_id, observed_on) where status in ('pending', 'confirmed');
create index if not exists idx_price_reports_device on public.price_reports(device_hash, created_at);
create index if not exists idx_price_reports_ip on public.price_reports(ip_hash, created_at);
alter table public.price_reports enable row level security;
revoke all on public.price_reports from anon, authenticated, service_role;
grant select, insert, update, delete on public.price_reports to service_role;

-- Private bucket for receipt/shelf photos; only the service role reads or writes it.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('price-report-photos', 'price-report-photos', false, 3145728, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;
