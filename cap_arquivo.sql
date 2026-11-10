-- Citihaus · captação concluída pode sair da esteira (continua em Imóveis)
alter table public.captacoes add column if not exists arquivada_em timestamptz;
select 'ok' as status;
