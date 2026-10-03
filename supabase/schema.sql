-- =====================================================================
--  PAI E FILHO ROÇADAS — estrutura do banco (Supabase / PostgreSQL)
--  Como usar: Supabase > SQL Editor > New query > cole tudo > Run
-- =====================================================================

-- ---------- PLANOS ----------
create table if not exists public.planos (
  id             bigint generated always as identity primary key,
  nome           text not null,
  descricao      text,
  preco          numeric(10,2),              -- preço "a partir de"
  tipo_cobranca  text not null default 'avulso' check (tipo_cobranca in ('avulso','mensal')),
  area_max_m2    integer,                    -- tamanho máximo coberto pelo plano
  inclui         text,                       -- itens separados por | (ex: Roçada|Rastelamento)
  destaque       boolean not null default false,
  ativo          boolean not null default true,  -- false = some do site, mas fica no histórico
  ordem          integer not null default 0,
  criado_em      timestamptz not null default now()
);

-- ---------- PEDIDOS ----------
create table if not exists public.pedidos (
  id               bigint generated always as identity primary key,

  -- Cliente
  cliente_nome     text not null,
  cliente_telefone text,

  -- Endereço
  cep              text,
  logradouro       text,
  numero           text,
  complemento      text,
  bairro           text,
  cidade           text,
  uf               text,
  ponto_referencia text,

  -- Serviço
  plano_id         bigint references public.planos(id) on delete set null,
  area_m2          integer,
  recolher_residuos boolean not null default false,   -- levar o mato embora?
  valor_combinado  numeric(10,2),

  -- Pagamento (só controle, nada é cobrado pelo site)
  forma_pagamento  text check (forma_pagamento in ('pix','dinheiro','cartao','outro')),
  pago             boolean not null default false,

  -- Datas
  data_coleta      date not null default current_date,  -- quando o pedido foi feito
  data_agendada    date,                                -- quando será realizado
  data_conclusao   date,                                -- quando foi realizado de fato

  -- Andamento
  status           text not null default 'pendente'
                   check (status in ('pendente','agendado','em_andamento','concluido','cancelado')),
  origem           text,            -- como o cliente chegou: whatsapp, indicação, site...
  observacoes      text,

  criado_por       uuid references auth.users(id) default auth.uid(),
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create index if not exists pedidos_data_agendada_idx on public.pedidos (data_agendada);
create index if not exists pedidos_status_idx on public.pedidos (status);

-- Atualiza "atualizado_em" sozinho a cada edição
create or replace function public.tocar_atualizado_em()
returns trigger language plpgsql as $$
begin
  new.atualizado_em = now();
  return new;
end $$;

drop trigger if exists pedidos_atualizado_em on public.pedidos;
create trigger pedidos_atualizado_em
  before update on public.pedidos
  for each row execute function public.tocar_atualizado_em();

-- =====================================================================
--  SEGURANÇA (RLS) — MUITO IMPORTANTE
--  A chave "anon" fica visível no site, então quem protege os dados
--  são estas regras:
--   * qualquer visitante pode LER planos ativos (página de planos)
--   * só usuários logados (você e seu pai) mexem em planos e pedidos
-- =====================================================================
alter table public.planos  enable row level security;
alter table public.pedidos enable row level security;

drop policy if exists "planos ativos sao publicos" on public.planos;
create policy "planos ativos sao publicos" on public.planos
  for select using (ativo = true or auth.role() = 'authenticated');

drop policy if exists "logados gerenciam planos" on public.planos;
create policy "logados gerenciam planos" on public.planos
  for all to authenticated using (true) with check (true);

drop policy if exists "logados gerenciam pedidos" on public.pedidos;
create policy "logados gerenciam pedidos" on public.pedidos
  for all to authenticated using (true) with check (true);

-- =====================================================================
--  PLANOS DE EXEMPLO (edite à vontade depois no Table Editor)
-- =====================================================================
insert into public.planos (nome, descricao, preco, tipo_cobranca, area_max_m2, inclui, destaque, ordem) values
  ('Avulso Pequeno', 'Roçada única para terrenos de até 300 m².', 150, 'avulso', 300, 'Roçada|Rastelamento|Fotos antes e depois', false, 1),
  ('Avulso Grande', 'Roçada única para terrenos de 300 a 1.000 m².', 350, 'avulso', 1000, 'Roçada|Rastelamento|Fotos antes e depois', false, 2),
  ('Mensal', 'Uma roçada por mês com preço fixo e data garantida.', 130, 'mensal', 300, '1 roçada/mês|Rastelamento|Prioridade na agenda|Fotos', true, 3);
