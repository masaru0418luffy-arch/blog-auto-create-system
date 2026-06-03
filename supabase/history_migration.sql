-- 生成バッチを管理するテーブル
create table blog_generations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid references companies not null,
  generated_at timestamptz default now()
);

-- generated_blogsに生成バッチIDを追加
alter table generated_blogs add column generation_id uuid references blog_generations;

-- RLS設定
alter table blog_generations enable row level security;

create policy "Users can manage generations for their companies" on blog_generations
  using (company_id in (select id from companies where user_id = auth.uid()))
  with check (company_id in (select id from companies where user_id = auth.uid()));
