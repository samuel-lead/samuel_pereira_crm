-- Samuel (21/10/26): a empresa "Inove Gôndolas" não usa Bônus SDR por
-- enquanto. Esconde a página de Bônus SDR e a parte de bônus nas
-- Configurações (mesma regra aplicada à Banker - Consorcio).
update public.orgs
set paginas_ocultas = array['/bonus-sdr', 'config:bonus']
where id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a';
