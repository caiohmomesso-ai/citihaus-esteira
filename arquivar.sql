-- Citihaus · arquivar o que chegou ao fim da esteira
alter table public.captacoes add column if not exists arquivada_em timestamptz;
alter table public.chamados add column if not exists arquivado_em timestamptz;
select 'ok' as status;
