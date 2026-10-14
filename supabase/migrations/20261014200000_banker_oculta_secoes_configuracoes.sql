-- Samuel (14/10/26): na Banker - Consorcio, Configurações não mostra
-- "Valores do bônus" nem "Metas e taxas do sistema". Só esconde na tela.
update public.orgs
set paginas_ocultas = array['/bonus-sdr', '/iscas', 'config:metas', 'config:bonus']
where id = 'd17407b1-60ea-4fa9-9a0a-a9fff37a85ed';
