-- ============================================================
-- emkarin.id Stock Management — Supabase Schema
-- Jalankan script ini di Supabase SQL Editor.
-- Script ini IDEMPOTEN: aman dijalankan ulang untuk meng-upgrade
-- database yang sudah ada (mis. memperbaiki kebijakan RLS lama).
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- PROFILES TABLE (extends auth.users)
-- ============================================================
create table if not exists public.profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text not null,
  full_name text,
  role text not null default 'admin' check (role in ('admin', 'owner')),
  created_at timestamptz not null default now()
);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'admin')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- PRODUCTS TABLE
-- ============================================================
create table if not exists public.products (
  id uuid default uuid_generate_v4() primary key,
  name text not null,
  category text not null check (category in ('Abaya', 'Gamis', 'Hijab', 'RTW')),
  sku text unique,
  description text,
  sizes text[] not null default '{}',
  colors text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ============================================================
-- STOCK TABLE
-- ============================================================
create table if not exists public.stock (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  size text not null,
  color text not null,
  quantity integer not null default 0 check (quantity >= 0),
  low_stock_threshold integer not null default 5 check (low_stock_threshold >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (product_id, size, color)
);

-- ============================================================
-- STOCK MOVEMENTS TABLE
-- ============================================================
create table if not exists public.stock_movements (
  id uuid default uuid_generate_v4() primary key,
  product_id uuid not null references public.products(id) on delete cascade,
  stock_id uuid not null references public.stock(id) on delete cascade,
  type text not null check (type in ('in', 'out')),
  quantity integer not null check (quantity > 0),
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

-- ============================================================
-- AUTO-UPDATE updated_at
-- ============================================================
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_products_updated_at on public.products;
create trigger set_products_updated_at
  before update on public.products
  for each row execute procedure public.set_updated_at();

drop trigger if exists set_stock_updated_at on public.stock;
create trigger set_stock_updated_at
  before update on public.stock
  for each row execute procedure public.set_updated_at();

-- ============================================================
-- ROLE HELPER
-- SECURITY DEFINER agar bisa membaca profiles tanpa memicu
-- rekursi RLS saat dipakai di dalam policy.
-- ============================================================
create or replace function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

revoke all on function public.current_user_role() from public;
grant execute on function public.current_user_role() to authenticated;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- Model peran:
--   - admin : staf operasional — kelola stok, pergerakan, & produk
--             (kecuali HAPUS produk)
--   - owner : akses penuh — termasuk HAPUS produk
-- Hanya user dengan profil (admin/owner) yang boleh menulis;
-- ini ditegakkan di server, bukan hanya disembunyikan di UI.
-- ============================================================
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.stock enable row level security;
alter table public.stock_movements enable row level security;

-- Bersihkan kebijakan lama (termasuk versi permisif sebelumnya)
drop policy if exists "Users can view own profile" on public.profiles;
drop policy if exists "Users can update own profile" on public.profiles;
drop policy if exists "Authenticated users can read products" on public.products;
drop policy if exists "Authenticated users can insert products" on public.products;
drop policy if exists "Authenticated users can update products" on public.products;
drop policy if exists "Authenticated users can delete products" on public.products;
drop policy if exists "Staff can insert products" on public.products;
drop policy if exists "Staff can update products" on public.products;
drop policy if exists "Owner can delete products" on public.products;
drop policy if exists "Authenticated users can read stock" on public.stock;
drop policy if exists "Authenticated users can insert stock" on public.stock;
drop policy if exists "Authenticated users can update stock" on public.stock;
drop policy if exists "Authenticated users can delete stock" on public.stock;
drop policy if exists "Staff can insert stock" on public.stock;
drop policy if exists "Staff can update stock" on public.stock;
drop policy if exists "Staff can delete stock" on public.stock;
drop policy if exists "Authenticated users can read movements" on public.stock_movements;
drop policy if exists "Authenticated users can insert movements" on public.stock_movements;
drop policy if exists "Staff can insert movements" on public.stock_movements;

-- Profiles: user hanya bisa lihat & ubah profilnya sendiri
create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Products: semua authenticated user bisa baca
create policy "Authenticated users can read products"
  on public.products for select
  to authenticated
  using (true);

-- Products: admin/owner bisa tambah & ubah, hanya owner bisa hapus
create policy "Staff can insert products"
  on public.products for insert
  to authenticated
  with check (public.current_user_role() in ('admin', 'owner'));

create policy "Staff can update products"
  on public.products for update
  to authenticated
  using (public.current_user_role() in ('admin', 'owner'));

create policy "Owner can delete products"
  on public.products for delete
  to authenticated
  using (public.current_user_role() = 'owner');

-- Stock: semua authenticated user bisa baca; tulis hanya admin/owner
create policy "Authenticated users can read stock"
  on public.stock for select
  to authenticated
  using (true);

create policy "Staff can insert stock"
  on public.stock for insert
  to authenticated
  with check (public.current_user_role() in ('admin', 'owner'));

create policy "Staff can update stock"
  on public.stock for update
  to authenticated
  using (public.current_user_role() in ('admin', 'owner'));

create policy "Staff can delete stock"
  on public.stock for delete
  to authenticated
  using (public.current_user_role() in ('admin', 'owner'));

-- Stock movements: baca untuk semua authenticated, insert hanya admin/owner.
-- Tidak ada policy UPDATE/DELETE → catatan pergerakan bersifat immutable.
create policy "Authenticated users can read movements"
  on public.stock_movements for select
  to authenticated
  using (true);

create policy "Staff can insert movements"
  on public.stock_movements for insert
  to authenticated
  with check (public.current_user_role() in ('admin', 'owner'));

-- ============================================================
-- ATOMIC STOCK OPERATIONS (RPC)
-- Semua mutasi stok dilakukan di server dalam satu transaksi
-- dengan row lock (FOR UPDATE) agar tidak terjadi lost-update
-- akibat perhitungan read-modify-write di client.
-- ============================================================

-- Catat pergerakan stok + sesuaikan quantity secara atomik.
-- p_low_stock_threshold opsional: jika diisi, sekaligus diperbarui.
create or replace function public.apply_stock_movement(
  p_stock_id uuid,
  p_type text,
  p_quantity integer,
  p_notes text default null,
  p_low_stock_threshold integer default null
)
returns public.stock
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock public.stock;
  v_new_qty integer;
begin
  if public.current_user_role() not in ('admin', 'owner') then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  if p_type not in ('in', 'out') then
    raise exception 'Tipe pergerakan tidak valid: %', p_type;
  end if;
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Jumlah harus lebih besar dari nol';
  end if;

  -- Kunci baris stok untuk mencegah race condition
  select * into v_stock from public.stock where id = p_stock_id for update;
  if not found then
    raise exception 'Data stok tidak ditemukan';
  end if;

  if p_type = 'in' then
    v_new_qty := v_stock.quantity + p_quantity;
  else
    if p_quantity > v_stock.quantity then
      raise exception 'Stok tidak cukup: tersedia %, diminta %', v_stock.quantity, p_quantity
        using errcode = 'P0001';
    end if;
    v_new_qty := v_stock.quantity - p_quantity;
  end if;

  insert into public.stock_movements (product_id, stock_id, type, quantity, notes, created_by)
  values (v_stock.product_id, p_stock_id, p_type, p_quantity, p_notes, auth.uid());

  update public.stock
    set quantity = v_new_qty,
        low_stock_threshold = coalesce(p_low_stock_threshold, low_stock_threshold)
    where id = p_stock_id
    returning * into v_stock;

  return v_stock;
end;
$$;

revoke all on function public.apply_stock_movement(uuid, text, integer, text, integer) from public;
grant execute on function public.apply_stock_movement(uuid, text, integer, text, integer) to authenticated;

-- Buat entri stok baru + (opsional) pergerakan "stok awal" secara atomik.
create or replace function public.create_stock_item(
  p_product_id uuid,
  p_size text,
  p_color text,
  p_quantity integer default 0,
  p_low_stock_threshold integer default 5,
  p_notes text default null
)
returns public.stock
language plpgsql
security definer
set search_path = public
as $$
declare
  v_stock public.stock;
begin
  if public.current_user_role() not in ('admin', 'owner') then
    raise exception 'Tidak diizinkan' using errcode = '42501';
  end if;
  if p_quantity is null or p_quantity < 0 then
    raise exception 'Jumlah tidak boleh negatif';
  end if;

  insert into public.stock (product_id, size, color, quantity, low_stock_threshold)
  values (p_product_id, p_size, p_color, p_quantity, coalesce(p_low_stock_threshold, 5))
  returning * into v_stock;

  if p_quantity > 0 then
    insert into public.stock_movements (product_id, stock_id, type, quantity, notes, created_by)
    values (p_product_id, v_stock.id, 'in', p_quantity, coalesce(p_notes, 'Stok awal'), auth.uid());
  end if;

  return v_stock;
exception
  when unique_violation then
    raise exception 'Stok untuk produk/ukuran/warna ini sudah ada' using errcode = 'P0001';
end;
$$;

revoke all on function public.create_stock_item(uuid, text, text, integer, integer, text) from public;
grant execute on function public.create_stock_item(uuid, text, text, integer, integer, text) to authenticated;

-- ============================================================
-- LAPORAN BULANAN (historically correct)
-- closing_stock untuk bulan terpilih = quantity sekarang
--   dikoreksi mundur dengan semua pergerakan SETELAH bulan tsb.
-- opening_stock = closing_stock - masuk(bulan) + keluar(bulan)
-- ============================================================
create or replace function public.monthly_stock_report(p_year integer, p_month integer)
returns table (
  stock_id uuid,
  product_name text,
  category text,
  sku text,
  size text,
  color text,
  opening_stock integer,
  total_in integer,
  total_out integer,
  closing_stock integer
)
language sql
stable
security definer
set search_path = public
as $$
  with bounds as (
    select
      make_timestamptz(p_year, p_month, 1, 0, 0, 0) as start_ts,
      (make_timestamptz(p_year, p_month, 1, 0, 0, 0) + interval '1 month') as end_ts
  ),
  agg as (
    select
      sm.stock_id,
      coalesce(sum(case when sm.type = 'in'  and sm.created_at >= b.start_ts and sm.created_at < b.end_ts then sm.quantity end), 0) as period_in,
      coalesce(sum(case when sm.type = 'out' and sm.created_at >= b.start_ts and sm.created_at < b.end_ts then sm.quantity end), 0) as period_out,
      coalesce(sum(case when sm.type = 'in'  and sm.created_at >= b.end_ts then sm.quantity end), 0) as after_in,
      coalesce(sum(case when sm.type = 'out' and sm.created_at >= b.end_ts then sm.quantity end), 0) as after_out
    from public.stock_movements sm
    cross join bounds b
    group by sm.stock_id
  )
  select
    s.id as stock_id,
    p.name as product_name,
    p.category,
    p.sku,
    s.size,
    s.color,
    greatest(0,
      (s.quantity - coalesce(a.after_in, 0) + coalesce(a.after_out, 0))
      - coalesce(a.period_in, 0) + coalesce(a.period_out, 0)
    )::int as opening_stock,
    coalesce(a.period_in, 0)::int as total_in,
    coalesce(a.period_out, 0)::int as total_out,
    greatest(0, s.quantity - coalesce(a.after_in, 0) + coalesce(a.after_out, 0))::int as closing_stock
  from public.stock s
  join public.products p on p.id = s.product_id
  left join agg a on a.stock_id = s.id
  order by p.category, p.name, s.size, s.color;
$$;

revoke all on function public.monthly_stock_report(integer, integer) from public;
grant execute on function public.monthly_stock_report(integer, integer) to authenticated;

-- ============================================================
-- VIEW: pergerakan stok yang sudah di-flatten
-- Dipakai untuk pencarian + paginasi sisi-server di MovementsPage.
-- security_invoker = on → tetap menghormati RLS pemanggil (PG15+).
-- ============================================================
create or replace view public.stock_movements_detailed
with (security_invoker = on)
as
select
  sm.id,
  sm.product_id,
  sm.stock_id,
  sm.type,
  sm.quantity,
  sm.notes,
  sm.created_by,
  sm.created_at,
  p.name as product_name,
  p.category as product_category,
  s.size as stock_size,
  s.color as stock_color
from public.stock_movements sm
join public.products p on p.id = sm.product_id
join public.stock s on s.id = sm.stock_id;

grant select on public.stock_movements_detailed to authenticated;

-- ============================================================
-- INDEXES untuk performa
-- ============================================================
create index if not exists idx_products_category on public.products(category);
create index if not exists idx_stock_product_id on public.stock(product_id);
create index if not exists idx_stock_movements_product_id on public.stock_movements(product_id);
create index if not exists idx_stock_movements_stock_id on public.stock_movements(stock_id);
create index if not exists idx_stock_movements_created_at on public.stock_movements(created_at desc);
create index if not exists idx_stock_movements_type on public.stock_movements(type);
