create table companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users not null,
  name text not null,
  hp_url text,
  hp_content text,
  hearing_file_url text,
  hearing_text text,
  construction_types text[],
  created_at timestamptz default now()
);

create table generated_blogs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies not null,
  title text,
  body text,
  category text,
  generated_at timestamptz default now()
);

alter table companies enable row level security;
alter table generated_blogs enable row level security;

create policy "Users can manage their own companies" on companies
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can manage blogs for their companies" on generated_blogs
  using (company_id in (select id from companies where user_id = auth.uid()));
