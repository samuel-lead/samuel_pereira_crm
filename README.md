# Meu Vendedor

CRM comercial controlado por WhatsApp. Veja `CLAUDE.md` (regras do projeto) e `docs/PRD-meu-vendedor.md` (produto) e `docs/BUILD.md` (plano de execução).

## Estrutura

```
supabase/migrations/   banco de dados (SQL versionado)
supabase/functions/    Edge Functions (webhook, agente, workers)
painel/                painel web (Next.js) — fase 7
docs/                   documentação do produto
```

## Setup

1. Copie `.env.example` para `.env` e preencha as chaves (Supabase, Z-API, Anthropic).
2. Nunca commite `.env`.
