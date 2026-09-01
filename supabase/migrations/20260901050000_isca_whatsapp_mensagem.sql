-- Mensagem customizada que já vem preenchida quando a pessoa clica no
-- botão de WhatsApp (isca "só cadastro") — Samuel escreve na hora que
-- cria a isca (ex.: "Acabei de ver sua palestra no evento X"), assim ele
-- sabe de onde veio o contato só de ler a mensagem que chegou.
alter table iscas add column if not exists whatsapp_mensagem text;
