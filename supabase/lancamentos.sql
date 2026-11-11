-- Citihaus · Lançamentos: empreendimento, unidades disponíveis, tabelas de pagamento e arquivos da construtora
create table if not exists public.empreendimentos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  construtora text,
  status text not null default 'Lançamento' check (status in ('Breve lançamento','Lançamento','Em obras','Pronto para morar','Encerrado')),
  tipo text not null default 'Apartamento',
  endereco text, bairro text, cidade text default 'São José do Rio Preto',
  entrega date,
  dormitorios text, areas text, vagas text,
  unidades_total int, torres int,
  lazer text, diferenciais text, descricao text,
  comissao numeric, corretor text, contato text, site text,
  arquivado_em timestamptz,
  criado_por text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());

create table if not exists public.lanc_unidades (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  torre text, unidade text, andar text, tipologia text,
  area numeric, dormitorios int, suites int, vagas int, posicao text,
  valor numeric,
  status text not null default 'Disponível' check (status in ('Disponível','Reservada','Vendida','Permuta','Bloqueada')),
  obs text, ordem int not null default 0,
  atualizado_em timestamptz not null default now(), created_at timestamptz not null default now());
create index if not exists lanc_un_emp on public.lanc_unidades(empreendimento_id, ordem);

create table if not exists public.lanc_tabelas (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  nome text not null,
  entrada_pct numeric, parcelas int, parcelas_pct numeric,
  reforcos int, reforcos_pct numeric, reforco_quando text,
  chaves_pct numeric, indice text, obs text, vigencia date,
  ordem int not null default 0, created_at timestamptz not null default now());
create index if not exists lanc_tb_emp on public.lanc_tabelas(empreendimento_id, ordem);

create table if not exists public.lanc_arquivos (
  id uuid primary key default gen_random_uuid(),
  empreendimento_id uuid not null references public.empreendimentos(id) on delete cascade,
  titulo text not null, tipo text not null default 'Tabela de preços',
  path text not null, nome_arquivo text, mime text, tamanho bigint,
  criado_por text, created_at timestamptz not null default now());
create index if not exists lanc_ar_emp on public.lanc_arquivos(empreendimento_id);

alter table public.empreendimentos enable row level security;
alter table public.lanc_unidades enable row level security;
alter table public.lanc_tabelas enable row level security;
alter table public.lanc_arquivos enable row level security;
drop policy if exists equipe_tudo on public.empreendimentos;
create policy equipe_tudo on public.empreendimentos for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
drop policy if exists equipe_tudo on public.lanc_unidades;
create policy equipe_tudo on public.lanc_unidades for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
drop policy if exists equipe_tudo on public.lanc_tabelas;
create policy equipe_tudo on public.lanc_tabelas for all to authenticated using (public.is_equipe()) with check (public.is_equipe());
drop policy if exists equipe_tudo on public.lanc_arquivos;
create policy equipe_tudo on public.lanc_arquivos for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

-- troca a lista de unidades de uma vez (substituir) ou atualiza por torre+unidade (incluir)
create or replace function public.lanc_importar(p_emp uuid, p_itens jsonb, p_substituir boolean default true) returns jsonb
language plpgsql security definer set search_path = public as $$
declare n_ins int := 0; n_upd int := 0; n_del int := 0; it jsonb; i int := 0; achou uuid;
begin
  if not public.is_equipe() then raise exception 'Acesso negado'; end if;
  if not exists(select 1 from public.empreendimentos where id = p_emp) then raise exception 'Empreendimento não encontrado'; end if;
  if jsonb_typeof(p_itens) <> 'array' or jsonb_array_length(p_itens) = 0 then raise exception 'Nenhuma unidade para importar'; end if;
  if coalesce(p_substituir, true) then
    delete from public.lanc_unidades where empreendimento_id = p_emp; get diagnostics n_del = row_count;
  end if;
  for it in select * from jsonb_array_elements(p_itens) loop
    i := i + 1;
    achou := null;
    if not coalesce(p_substituir, true) then
      select u.id into achou from public.lanc_unidades u
       where u.empreendimento_id = p_emp
         and coalesce(lower(trim(u.torre)),'') = coalesce(lower(trim(it->>'torre')),'')
         and coalesce(lower(trim(u.unidade)),'') = coalesce(lower(trim(it->>'unidade')),'') limit 1;
    end if;
    if achou is not null then
      update public.lanc_unidades set
        andar = coalesce(nullif(it->>'andar',''), andar), tipologia = coalesce(nullif(it->>'tipologia',''), tipologia),
        area = coalesce((it->>'area')::numeric, area), dormitorios = coalesce((it->>'dormitorios')::int, dormitorios),
        suites = coalesce((it->>'suites')::int, suites), vagas = coalesce((it->>'vagas')::int, vagas),
        posicao = coalesce(nullif(it->>'posicao',''), posicao), valor = coalesce((it->>'valor')::numeric, valor),
        status = coalesce(nullif(it->>'status',''), status), obs = coalesce(nullif(it->>'obs',''), obs),
        atualizado_em = now()
       where id = achou;
      n_upd := n_upd + 1;
    else
      insert into public.lanc_unidades (empreendimento_id, torre, unidade, andar, tipologia, area, dormitorios, suites, vagas, posicao, valor, status, obs, ordem)
      values (p_emp, nullif(trim(it->>'torre'),''), nullif(trim(it->>'unidade'),''), nullif(trim(it->>'andar'),''), nullif(trim(it->>'tipologia'),''),
              (it->>'area')::numeric, (it->>'dormitorios')::int, (it->>'suites')::int, (it->>'vagas')::int, nullif(trim(it->>'posicao'),''),
              (it->>'valor')::numeric, coalesce(nullif(trim(it->>'status'),''),'Disponível'), nullif(trim(it->>'obs'),''), i);
      n_ins := n_ins + 1;
    end if;
  end loop;
  update public.empreendimentos set updated_at = now() where id = p_emp;
  return jsonb_build_object('incluidas', n_ins, 'atualizadas', n_upd, 'removidas', n_del);
end $$;
revoke execute on function public.lanc_importar(uuid, jsonb, boolean) from anon;
grant execute on function public.lanc_importar(uuid, jsonb, boolean) to authenticated;
select 'ok' as status;
