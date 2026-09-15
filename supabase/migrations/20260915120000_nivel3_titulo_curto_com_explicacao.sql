-- "Topou reunião, horário a definir" já tinha sido encurtado uma vez
-- antes (ver 20260817201342_encurta_nome_nivel_3.sql) por não caber numa
-- linha só — o cabeçalho novo do Kanban (bolinha + título + pílula do
-- número na mesma linha) deixou ainda menos espaço, e voltou a estourar.
-- Em vez de encurtar de novo (só adia o mesmo problema), separa em
-- título curto + explicação — o Kanban já sabe renderizar esse padrão
-- "Título (explicação)" como duas linhas, título em negrito numa linha só
-- e a explicação embaixo, menor (ver separarExplicacao em
-- components/kanban-board.tsx).
update public.niveis
set nome = 'Topou reunião (horário a definir)'
where nome = 'Topou reunião, horário a definir';
