-- Pixel do Meta e tag do Google, um por empresa — vale pra todas as iscas
-- dessa empresa. Disparam só quando o lead termina o cadastro na página
-- pública da isca (evento "Lead" no Meta / "generate_lead" no Google).
alter table orgs add column meta_pixel_id text;
alter table orgs add column google_tag_id text;
