-- Citihaus · agenda por usuário (follow-ups de chamados, comercial, financeiro…)
create table if not exists public.agenda (
  id uuid primary key default gen_random_uuid(),
  responsavel text not null,
  titulo text not null,
  tipo text not null default 'Follow-up' check (tipo in ('Follow-up','Chamado','Comercial','Visita','Financeiro','Contrato','Captação','Reunião','Outro')),
  quando timestamptz not null,
  ref_tipo text check (ref_tipo in ('chamado','negocio','contrato','captacao','imovel')),
  ref_id uuid,
  obs text,
  feito_em timestamptz,
  criado_por text,
  created_at timestamptz not null default now());
create index if not exists agenda_resp on public.agenda(responsavel, quando);
create index if not exists agenda_ref on public.agenda(ref_tipo, ref_id);
alter table public.agenda enable row level security;
drop policy if exists equipe_tudo on public.agenda;
create policy equipe_tudo on public.agenda for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
select 'ok' as status;
