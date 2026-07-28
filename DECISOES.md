# Decisões técnicas

Registro de escolhas técnicas não especificadas no BUILD.md/PRD, mais simples e seguidas em frente.

## 2026-07-28 — Reorganização inicial do repositório

Uma sessão anterior já tinha criado um scaffold Next.js solto na raiz do repositório (antes de eu ler o BUILD.md real). Como nada disso tinha sido commitado ainda, movi esses arquivos para dentro de `/painel/`, que é onde o BUILD.md pede que o painel Next.js fique (Fase 7). Nada foi perdido, só reorganizado.

Também copiei `CLAUDE.md`, `docs/BUILD.md` e `docs/PRD-meu-vendedor.md` de `~/Downloads/docs_files/` para dentro do repositório, para que fiquem versionados junto com o código em vez de ficarem soltos na pasta de Downloads.
