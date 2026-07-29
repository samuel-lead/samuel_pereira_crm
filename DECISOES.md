# Decisões técnicas

Registro de escolhas técnicas não especificadas no BUILD.md/PRD, mais simples e seguidas em frente.

## 2026-07-28 — Reorganização inicial do repositório

Uma sessão anterior já tinha criado um scaffold Next.js solto na raiz do repositório (antes de eu ler o BUILD.md real). Como nada disso tinha sido commitado ainda, movi esses arquivos para dentro de `/painel/`, que é onde o BUILD.md pede que o painel Next.js fique (Fase 7). Nada foi perdido, só reorganizado.

Também copiei `CLAUDE.md`, `docs/BUILD.md` e `docs/PRD-meu-vendedor.md` de `~/Downloads/docs_files/` para dentro do repositório, para que fiquem versionados junto com o código em vez de ficarem soltos na pasta de Downloads.

## 2026-07-28 — Como um contato vira lead (resolve pergunta aberta do PRD §14.6)

O Samuel confirmou a regra: nenhum contato do WhatsApp vira lead sozinho, nunca por decisão automática do sistema. Só existem dois caminhos:

1. **Declaração direta** — o Samuel fala pelo Canal A ("captura esse contato, é um lead"), como já descrito no PRD/CLAUDE.md.
2. **Pergunta do sistema** — ao notar uma conversa nova no Canal B que pode ser um lead (Fase 9), o sistema **pergunta** ao Samuel se é lead, e só grava depois do "sim". Nunca cadastra sozinho.

Isso vale como especificação para a Fase 9 (movimentação automática lendo o Canal B): a detecção de "lead novo" a partir do Canal B é sempre um `pergunta antes`, nunca um `move e avisa` — mesmo que a tabela do CLAUDE.md trate outras transições (1→2, 2→3, 1→6) como automáticas sem pedir permissão. Criar um lead do zero é diferente de mover um lead que já existe.
