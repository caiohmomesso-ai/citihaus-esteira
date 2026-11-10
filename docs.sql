-- Citihaus · Documentos e comunicados (biblioteca de modelos para a equipe + modelos de mensagem)
create table if not exists public.doc_modelos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, categoria text not null default 'Outros', descricao text,
  path text not null, nome_arquivo text, mime text, tamanho bigint,
  criado_por text, created_at timestamptz not null default now());
alter table public.doc_modelos enable row level security;
drop policy if exists equipe_tudo on public.doc_modelos;
create policy equipe_tudo on public.doc_modelos for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

create table if not exists public.com_modelos (
  id uuid primary key default gen_random_uuid(),
  titulo text not null, categoria text not null default 'Geral', assunto text, texto text not null,
  ordem int not null default 100, criado_por text, created_at timestamptz not null default now());
alter table public.com_modelos enable row level security;
drop policy if exists equipe_tudo on public.com_modelos;
create policy equipe_tudo on public.com_modelos for all to authenticated using (public.is_equipe()) with check (public.is_equipe());

-- bucket privado para os arquivos-modelo (só a equipe lê e envia)
insert into storage.buckets (id, name, public) values ('modelos','modelos', false) on conflict (id) do nothing;
drop policy if exists modelos_equipe_ler on storage.objects;
create policy modelos_equipe_ler on storage.objects for select to authenticated using (bucket_id = 'modelos' and public.is_equipe());
drop policy if exists modelos_equipe_enviar on storage.objects;
create policy modelos_equipe_enviar on storage.objects for insert to authenticated with check (bucket_id = 'modelos' and public.is_equipe());
drop policy if exists modelos_equipe_apagar on storage.objects;
create policy modelos_equipe_apagar on storage.objects for delete to authenticated using (bucket_id = 'modelos' and public.is_equipe());

-- modelos de comunicado iniciais (seguindo as regras de documentos da Citihaus)
insert into public.com_modelos (titulo, categoria, assunto, ordem, texto)
select * from (values
 ('Pedido de documentos · Inquilino','Documentos','Documentos para a locação', 10,
'Olá, {nome}! Tudo bem? Aqui é {corretor}, da Citihaus 🧡

Para seguirmos com a locação do imóvel {imovel}, preciso destes documentos:

• CNH (frente e verso)
• Comprovante de residência atual
• Certidão de nascimento ou casamento
• Comprovante de renda
• E-mail e telefone para contato

Se for casado(a), mande também os documentos do cônjuge.

Pode me enviar por aqui mesmo. Qualquer dúvida, estou à disposição!'),
 ('Pedido de documentos · Fiador','Documentos','Documentos do fiador', 20,
'Olá, {nome}! Tudo bem? Aqui é {corretor}, da Citihaus 🧡

Você foi indicado(a) como fiador(a) na locação do imóvel {imovel}. Para seguirmos, preciso de:

• CNH (frente e verso)
• Comprovante de residência atual
• Certidão de nascimento ou casamento
• Matrícula atualizada do imóvel dado em garantia
• E-mail e telefone para contato

Se a matrícula vier desatualizada, cobramos uma taxa de R$ 70,00 para atualizar (PIX no CNPJ da Citihaus).
Se for casado(a), mande também os documentos do cônjuge.

Obrigado!'),
 ('Pedido de documentos · Proprietário','Documentos','Documentos do proprietário', 30,
'Olá, {nome}! Tudo bem? Aqui é {corretor}, da Citihaus 🧡

Para prepararmos o contrato do imóvel {imovel}, preciso de:

• CNH (frente e verso)
• Comprovante de residência atual
• Certidão de nascimento ou casamento
• Dados bancários para o repasse do aluguel
• Capa do IPTU do imóvel
• Contas de consumo (energia, água, gás e condomínio)
• E-mail e telefone para contato

Se for casado(a), mande também os documentos do cônjuge.

Obrigado pela confiança!'),
 ('Cobrar documento pendente','Documentos','Documento pendente', 40,
'Olá, {nome}! Aqui é {corretor}, da Citihaus 🧡

Passando para lembrar que ainda falta o seguinte documento para darmos andamento no imóvel {imovel}:

•

Assim que puder, me envie por aqui. Obrigado!'),
 ('Boas-vindas · Locação','Locação','Bem-vindo(a) à Citihaus', 50,
'Olá, {nome}! Seja bem-vindo(a) à Citihaus 🧡

Seu contrato do imóvel {imovel} está ativo. A partir de agora, qualquer necessidade (manutenção, segunda via de boleto, dúvidas) é só falar com a gente por este número ou abrir um chamado no portal Citihaus+.

Conte com a gente!'),
 ('Lembrete de vistoria','Locação','Vistoria do imóvel', 60,
'Olá, {nome}! Aqui é da Citihaus 🧡

A vistoria do imóvel {imovel} está marcada para {data}. Depois que você receber o laudo, tem 7 dias úteis para nos avisar por escrito se discordar de algum ponto. Sem manifestação nesse prazo, o laudo fica aceito.

Qualquer dúvida, estamos à disposição!'),
 ('Seguro incêndio','Locação','Seguro incêndio', 70,
'Olá, {nome}! Aqui é da Citihaus 🧡

O seguro incêndio do imóvel {imovel} é obrigatório e precisa estar ativo antes da entrega das chaves. Podemos fazer a cotação para você? É só me responder por aqui.

Obrigado!'),
 ('Agendamento de visita','Comercial','Visita ao imóvel', 80,
'Olá, {nome}! Aqui é {corretor}, da Citihaus 🧡

Confirmando nossa visita ao imóvel {imovel} em {data}. Se precisar remarcar, é só me avisar por aqui.

Até lá!'),
 ('Retorno após visita','Comercial','Sobre a visita', 90,
'Olá, {nome}! Aqui é {corretor}, da Citihaus 🧡

O que achou do imóvel {imovel}? Se quiser, posso montar uma proposta ou te mostrar outras opções parecidas.

Fico no aguardo!'),
 ('Aviso geral','Geral','Comunicado Citihaus', 100,
'Olá, {nome}! Aqui é da Citihaus 🧡

')
) v(titulo,categoria,assunto,ordem,texto)
where not exists (select 1 from public.com_modelos);
select 'ok' as status;
