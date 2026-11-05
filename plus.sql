-- Citihaus+ (portal único do cliente) + comercial simples (visitas e propostas)

-- 1) sessões do cliente (login por celular + senha)
create table if not exists public.cliente_sessoes (
  token text primary key, pessoa_id uuid not null references public.pessoas(id) on delete cascade,
  criado timestamptz not null default now(), expira timestamptz not null default now() + interval '30 days');
alter table public.cliente_sessoes enable row level security;

create or replace function public._plus_nova_sessao(p_pessoa uuid) returns text
language plpgsql security definer set search_path = public, extensions as $$
declare t text := encode(gen_random_bytes(24), 'hex');
begin
  delete from public.cliente_sessoes where expira < now();
  insert into public.cliente_sessoes (token, pessoa_id) values (t, p_pessoa);
  return t;
end $$;
revoke execute on function public._plus_nova_sessao(uuid) from public, anon, authenticated;

create or replace function public._plus_pessoa(p_sessao text) returns uuid
language plpgsql security definer set search_path = public as $$
declare pid uuid;
begin
  update public.cliente_sessoes set expira = now() + interval '30 days' where token = p_sessao and expira > now() returning pessoa_id into pid;
  if pid is null then raise exception 'Sessão expirada. Entre de novo com seu celular e senha.'; end if;
  return pid;
end $$;
revoke execute on function public._plus_pessoa(text) from public, anon, authenticated;

-- login: agora também abre a sessão do Citihaus+
create or replace function public.portal_login(p_tel text, p_senha text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare c text := public._cel(p_tel); k text := 'cli:' || public._cel(p_tel); t public.login_tentativas; pid uuid; nm text; r jsonb;
begin
  select * into t from public.login_tentativas where chave = k;
  if t.bloqueado_ate is not null and t.bloqueado_ate > now() then
    return jsonb_build_object('erro', 'Muitas tentativas. Aguarde 15 minutos e tente de novo.');
  end if;
  select id, nome into pid, nm from public.pessoas
   where public._cel(telefone) = c and senha_hash is not null and senha_hash = crypt(coalesce(p_senha,''), senha_hash) limit 1;
  if pid is null then
    insert into public.login_tentativas (chave, falhas) values (k, 1)
      on conflict (chave) do update set falhas = case when public.login_tentativas.falhas + 1 >= 5 then 0 else public.login_tentativas.falhas + 1 end,
        bloqueado_ate = case when public.login_tentativas.falhas + 1 >= 5 then now() + interval '15 minutes' else null end;
    return jsonb_build_object('erro', 'Celular ou senha incorretos');
  end if;
  delete from public.login_tentativas where chave = k;
  select coalesce(jsonb_agg(jsonb_build_object('token', p.token, 'papel', p.papel, 'numero', ct.numero, 'imovel', i.titulo, 'etapa', ct.etapa) order by ct.created_at desc), '[]'::jsonb)
    into r from public.partes p join public.contratos ct on ct.id = p.contrato_id join public.imoveis i on i.id = ct.imovel_id where p.pessoa_id = pid;
  return jsonb_build_object('contratos', r, 'sessao', public._plus_nova_sessao(pid), 'nome', nm);
end $$;
grant execute on function public.portal_login(text,text) to anon, authenticated;

-- convite: quem abre o link do contrato cria a senha do Citihaus+
create or replace function public.portal_tem_senha(p_token text) returns boolean
language sql stable security definer set search_path = public as $$
  select p.senha_hash is not null from public.partes x join public.pessoas p on p.id = x.pessoa_id where x.token = p_token
$$;
grant execute on function public.portal_tem_senha(text) to anon, authenticated;

create or replace function public.portal_criar_senha(p_token text, p_senha text) returns jsonb
language plpgsql security definer set search_path = public, extensions as $$
declare v public.partes; p public.pessoas;
begin
  v := public._parte(p_token);
  select * into p from public.pessoas where id = v.pessoa_id;
  if p.senha_hash is not null then raise exception 'Você já tem senha. Entre com seu celular e senha.'; end if;
  if length(coalesce(p_senha,'')) < 6 then raise exception 'A senha precisa ter pelo menos 6 caracteres'; end if;
  if length(public._cel(p.telefone)) < 10 then raise exception 'Cadastre seu WhatsApp em “Seus dados” antes de criar a senha'; end if;
  update public.pessoas set senha_hash = crypt(p_senha, gen_salt('bf')) where id = p.id;
  return jsonb_build_object('sessao', public._plus_nova_sessao(p.id));
end $$;
grant execute on function public.portal_criar_senha(text,text) to anon, authenticated;

-- 2) visitas e propostas (comercial simples)
create table if not exists public.visitas (
  id uuid primary key default gen_random_uuid(),
  captacao_id uuid references public.captacoes(id) on delete cascade,
  imovel_id uuid references public.imoveis(id) on delete cascade,
  quando timestamptz not null, visitante text not null default '', visitante_tel text, corretor text,
  status text not null default 'agendada' check (status in ('agendada','realizada','cancelada','nao_compareceu')),
  feedback text, interesse int check (interesse between 1 and 5), created_at timestamptz not null default now());
create table if not exists public.propostas (
  id uuid primary key default gen_random_uuid(),
  captacao_id uuid references public.captacoes(id) on delete cascade,
  imovel_id uuid references public.imoveis(id) on delete cascade,
  data date not null default current_date, proponente text not null default '', proponente_tel text, corretor text,
  tipo text not null default 'Venda' check (tipo in ('Venda','Locação')), valor numeric not null check (valor > 0), condicoes text,
  status text not null default 'em_analise' check (status in ('em_analise','aceita','recusada','contraproposta','cancelada')),
  resposta_prop text, status_prop text, respondida_em timestamptz, created_at timestamptz not null default now());
alter table public.visitas enable row level security;
alter table public.propostas enable row level security;
drop policy if exists equipe_tudo on public.visitas;
create policy equipe_tudo on public.visitas for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
drop policy if exists equipe_tudo on public.propostas;
create policy equipe_tudo on public.propostas for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

create or replace function public._trg_comercial_hist() returns trigger
language plpgsql security definer set search_path = public as $$
declare cap uuid := new.captacao_id; txt text;
begin
  if cap is null and new.imovel_id is not null then select captacao_id into cap from public.imoveis where id = new.imovel_id; end if;
  if cap is null then return new; end if;
  if tg_table_name = 'visitas' then
    txt := case when tg_op = 'INSERT' then 'Visita agendada para ' || to_char(new.quando at time zone 'America/Sao_Paulo','DD/MM HH24:MI') || coalesce(' · ' || nullif(new.visitante,''),'')
                when new.status is distinct from old.status then 'Visita de ' || to_char(new.quando at time zone 'America/Sao_Paulo','DD/MM') || ': ' || replace(new.status,'_',' ') end;
  else
    txt := case when tg_op = 'INSERT' then 'Proposta recebida: R$ ' || replace(replace(replace(to_char(new.valor,'FM999,999,990.00'),',','#'),'.',','),'#','.') || coalesce(' · ' || nullif(new.proponente,''),'')
                when new.status_prop is distinct from old.status_prop and new.status_prop is not null then 'Proprietário respondeu à proposta de R$ ' || replace(replace(replace(to_char(new.valor,'FM999,999,990.00'),',','#'),'.',','),'#','.') || ': ' || new.status_prop || coalesce(' · “' || nullif(new.resposta_prop,'') || '”','')
                when new.status is distinct from old.status then 'Proposta de R$ ' || replace(replace(replace(to_char(new.valor,'FM999,999,990.00'),',','#'),'.',','),'#','.') || ': ' || replace(new.status,'_',' ') end;
  end if;
  if txt is not null then insert into public.captacao_hist (captacao_id, texto) values (cap, txt); end if;
  return new;
end $$;
drop trigger if exists visitas_hist on public.visitas;
create trigger visitas_hist after insert or update on public.visitas for each row execute function public._trg_comercial_hist();
drop trigger if exists propostas_hist on public.propostas;
create trigger propostas_hist after insert or update on public.propostas for each row execute function public._trg_comercial_hist();

-- 3) tela inicial do Citihaus+
create or replace function public.plus_home(p_sessao text) returns jsonb
language plpgsql security definer set search_path = public as $$
declare pid uuid := public._plus_pessoa(p_sessao); dono boolean;
begin
  dono := exists(select 1 from public.imoveis where proprietario_id = pid) or exists(select 1 from public.captacoes where proprietario_id = pid)
       or exists(select 1 from public.partes where pessoa_id = pid and papel = 'proprietario');
  return jsonb_build_object(
    'pessoa', (select jsonb_build_object('nome',p.nome,'telefone',p.telefone,'email',p.email,'estado_civil',p.estado_civil,'banco', case when dono then p.banco end, 'dono', dono) from public.pessoas p where p.id = pid),
    'contratos', coalesce((select jsonb_agg(jsonb_build_object('token',x.token,'papel',x.papel,'numero',c.numero,'etapa',c.etapa,'tarefas',c.tarefas,'situacao',c.situacao,
        'aluguel',c.aluguel,'entrada',c.entrada,'garantia',c.garantia,'imovel_id',c.imovel_id,'captacao_id',i.captacao_id,
        'imovel',i.titulo,'endereco',i.endereco,'bairro',i.bairro,'tipo',i.tipo,
        'abertos',(select count(*) from public.chamados h where h.contrato_id = c.id and h.pessoa_id = pid and h.status <> 'resolvido')) order by c.created_at desc)
      from public.partes x join public.contratos c on c.id = x.contrato_id join public.imoveis i on i.id = c.imovel_id where x.pessoa_id = pid), '[]'::jsonb),
    'imoveis', coalesce((select jsonb_agg(jsonb_build_object('id',i.id,'titulo',i.titulo,'endereco',i.endereco,'bairro',i.bairro,'tipo',i.tipo,'status',i.status,
        'finalidade',i.finalidade,'aluguel',i.aluguel,'valor_venda',i.valor_venda,'loft_codigo',i.loft_codigo,'captacao_id',i.captacao_id))
      from public.imoveis i where i.proprietario_id = pid), '[]'::jsonb),
    'captacoes', coalesce((select jsonb_agg(jsonb_build_object('id',c.id,'numero',c.numero,'etapa',c.etapa,'finalidade',c.finalidade,'loft_codigo',c.loft_codigo,
        'titulo', case when c.texto_aprovado then c.titulo end, 'descricao', case when c.texto_aprovado then c.descricao end,
        'ficha', jsonb_build_object('categoria',c.ficha->>'categoria','bairro',c.ficha->>'bairro','condominio',c.ficha->>'condominio','endereco',c.ficha->>'endereco',
                 'area_util',c.ficha->>'area_util','dormitorios',c.ficha->>'dormitorios','suites',c.ficha->>'suites','vagas',c.ficha->>'vagas',
                 'valor_venda',c.ficha->>'valor_venda','valor_locacao',c.ficha->>'valor_locacao'),
        'link', case when c.etapa < 5 then c.prop_token end, 'corretor', c.corretor, 'created_at', c.created_at,
        'fotos', coalesce((select jsonb_agg(f.path order by f.capa desc, f.ordem) from public.captacao_fotos f where f.captacao_id = c.id), '[]'::jsonb)) order by c.created_at desc)
      from public.captacoes c where c.proprietario_id = pid), '[]'::jsonb),
    'visitas', coalesce((select jsonb_agg(jsonb_build_object('id',v.id,'captacao_id',coalesce(v.captacao_id,i.captacao_id),'imovel_id',v.imovel_id,'quando',v.quando,'status',v.status,
        'feedback',v.feedback,'interesse',v.interesse,'corretor',v.corretor) order by v.quando desc)
      from public.visitas v left join public.imoveis i on i.id = v.imovel_id left join public.captacoes c on c.id = v.captacao_id
      where c.proprietario_id = pid or i.proprietario_id = pid), '[]'::jsonb),
    'propostas', coalesce((select jsonb_agg(jsonb_build_object('id',r.id,'captacao_id',coalesce(r.captacao_id,i.captacao_id),'imovel_id',r.imovel_id,'data',r.data,'tipo',r.tipo,'valor',r.valor,
        'condicoes',r.condicoes,'status',r.status,'resposta_prop',r.resposta_prop,'status_prop',r.status_prop) order by r.data desc, r.created_at desc)
      from public.propostas r left join public.imoveis i on i.id = r.imovel_id left join public.captacoes c on c.id = r.captacao_id
      where c.proprietario_id = pid or i.proprietario_id = pid), '[]'::jsonb),
    'chamados', coalesce((select jsonb_agg(jsonb_build_object('protocolo',h.protocolo,'titulo',h.titulo,'status',h.status,'created_at',h.created_at,'updated_at',h.updated_at,
        'imovel',i.titulo,'token',x.token) order by h.updated_at desc)
      from public.chamados h join public.contratos c on c.id = h.contrato_id join public.imoveis i on i.id = c.imovel_id
      join public.partes x on x.contrato_id = h.contrato_id and x.pessoa_id = pid where h.pessoa_id = pid), '[]'::jsonb),
    'documentos', coalesce((select jsonb_agg(jsonb_build_object('tipo',d.tipo,'status',d.status)) from public.documentos d where d.pessoa_id = pid), '[]'::jsonb),
    'tem_senha', true);
end $$;
grant execute on function public.plus_home(text) to anon, authenticated;

create or replace function public.plus_salvar(p_sessao text, p_nome text, p_telefone text, p_email text, p_estado text, p_banco text) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public._plus_pessoa(p_sessao); dono boolean;
begin
  dono := exists(select 1 from public.imoveis where proprietario_id = pid) or exists(select 1 from public.captacoes where proprietario_id = pid)
       or exists(select 1 from public.partes where pessoa_id = pid and papel = 'proprietario');
  if length(public._cel(p_telefone)) < 10 then raise exception 'Informe o WhatsApp com DDD'; end if;
  update public.pessoas set nome = coalesce(nullif(trim(p_nome),''), nome), telefone = trim(p_telefone), email = lower(trim(coalesce(p_email,''))),
    estado_civil = coalesce(p_estado, estado_civil), banco = case when dono then trim(coalesce(p_banco, banco)) else banco end where id = pid;
end $$;
grant execute on function public.plus_salvar(text,text,text,text,text,text) to anon, authenticated;

create or replace function public.plus_trocar_senha(p_sessao text, p_atual text, p_nova text) returns void
language plpgsql security definer set search_path = public, extensions as $$
declare pid uuid := public._plus_pessoa(p_sessao);
begin
  if length(coalesce(p_nova,'')) < 6 then raise exception 'A nova senha precisa ter pelo menos 6 caracteres'; end if;
  if not exists(select 1 from public.pessoas where id = pid and senha_hash = crypt(coalesce(p_atual,''), senha_hash)) then raise exception 'Senha atual incorreta'; end if;
  update public.pessoas set senha_hash = crypt(p_nova, gen_salt('bf')) where id = pid;
end $$;
grant execute on function public.plus_trocar_senha(text,text,text) to anon, authenticated;

create or replace function public.plus_sair(p_sessao text) returns void
language sql security definer set search_path = public as $$ delete from public.cliente_sessoes where token = p_sessao $$;
grant execute on function public.plus_sair(text) to anon, authenticated;

create or replace function public.plus_proposta_resp(p_sessao text, p_id uuid, p_status text, p_obs text) returns void
language plpgsql security definer set search_path = public as $$
declare pid uuid := public._plus_pessoa(p_sessao);
begin
  if p_status not in ('Quero aceitar','Não aceito','Quero conversar') then raise exception 'Resposta inválida'; end if;
  update public.propostas r set status_prop = p_status, resposta_prop = left(nullif(trim(p_obs),''),500), respondida_em = now()
   where r.id = p_id and r.status = 'em_analise'
     and (exists(select 1 from public.captacoes c where c.id = r.captacao_id and c.proprietario_id = pid)
       or exists(select 1 from public.imoveis i where i.id = r.imovel_id and i.proprietario_id = pid));
  if not found then raise exception 'Proposta não encontrada ou já encerrada'; end if;
end $$;
grant execute on function public.plus_proposta_resp(text,uuid,text,text) to anon, authenticated;
select 'ok' as status;
