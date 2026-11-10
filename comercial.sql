-- Citihaus · esteira comercial (funil DNA de Vendas: Lead → MQL → SAL → Oportunidade → Cliente)
create sequence if not exists public.negocio_seq;
create table if not exists public.negocios (
  id uuid primary key default gen_random_uuid(),
  numero integer not null default nextval('public.negocio_seq'),
  etapa text not null default 'lead' check (etapa in ('lead','mql','sal','opp','cliente','perdido')),
  nome text not null, telefone text, email text,
  interesse text not null default 'Compra' check (interesse in ('Compra','Locação')),
  origem text, imovel_id uuid references public.imoveis(id) on delete set null,
  corretor text, orcamento numeric, obs text, motivo_perda text, proximo_contato date,
  etapa_em timestamptz not null default now(), arquivado_em timestamptz,
  criado_por text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create index if not exists negocios_imovel on public.negocios(imovel_id);
create table if not exists public.negocio_hist (
  id uuid primary key default gen_random_uuid(),
  negocio_id uuid not null references public.negocios(id) on delete cascade,
  texto text not null, created_at timestamptz not null default now());
alter table public.negocios enable row level security;
alter table public.negocio_hist enable row level security;
drop policy if exists equipe_tudo on public.negocios;
create policy equipe_tudo on public.negocios for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
drop policy if exists equipe_tudo on public.negocio_hist;
create policy equipe_tudo on public.negocio_hist for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

alter table public.visitas add column if not exists negocio_id uuid references public.negocios(id) on delete set null;
alter table public.propostas add column if not exists negocio_id uuid references public.negocios(id) on delete set null;

create or replace function public._trg_negocio() returns trigger
language plpgsql security definer set search_path = public as $$
declare nomes jsonb := '{"lead":"Lead","mql":"MQL","sal":"SAL","opp":"Oportunidade","cliente":"Cliente","perdido":"Perdido"}';
  quem text := (select nome from public.equipe where user_id = auth.uid());
begin
  if tg_op = 'INSERT' then
    insert into public.negocio_hist (negocio_id, texto) values (new.id, 'Lead criado' || coalesce(' · origem ' || new.origem,'') || coalesce(' por ' || quem,''));
    return new;
  end if;
  if new.etapa is distinct from old.etapa then
    new.etapa_em := now();
    insert into public.negocio_hist (negocio_id, texto) values (new.id, (nomes->>old.etapa) || ' → ' || (nomes->>new.etapa)
      || case when new.etapa = 'perdido' then coalesce(' · motivo: ' || new.motivo_perda,'') else '' end || coalesce(' · ' || quem,''));
  end if;
  if new.imovel_id is distinct from old.imovel_id and new.imovel_id is not null then
    insert into public.negocio_hist (negocio_id, texto) values (new.id, 'Imóvel vinculado: ' || coalesce((select titulo from public.imoveis where id = new.imovel_id),''));
  end if;
  new.updated_at := now();
  return new;
end $$;
drop trigger if exists negocio_ins on public.negocios;
create trigger negocio_ins after insert on public.negocios for each row execute function public._trg_negocio();
drop trigger if exists negocio_upd on public.negocios;
create trigger negocio_upd before update on public.negocios for each row execute function public._trg_negocio();
select 'ok' as status;
