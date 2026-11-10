-- Citihaus · chamados internos da equipe (contrato opcional) + prioridade com prazo em dias úteis
alter table public.chamados alter column contrato_id drop not null;
alter table public.chamados alter column pessoa_id drop not null;
alter table public.chamados alter column papel drop not null;
alter table public.chamados add column if not exists interno boolean not null default false;
alter table public.chamados add column if not exists prioridade text not null default 'normal';
alter table public.chamados add column if not exists responsavel text;
alter table public.chamados add column if not exists imovel_id uuid references public.imoveis(id) on delete set null;
alter table public.chamados add column if not exists criado_por text;
alter table public.chamados drop constraint if exists chamados_prioridade_check;
alter table public.chamados add constraint chamados_prioridade_check check (prioridade in ('critico','urgente','normal','sem_pressa'));
-- chamado de cliente continua exigindo contrato e pessoa; só o interno pode ficar sem
alter table public.chamados drop constraint if exists chamados_cliente_check;
alter table public.chamados add constraint chamados_cliente_check check (interno or (contrato_id is not null and pessoa_id is not null and papel is not null));

-- e-mail de resposta: nunca para chamado interno
create or replace function public._trg_email_chamado() returns trigger
language plpgsql security definer set search_path = public as $$
declare h public.chamados;
begin
  if new.autor <> 'equipe' then return new; end if;
  begin
    select * into h from public.chamados where id = new.chamado_id;
    if h.interno or h.pessoa_id is null then return new; end if;
    perform public._email_enfileirar(h.pessoa_id, 'Chamado ' || h.protocolo || ': nova resposta da Citihaus',
      'Seu chamado tem uma nova resposta',
      'Chamado ' || h.protocolo || ' · ' || coalesce(h.titulo,'') || E'\n\n' ||
      case when coalesce(trim(new.texto),'') <> '' then trim(new.texto) else 'A Citihaus enviou um anexo.' end ||
      E'\n\nResponda pelo portal para manter tudo registrado.', 'chamado');
  exception when others then raise warning 'email chamado: %', sqlerrm; end;
  return new;
end $$;

create or replace function public.equipe_chamado_interno(p_tipo text, p_titulo text, p_texto text, p_prioridade text,
  p_contrato uuid, p_imovel uuid, p_responsavel text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare h public.chamados; nm text; im uuid := p_imovel;
begin
  if not public.is_equipe() then raise exception 'Sem permissão'; end if;
  if coalesce(trim(p_titulo),'') = '' then raise exception 'Falta o título'; end if;
  select nome into nm from public.equipe where user_id = auth.uid();
  if p_contrato is not null then
    select coalesce(im, imovel_id) into im from public.contratos where id = p_contrato;
    if not found then raise exception 'Contrato não encontrado'; end if;
  end if;
  insert into public.chamados (protocolo, contrato_id, imovel_id, interno, tipo, titulo, status, prioridade, responsavel, criado_por)
  values (public.gerar_protocolo(), p_contrato, im, true, coalesce(nullif(trim(p_tipo),''),'Outro'), left(trim(p_titulo),120), 'aberto',
          coalesce(p_prioridade,'normal'), nullif(trim(p_responsavel),''), nm)
  returning * into h;
  if coalesce(trim(p_texto),'') <> '' then
    insert into public.mensagens (chamado_id, autor, autor_nome, texto) values (h.id, 'equipe', coalesce(nm,'Citihaus'), left(trim(p_texto),4000));
  end if;
  return jsonb_build_object('id', h.id, 'protocolo', h.protocolo);
end $$;
grant execute on function public.equipe_chamado_interno(text,text,text,text,uuid,uuid,text) to authenticated;
select 'ok' as status;
