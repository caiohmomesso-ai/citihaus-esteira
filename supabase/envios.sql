-- Citihaus · comunicados enviados por link (página pública com o documento e os anexos)
create table if not exists public.com_envios (
  token uuid primary key default gen_random_uuid(),
  titulo text not null, texto text not null default '',
  para text, imovel text, remetente text,
  anexos jsonb not null default '[]'::jsonb,
  expira_em timestamptz not null default now() + interval '90 days',
  aberto_em timestamptz, aberturas int not null default 0, criado_por text,
  created_at timestamptz not null default now());
alter table public.com_envios enable row level security;
drop policy if exists equipe_tudo on public.com_envios;
create policy equipe_tudo on public.com_envios for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

-- quem tem o link lê só aquele comunicado
drop function if exists public.com_envio(uuid);
create or replace function public.com_envio(p_token uuid, p_previa boolean default false) returns jsonb
language plpgsql security definer set search_path = public as $$
declare e public.com_envios;
begin
  select * into e from public.com_envios where token = p_token and expira_em > now();
  if not found then raise exception 'Este link não existe ou já venceu. Peça um novo à Citihaus.'; end if;
  if not coalesce(p_previa,false) then update public.com_envios set aberturas = aberturas + 1, aberto_em = coalesce(aberto_em, now()) where token = p_token; end if;
  return jsonb_build_object('titulo', e.titulo, 'texto', e.texto, 'para', e.para, 'imovel', e.imovel,
    'remetente', e.remetente, 'data', e.created_at, 'anexos', e.anexos);
end $$;
grant execute on function public.com_envio(uuid, boolean) to anon, authenticated;

-- anexo só pode ser baixado se fizer parte de algum comunicado válido
create or replace function public._modelo_enviado(p_path text) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.com_envios e, jsonb_array_elements(e.anexos) a
                where e.expira_em > now() and a->>'path' = p_path) $$;
grant execute on function public._modelo_enviado(text) to anon, authenticated;
drop policy if exists modelos_link_ler on storage.objects;
create policy modelos_link_ler on storage.objects for select to anon using (bucket_id = 'modelos' and public._modelo_enviado(name));
select 'ok' as status;
