-- Citihaus+ · proprietário aprova, recusa ou faz contraproposta direto no portal
alter table public.propostas add column if not exists contra_valor numeric;
drop function if exists public.plus_proposta_resp(text,uuid,text,text);
create or replace function public.plus_proposta_resp(p_sessao text, p_id uuid, p_status text, p_obs text, p_valor numeric default null) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public._plus_pessoa(p_sessao); r public.propostas; st text; obs text := left(nullif(trim(p_obs),''),500);
  resp text; quem text; imv text; tit text;
  fmt constant text := 'FM999G999G990D00';
begin
  st := case p_status when 'Quero aceitar' then 'Aprovada' else p_status end;
  if st is null or st not in ('Aprovada','Contraproposta','Não aceito','Quero conversar') then raise exception 'Resposta inválida'; end if;
  if st = 'Contraproposta' and coalesce(p_valor,0) <= 0 then raise exception 'Informe o valor da contraproposta'; end if;
  select x.* into r from public.propostas x where x.id = p_id and x.status = 'em_analise'
     and (exists(select 1 from public.captacoes c where c.id = x.captacao_id and c.proprietario_id = pid)
       or exists(select 1 from public.imoveis i where i.id = x.imovel_id and i.proprietario_id = pid)) for update;
  if not found then raise exception 'Proposta não encontrada ou já encerrada'; end if;
  resp := case when st = 'Contraproposta' then 'R$ ' || translate(to_char(p_valor,'FM999,999,990.00'),',.','.,') || coalesce(' · ' || obs,'') else obs end;
  update public.propostas set status_prop = st, resposta_prop = resp, respondida_em = now(),
     contra_valor = case when st = 'Contraproposta' then p_valor end,
     status = case st when 'Aprovada' then 'aceita' when 'Contraproposta' then 'contraproposta' when 'Não aceito' then 'recusada' else status end
   where id = p_id;
  -- avisa a equipe na agenda de quem cuida do negócio
  begin
    select i.titulo into imv from public.imoveis i where i.id = r.imovel_id or (r.imovel_id is null and i.captacao_id = r.captacao_id) limit 1;
    select e.nome into quem from public.equipe e
     where e.nome in ((select n.corretor from public.negocios n where n.id = r.negocio_id), (select c.corretor from public.captacoes c where c.id = r.captacao_id)) limit 1;
    if quem is null then select e.nome into quem from public.equipe e where e.papel = 'admin' order by e.nome limit 1; end if;
    tit := case st when 'Aprovada' then 'Proprietário APROVOU a proposta de R$ ' || translate(to_char(r.valor,'FM999,999,990.00'),',.','.,')
                   when 'Contraproposta' then 'Proprietário fez CONTRAPROPOSTA de R$ ' || translate(to_char(p_valor,'FM999,999,990.00'),',.','.,')
                   when 'Não aceito' then 'Proprietário recusou a proposta de R$ ' || translate(to_char(r.valor,'FM999,999,990.00'),',.','.,')
                   else 'Proprietário quer conversar sobre a proposta de R$ ' || translate(to_char(r.valor,'FM999,999,990.00'),',.','.,') end || coalesce(' · ' || imv,'');
    if quem is not null then
      insert into public.agenda (responsavel, titulo, tipo, quando, ref_tipo, ref_id, obs, criado_por)
      values (quem, left(tit,200), 'Comercial', now(),
              case when r.negocio_id is not null then 'negocio' when r.imovel_id is not null then 'imovel' else 'captacao' end,
              coalesce(r.negocio_id, r.imovel_id, r.captacao_id), obs, 'Citihaus+');
    end if;
  exception when others then null; end;
end $$;
revoke execute on function public.plus_proposta_resp(text,uuid,text,text,numeric) from public;
grant execute on function public.plus_proposta_resp(text,uuid,text,text,numeric) to anon, authenticated;
select 'ok' as status;
