# App Lista — Análise de Conversas

App mobile (PWA) para analisar conversas entre duas pessoas de uma empresa a partir de um `.txt` exportado do WhatsApp. Mostra tempo médio de resposta por pessoa, palavras mais usadas, volume por dia e permite registrar defeitos de comunicação.

## Stack

- HTML + CSS + JavaScript vanilla (mobile-first)
- Supabase (Auth + Postgres + REST)
- PWA (service worker + manifest)

## Como rodar (local)

1. Siga **`SUPABASE_SETUP.md`** pra criar sua conta e projeto Supabase (passo a passo).
2. Rode **`supabase/schema.sql`** no SQL Editor do Supabase.
3. Preencha **`js/config.js`** com a `Project URL` e a `publishable key`.
4. No VS Code, instale a extensão **Live Server**.
5. Abra **`login.html`** com Live Server.
6. Cadastre uma conta, adicione 2 pessoas, importe seu `.txt`.

## Deploy (produção)

Guia completo passo a passo em **`DEPLOY.md`** — deploy no Netlify em ~3 minutos via GitHub.
Cada push na `main` dispara um deploy automático.

## Estrutura

```
.
├── index.html / login.html / cadastro.html
├── mockup.html             # mockup visual
├── manifest.webmanifest    # PWA
├── sw.js                   # service worker
├── favicon.svg / icon.svg
├── css/style.css
├── js/
│   ├── config.js           # chaves do Supabase (preencher!)
│   ├── supabase.js         # cliente
│   ├── auth.js
│   ├── pwa.js
│   ├── importar.js         # parser do .txt WhatsApp
│   ├── metricas.js
│   └── app.js
└── supabase/schema.sql
```

## Features

- Login + cadastro com Supabase Auth
- Import de `.txt` do WhatsApp (PT-BR, 2 formatos)
- Tempo médio de resposta por pessoa
- Volume por dia
- Top 50 palavras com split por pessoa
- Normalização de variações (`kkk`/`kkkk`/`kkkkk` → `kkk`, `hum`/`hmm`/`hmmm` → `hmm`)
- Filtro para mídia oculta
- Registro de defeitos de comunicação
- PWA instalável + cache offline
