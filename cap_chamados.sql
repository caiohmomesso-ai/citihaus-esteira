-- Citihaus · chamados dos imóveis captados (correção de valor/dados, dúvida, redução de valor)
-- Tabela própria: não altera os chamados de contrato nem as etapas.
create table if not exists public.cap_chamados (
  id uuid primary key default gen_random_uuid(),
  protocolo text not null default public.gerar_protocolo(),
  captacao_id uuid not null references public.captacoes(id) on delete cascade,
  pessoa_id uuid references public.pessoas(id) on delete set null,
  tipo text not null check (tipo in ('Correção de valor','Redução de valor','Correção de dados','Dúvida')),
  valor_sugerido numeric check (valor_sugerido is null or valor_sugerido > 0),
  status text not null default 'aberto' check (status in ('aberto','atendimento','resolvido')),
  conversa jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now());
create index if not exists cap_chamados_cap on public.cap_chamados(captacao_id);
alter table public.cap_chamados enable row level security;
drop policy if exists equipe_tudo on public.cap_chamados;
create policy equipe_tudo on public.cap_chamados for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

create or replace function public._brl(v numeric) returns text language sql immutable as $$
  select 'R$ ' || replace(replace(replace(to_char(v,'FM999,999,990.00'),',','#'),'.',','),'#','.') $$;

-- abre o chamado (uso interno, depois de conferir o dono)
create or replace function public._cap_ch_abrir(p_cap uuid, p_pessoa uuid, p_tipo text, p_texto text, p_valor numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare h public.cap_chamados; nm text;
begin
  if p_tipo not in ('Correção de valor','Redução de valor','Correção de dados','Dúvida') then raise exception 'Escolha o tipo do pedido'; end if;
  if coalesce(trim(p_texto),'') = '' and p_valor is null then raise exception 'Escreva o que você precisa'; end if;
  if p_valor is not null and p_valor <= 0 then raise exception 'Valor inválido'; end if;
  select nome into nm from public.pessoas where id = p_pessoa;
  insert into public.cap_chamados (captacao_id, pessoa_id, tipo, valor_sugerido, conversa)
  values (p_cap, p_pessoa, p_tipo, p_valor,
          jsonb_build_array(jsonb_build_object('autor','proprietario','nome',coalesce(nm,''),'texto',left(coalesce(trim(p_texto),''),2000),'em',now())))
  returning * into h;
  insert into public.captacao_hist (captacao_id, texto)
  values (p_cap, 'Proprietário abriu o chamado ' || h.protocolo || ' · ' || p_tipo || coalesce(' · valor sugerido ' || public._brl(p_valor), ''));
  return jsonb_build_object('id', h.id, 'protocolo', h.protocolo);
end $$;
revoke execute on function public._cap_ch_abrir(uuid,uuid,text,text,numeric) from public, anon, authenticated;

create or replace function public._cap_ch_msg(p_id uuid, p_pessoa uuid, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
declare nm text;
begin
  if coalesce(trim(p_texto),'') = '' then raise exception 'Escreva a mensagem'; end if;
  select nome into nm from public.pessoas where id = p_pessoa;
  update public.cap_chamados set conversa = conversa || jsonb_build_array(jsonb_build_object('autor','proprietario','nome',coalesce(nm,''),'texto',left(trim(p_texto),2000),'em',now())),
    status = case when status = 'resolvido' then 'aberto' else status end, updated_at = now()
   where id = p_id;
end $$;
revoke execute on function public._cap_ch_msg(uuid,uuid,text) from public, anon, authenticated;

create or replace function public._cap_ch_lista(p_where_pessoa uuid, p_cap uuid) returns jsonb
language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'protocolo',h.protocolo,'captacao_id',h.captacao_id,'tipo',h.tipo,'valor_sugerido',h.valor_sugerido,
           'status',h.status,'created_at',h.created_at,'updated_at',h.updated_at,
           'conversa',(select coalesce(jsonb_agg(m - 'nome' || jsonb_build_object('nome', case when m->>'autor'='equipe' then m->>'nome' else 'Você' end)),'[]'::jsonb) from jsonb_array_elements(h.conversa) m))
         order by h.updated_at desc), '[]'::jsonb)
  from public.cap_chamados h join public.captacoes c on c.id = h.captacao_id
  where (p_cap is not null and h.captacao_id = p_cap) or (p_cap is null and c.proprietario_id = p_where_pessoa) $$;
revoke execute on function public._cap_ch_lista(uuid,uuid) from public, anon, authenticated;

-- Citihaus+ (sessão do cliente)
create or replace function public.plus_cap_chamados(p_sessao text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare pid uuid := public._plus_pessoa(p_sessao);
begin return public._cap_ch_lista(pid, null); end $$;
grant execute on function public.plus_cap_chamados(text) to anon, authenticated;

create or replace function public.plus_cap_chamado_abrir(p_sessao text, p_captacao uuid, p_tipo text, p_texto text, p_valor numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid := public._plus_pessoa(p_sessao);
begin
  if not exists(select 1 from public.captacoes where id = p_captacao and proprietario_id = pid) then raise exception 'Imóvel não encontrado'; end if;
  return public._cap_ch_abrir(p_captacao, pid, p_tipo, p_texto, p_valor);
end $$;
grant execute on function public.plus_cap_chamado_abrir(text,uuid,text,text,numeric) to anon, authenticated;

create or replace function public.plus_cap_chamado_msg(p_sessao text, p_id uuid, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public._plus_pessoa(p_sessao);
begin
  if not exists(select 1 from public.cap_chamados h join public.captacoes c on c.id = h.captacao_id where h.id = p_id and c.proprietario_id = pid) then raise exception 'Chamado não encontrado'; end if;
  perform public._cap_ch_msg(p_id, pid, p_texto);
end $$;
grant execute on function public.plus_cap_chamado_msg(text,uuid,text) to anon, authenticated;

-- link do imóvel (imovel.html?t=) — vale também depois de publicado
create or replace function public.cap_portal_chamados(p_token uuid) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare c public.captacoes;
begin
  select * into c from public.captacoes where prop_token = p_token;
  if not found then raise exception 'Link inválido'; end if;
  return public._cap_ch_lista(null, c.id);
end $$;
grant execute on function public.cap_portal_chamados(uuid) to anon, authenticated;

create or replace function public.cap_portal_chamado_abrir(p_token uuid, p_tipo text, p_texto text, p_valor numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare c public.captacoes;
begin
  select * into c from public.captacoes where prop_token = p_token;
  if not found then raise exception 'Link inválido'; end if;
  return public._cap_ch_abrir(c.id, c.proprietario_id, p_tipo, p_texto, p_valor);
end $$;
grant execute on function public.cap_portal_chamado_abrir(uuid,text,text,numeric) to anon, authenticated;

create or replace function public.cap_portal_chamado_msg(p_token uuid, p_id uuid, p_texto text) returns void
language plpgsql security definer set search_path = public as $$
declare c public.captacoes;
begin
  select * into c from public.captacoes where prop_token = p_token;
  if not found or not exists(select 1 from public.cap_chamados where id = p_id and captacao_id = c.id) then raise exception 'Chamado não encontrado'; end if;
  perform public._cap_ch_msg(p_id, c.proprietario_id, p_texto);
end $$;
grant execute on function public.cap_portal_chamado_msg(uuid,uuid,text) to anon, authenticated;

-- equipe responde / muda status (avisa o proprietário por e-mail, se os e-mails estiverem ligados)
create or replace function public.equipe_cap_chamado_resp(p_id uuid, p_texto text, p_status text) returns void
language plpgsql security definer set search_path = public as $$
declare h public.cap_chamados; nm text;
begin
  if not public.is_equipe() then raise exception 'Sem permissão'; end if;
  if p_status is not null and p_status not in ('aberto','atendimento','resolvido') then raise exception 'Status inválido'; end if;
  select nome into nm from public.equipe where user_id = auth.uid();
  update public.cap_chamados set
    conversa = case when coalesce(trim(p_texto),'') <> '' then conversa || jsonb_build_array(jsonb_build_object('autor','equipe','nome',coalesce(nm,'Citihaus'),'texto',left(trim(p_texto),2000),'em',now())) else conversa end,
    status = coalesce(p_status, case when coalesce(trim(p_texto),'') <> '' and status = 'aberto' then 'atendimento' else status end),
    updated_at = now()
   where id = p_id returning * into h;
  if not found then raise exception 'Chamado não encontrado'; end if;
  if coalesce(trim(p_texto),'') <> '' then
    insert into public.captacao_hist (captacao_id, texto) values (h.captacao_id, 'Citihaus respondeu o chamado ' || h.protocolo || coalesce(' (' || nm || ')',''));
    if h.pessoa_id is not null then
      begin
        perform public._email_enfileirar(h.pessoa_id, 'Citihaus respondeu seu pedido ' || h.protocolo, 'Resposta ao seu pedido',
          'Pedido: ' || h.tipo || E'\n\n' || left(trim(p_texto),1500) || E'\n\nPara responder, entre no Citihaus+ com seu celular e senha.', 'cap_chamado');
      exception when others then null; end;
    end if;
  elsif p_status = 'resolvido' then
    insert into public.captacao_hist (captacao_id, texto) values (h.captacao_id, 'Chamado ' || h.protocolo || ' resolvido');
  end if;
end $$;
grant execute on function public.equipe_cap_chamado_resp(uuid,text,text) to authenticated;

select 'ok' as status;
