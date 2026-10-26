-- ================================================================
-- App Lista - Schema Supabase
-- Rode este arquivo inteiro no SQL Editor do Supabase
-- ================================================================

-- ========== EXTENSÕES ==========
create extension if not exists "pgcrypto";

-- ========== PERFIS (estende auth.users) ==========
create table if not exists perfis (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  cargo text,
  avatar_url text,
  criado_em timestamptz default now()
);

-- Cria perfil automaticamente quando usuário faz signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.perfis (id, nome, cargo)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nome', 'Usuário'),
    new.raw_user_meta_data->>'cargo'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ========== PESSOAS (colaboradores analisados) ==========
create table if not exists pessoas (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  cargo text,
  cor_avatar text default '#58a6ff',
  criada_por uuid references auth.users(id) on delete cascade,
  criada_em timestamptz default now()
);

create index if not exists idx_pessoas_criada_por on pessoas(criada_por);

-- ========== CONVERSAS (par de pessoas) ==========
create table if not exists conversas (
  id uuid primary key default gen_random_uuid(),
  titulo text,
  pessoa_a_id uuid references pessoas(id) on delete cascade,
  pessoa_b_id uuid references pessoas(id) on delete cascade,
  criada_por uuid references auth.users(id) on delete cascade,
  criada_em timestamptz default now()
);

create index if not exists idx_conversas_criada_por on conversas(criada_por);

-- ========== MENSAGENS ==========
create table if not exists mensagens (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid references conversas(id) on delete cascade,
  remetente_id uuid references pessoas(id) on delete cascade,
  conteudo text not null,
  enviada_em timestamptz not null
);

create index if not exists idx_mensagens_conversa on mensagens(conversa_id, enviada_em);

-- ========== DEFEITOS ==========
create table if not exists defeitos (
  id uuid primary key default gen_random_uuid(),
  conversa_id uuid references conversas(id) on delete cascade,
  mensagem_id uuid references mensagens(id) on delete set null,
  titulo text not null,
  descricao text,
  severidade text check (severidade in ('baixa','media','alta','critica')) default 'media',
  status text check (status in ('aberto','em_andamento','resolvido')) default 'aberto',
  criado_por uuid references auth.users(id) on delete cascade,
  criado_em timestamptz default now(),
  resolvido_em timestamptz
);

create index if not exists idx_defeitos_conversa on defeitos(conversa_id);

-- ================================================================
-- ROW LEVEL SECURITY
-- Cada usuário vê apenas os próprios dados
-- ================================================================

alter table perfis enable row level security;
alter table pessoas enable row level security;
alter table conversas enable row level security;
alter table mensagens enable row level security;
alter table defeitos enable row level security;

-- Perfis: usuário vê e edita só o próprio
drop policy if exists "perfis_select_own" on perfis;
create policy "perfis_select_own" on perfis for select using (id = auth.uid());

drop policy if exists "perfis_update_own" on perfis;
create policy "perfis_update_own" on perfis for update using (id = auth.uid());

-- Pessoas: CRUD completo do que criou
drop policy if exists "pessoas_all_own" on pessoas;
create policy "pessoas_all_own" on pessoas for all
  using (criada_por = auth.uid())
  with check (criada_por = auth.uid());

-- Conversas: CRUD completo do que criou
drop policy if exists "conversas_all_own" on conversas;
create policy "conversas_all_own" on conversas for all
  using (criada_por = auth.uid())
  with check (criada_por = auth.uid());

-- Mensagens: usuário acessa mensagens de conversas suas
drop policy if exists "mensagens_all_own" on mensagens;
create policy "mensagens_all_own" on mensagens for all
  using (
    exists (
      select 1 from conversas c
      where c.id = mensagens.conversa_id
        and c.criada_por = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from conversas c
      where c.id = mensagens.conversa_id
        and c.criada_por = auth.uid()
    )
  );

-- Defeitos: CRUD completo do que criou
drop policy if exists "defeitos_all_own" on defeitos;
create policy "defeitos_all_own" on defeitos for all
  using (criado_por = auth.uid())
  with check (criado_por = auth.uid());
