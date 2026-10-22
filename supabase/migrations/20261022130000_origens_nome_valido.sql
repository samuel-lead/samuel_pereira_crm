-- Samuel (22/10/26): "não cometa esse erro novamente em nenhum CRM". Trava no
-- BANCO: uma origem não pode ser data, hora, só número (CNPJ/telefone) nem ter
-- mais de 60 caracteres. Vale pra qualquer caminho (importação, cadastro,
-- script). "not valid" = só vale pras origens novas; as antigas não são tocadas.
alter table public.origens
  add constraint origens_nome_valido
  check (
    length(btrim(nome)) between 1 and 60
    and nome !~ '^[0-9]{1,2}[/.-][0-9]{1,2}[/.-][0-9]{2,4}$'
    and nome !~ '^[0-9]{1,2}:[0-9]{2}(:[0-9]{2})?$'
    and nome !~ '^[0-9.,/[:space:]-]+$'
  ) not valid;
