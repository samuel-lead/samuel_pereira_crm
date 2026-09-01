-- Permite criar uma isca "só cadastro" — sem material nenhum pra
-- entregar, só qualifica o lead e (opcionalmente) manda ela falar direto
-- com a equipe pelo WhatsApp assim que termina de preencher.
alter table iscas alter column material_url drop not null;
alter table iscas add column whatsapp_contato_e164 text;
