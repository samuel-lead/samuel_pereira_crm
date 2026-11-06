-- Inove Gôndolas (Samuel, 06/11/26): "Sem conversa iniciada" vira "Dia 1" e
-- entram mais quatro colunas depois dela — Dia 2, Dia 3, Dia 4 e Dia 5 —
-- antes de "Em qualificação". Os leads que estavam em "Sem conversa
-- iniciada" (nível 1) continuam no mesmo nível, agora chamado "Dia 1": nada
-- é movido nem apagado.
--
-- Os números novos são 11 a 14 (o código inteiro usa os números atuais: 3 =
-- Leads para o Elton, 9 = Base...). A POSIÇÃO no funil (entre 1 e 2) é
-- tratada no código por posicaoNoFunil() em painel/lib/niveis.ts. Só a
-- Inove ganha essas linhas; as demais empresas não mudam.

alter table niveis drop constraint if exists niveis_ordem_check;
alter table niveis add constraint niveis_ordem_check check (ordem >= 0 and ordem <= 14);

update niveis
set nome = 'Dia 1',
    definicao = 'Primeiro dia de abordagem: mensagem enviada, lead ainda não respondeu',
    prazo_dias = null,
    destino_ao_estourar = null,
    etiqueta_wpp = 'Dia 1',
    numerado = false
where org_id = '1820eb20-9fae-46fd-a986-2dfbe1b5702a' and ordem = 1;

insert into niveis (org_id, ordem, nome, definicao, etiqueta_wpp, numerado, destacado)
select '1820eb20-9fae-46fd-a986-2dfbe1b5702a', v.ordem, v.nome, v.definicao, v.nome, false, false
from (values
  (11, 'Dia 2', 'Segundo dia de abordagem'),
  (12, 'Dia 3', 'Terceiro dia de abordagem'),
  (13, 'Dia 4', 'Quarto dia de abordagem'),
  (14, 'Dia 5', 'Quinto dia de abordagem')
) as v(ordem, nome, definicao)
on conflict (org_id, ordem) do nothing;
