create table if not exists listings (
  id uuid primary key default gen_random_uuid(),
  title varchar(255) not null,
  description text not null,
  price decimal(10,2) not null check (price >= 0),
  category varchar(100) not null,
  seller_email varchar(255) not null,
  image_url text,
  location varchar(255) default 'Palo Alto, CA',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists messages (
  id uuid primary key default gen_random_uuid(),
  listing_id uuid references listings(id) on delete cascade,
  buyer_email varchar(255) not null,
  seller_email varchar(255) not null,
  message text not null,
  submission_id uuid,
  created_at timestamptz default now()
);

alter table public.messages
  add column if not exists submission_id uuid;

insert into storage.buckets (id, name, public)
values ('listing-images', 'listing-images', true)
on conflict (id) do update set public = true;

create index if not exists idx_listings_category on listings(category);
create index if not exists idx_listings_created_at on listings(created_at desc);
create index if not exists idx_messages_listing_id on messages(listing_id);
create unique index if not exists idx_messages_submission_id
  on public.messages(submission_id)
  where submission_id is not null;

alter table listings enable row level security;
alter table messages enable row level security;

drop policy if exists "Anyone can view listings" on listings;
create policy "Anyone can view listings" on listings for select using (true);

drop policy if exists "Anyone can create listings" on listings;
create policy "Anyone can create listings" on listings for insert with check (true);

drop policy if exists "Anyone can create messages" on messages;
create policy "Anyone can create messages" on messages for insert with check (true);

grant usage on schema public to anon, authenticated;
grant select, insert on public.listings to anon, authenticated;
grant insert on public.messages to anon, authenticated;

drop policy if exists "Anyone can upload listing images" on storage.objects;
create policy "Anyone can upload listing images" on storage.objects
for insert with check (bucket_id = 'listing-images');

drop policy if exists "Anyone can view listing images" on storage.objects;
create policy "Anyone can view listing images" on storage.objects
for select using (bucket_id = 'listing-images');

grant select, insert on storage.objects to anon, authenticated;
