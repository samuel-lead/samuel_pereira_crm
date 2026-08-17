-- Adiciona um estágio "Leads" (ordem 0), antes do Nível 1: lead cadastrado
-- mas ainda não abordado (nenhuma mensagem mandada). É diferente do Nível 1
-- ("mandei mensagem, não engatou") — esse já pressupõe contato feito.
-- Sem número na tela, igual "Reunião marcada".

alter table public.niveis drop constraint niveis_ordem_check;
alter table public.niveis add constraint niveis_ordem_check check (ordem between 0 and 7);

insert into public.niveis (org_id, ordem, nome, definicao, prazo_dias, destino_ao_estourar, etiqueta_wpp, numerado)
select id, 0, 'Leads', 'Lead cadastrado, ainda não abordado (nenhuma mensagem enviada)', null, null, 'Leads', false
from public.orgs;

-- leads novos passam a nascer em "Leads" (0), não direto no Nível 1
alter table public.leads alter column nivel_ordem set default 0;
