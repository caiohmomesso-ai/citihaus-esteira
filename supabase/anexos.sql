-- Citihaus · nomes de arquivo para os tipos novos de documento (RG, renda, contrato social…)
-- e tolerância ao sufixo -<timestamp>, usado quando a mesma pessoa anexa vários documentos "extra".
create or replace function public.concluir_upload(p_ticket uuid, p_path text, p_ext text) returns text
language plpgsql security definer set search_path = public as $$
declare u public.uploads; p public.partes; nm text; arq text; prot text; rotulo text; base text;
  nomes constant jsonb := jsonb_build_object(
    'cnh','CNH','resid','Comprovante_Residencia','cert','Certidao','cnhc','CNH_Conjuge',
    'mat','Matricula','iptu','IPTU','contas','Contas_Consumo','rg','RG','cpf','CPF',
    'renda','Comprovante_Renda','ir','Imposto_de_Renda','social','Contrato_Social','cnpj','Cartao_CNPJ',
    'procuracao','Procuracao','estadocivil','Estado_Civil','outro','Documento');
  textos constant jsonb := jsonb_build_object(
    'cnh','CNH','resid','comprovante de residência','cert','certidão','cnhc','CNH do cônjuge',
    'mat','matrícula','iptu','IPTU','contas','contas de consumo','rg','RG','cpf','CPF',
    'renda','comprovante de renda','ir','imposto de renda','social','contrato social','cnpj','cartão CNPJ',
    'procuracao','procuração','estadocivil','comprovante de estado civil','outro','documento');
begin
  if p_ext !~ '^[a-z0-9]{1,5}$' then raise exception 'Tipo de arquivo inválido'; end if;
  select * into u from public.uploads where id = p_ticket and not usado for update;
  if not found then raise exception 'Envio já processado ou expirado. Atualize a página.'; end if;
  if p_path <> 'tickets/' || p_ticket::text || '/arquivo.' || p_ext then raise exception 'Caminho inválido'; end if;
  if not exists (select 1 from storage.objects where bucket_id = 'documentos' and name = p_path) then
    raise exception 'O arquivo não chegou. Tente enviar de novo.';
  end if;
  update public.uploads set usado = true where id = u.id;
  select * into p from public.partes where id = u.parte_id;
  select nome into nm from public.pessoas where id = p.pessoa_id;
  base := regexp_replace(coalesce(u.doc_tipo,''), '-[0-9]{6,}$', '');
  if u.chamado_id is not null then
    select protocolo into prot from public.chamados where id = u.chamado_id;
    arq := prot || '_' || to_char(now() at time zone 'America/Sao_Paulo', 'HH24MISS') || '.' || p_ext;
    insert into public.mensagens (chamado_id, autor, autor_nome, texto, anexo, anexo_url)
      values (u.chamado_id, case when u.origem = 'equipe' then 'equipe' else 'cliente' end, coalesce(nm,''), '', arq, 'storage:' || p_path);
    update public.chamados set updated_at = now() where id = u.chamado_id;
  else
    arq := coalesce(nomes ->> base, base) || '_' || coalesce(nullif(public._slug(nm),''), p.papel) || '.' || p_ext;
    insert into public.documentos (pessoa_id, tipo, status, arquivo, drive_file_id, drive_url, obs, updated_at)
      values (p.pessoa_id, u.doc_tipo, 'enviado', arq, null, 'storage:' || p_path, '', now())
      on conflict (pessoa_id, tipo) do update set status = 'enviado', arquivo = excluded.arquivo, drive_file_id = null,
        drive_url = excluded.drive_url, obs = '', updated_at = now();
    rotulo := coalesce(textos ->> base, base);
    insert into public.historico (contrato_id, texto) values (p.contrato_id,
      case when u.origem = 'equipe' then 'Equipe anexou ' || rotulo || ' de ' || coalesce(nullif(nm,''), p.papel)
           else coalesce(nullif(nm,''), initcap(p.papel)) || ' enviou ' || rotulo end);
  end if;
  return arq;
end $$;
grant execute on function public.concluir_upload(uuid,text,text) to anon, authenticated;
select 'ok' as status;
