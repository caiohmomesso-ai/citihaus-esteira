-- pedidos do proprietário só na fase comercial: captação concluída (anúncio publicado) e sem contrato em andamento no imóvel
create or replace function public._cap_comercial(p_cap uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select c.etapa >= 5 from public.captacoes c where c.id = p_cap), false)
     and not exists(select 1 from public.contratos k join public.imoveis i on i.id = k.imovel_id
                    where i.captacao_id = p_cap and coalesce((k.situacao->'desocupacao'->>'etapa')::int, -1) < 4) $$;
revoke execute on function public._cap_comercial(uuid) from public, anon, authenticated;

create or replace function public.cap_portal_comercial(p_token uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select public._cap_comercial(id) from public.captacoes where prop_token = p_token), false) $$;
grant execute on function public.cap_portal_comercial(uuid) to anon, authenticated;

create or replace function public._cap_ch_abrir(p_cap uuid, p_pessoa uuid, p_tipo text, p_texto text, p_valor numeric) returns jsonb
language plpgsql security definer set search_path = public as $$
declare h public.cap_chamados; nm text;
begin
  if not public._cap_comercial(p_cap) then raise exception 'Os pedidos ficam disponíveis quando o anúncio já está publicado e o imóvel não tem contrato em andamento'; end if;
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
select 'ok' as status;
