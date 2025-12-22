-- Create tables if not exists (compatible with Django models)
create table if not exists public.inventory_product (
  id bigserial primary key,
  sku varchar(32) unique not null,
  name varchar(128) not null,
  category varchar(64) not null,
  cost_price numeric(12,2) not null,
  current_selling_price numeric(12,2) not null
);

create table if not exists public.inventory_inventory (
  id bigserial primary key,
  product_id bigint not null references public.inventory_product(id) on delete cascade,
  quantity integer not null,
  location varchar(64) not null,
  min_safety_stock integer default 0,
  max_capacity integer default 0
);

create table if not exists public.market_marketdata (
  id bigserial primary key,
  product_id bigint not null references public.inventory_product(id) on delete cascade,
  market_price numeric(12,2) not null,
  demand_index integer not null,
  competitor_price numeric(12,2) not null,
  recorded_at timestamptz not null
);

-- Seed 100 products and inventories
with cats as (
  select unnest(array['电子产品','日用品','食品饮料','服装鞋帽','家居家电']) as cat
)
insert into public.inventory_product (sku, name, category, cost_price, current_selling_price)
select 
  'SKU' || lpad(gs::text, 4, '0') as sku,
  (select cat from cats limit 1 offset (gs % 5)) || '-' || gs as name,
  (select cat from cats limit 1 offset (gs % 5)) as category,
  round((10 + random() * 490)::numeric, 2) as cost_price,
  round(((10 + random() * 490) * (1.1 + random() * 0.7))::numeric, 2) as current_selling_price
from generate_series(0,99) as gs
on conflict (sku) do nothing;

-- Seed inventory rows
insert into public.inventory_inventory (product_id, quantity, location, min_safety_stock, max_capacity)
select p.id,
       (20 + (random() * 380))::int as quantity,
       'MAIN' as location,
       50 as min_safety_stock,
       1000 as max_capacity
from public.inventory_product p
left join public.inventory_inventory inv on inv.product_id = p.id
where inv.id is null;

-- Seed 30 days market data per product
insert into public.market_marketdata (product_id, market_price, demand_index, competitor_price, recorded_at)
select p.id,
       round((p.current_selling_price * (1 + ((demand - 50) / 100.0) * 0.3 + (random()*0.1 - 0.05)))::numeric, 2) as market_price,
       demand,
       round((p.current_selling_price * (1 + ((demand - 50) / 100.0) * 0.28 + (random()*0.1 - 0.05)))::numeric, 2) as competitor_price,
       (now() - ((29 - d)::text || ' days')::interval) as recorded_at
from public.inventory_product p,
     generate_series(0,29) as d,
     (select greatest(0, least(100, (30 + (random()*40))::int)) as demand) as di;

