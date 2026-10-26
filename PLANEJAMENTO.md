# Planejamento — App Mobile de Análise de Conversas

## Objetivo
App **mobile** (web mobile) para analisar conversas entre **duas pessoas de uma empresa**.
Importa um `.txt` do WhatsApp, calcula métricas, lista palavras mais usadas e deixa registrar defeitos de comunicação.

## Stack
- **Frontend:** HTML + CSS + JS vanilla, mobile-first
- **Ícones:** SVG inline estilo Feather (sem emojis)
- **Tema:** escuro
- **Backend:** Supabase (Auth + Postgres + REST)

## Telas
1. **Login** — email + senha
2. **Cadastro** — nome, cargo, email, senha
3. **Dashboard** — métricas da conversa (tempo resposta A/B, volume, defeitos, palavras)
4. **Selecionar par de pessoas** — escolher as 2 pessoas antes de analisar
5. **Importar conversa** — upload do `.txt` do WhatsApp
6. **Lista de defeitos** — CRUD completo
7. **Palavras** — ranking top 50 com filtro por pessoa

## Estrutura de arquivos
```
app lista/
├── PLANEJAMENTO.md
├── SUPABASE_SETUP.md       ← guia passo a passo (ler primeiro!)
├── mockup.html              ← mockup visual (referência)
├── index.html               ← app principal (dashboard + navegação SPA)
├── login.html               ← tela de login
├── cadastro.html            ← tela de cadastro
├── supabase/
│   └── schema.sql           ← SQL para rodar no Supabase
├── css/
│   └── style.css            ← estilos compartilhados
└── js/
    ├── config.js            ← SUPABASE_URL e ANON_KEY (preencher!)
    ├── supabase.js          ← cria o cliente
    ├── auth.js              ← login/signup/logout
    ├── app.js               ← bootstrap + navegação
    ├── importar.js          ← parser do .txt do WhatsApp
    ├── defeitos.js
    └── palavras.js
```

## Schema do Supabase (em `supabase/schema.sql`)
- `perfis` → estende `auth.users` com nome/cargo
- `pessoas` → colaboradores analisados (não precisam ter login)
- `conversas` → par (pessoa_a, pessoa_b)
- `mensagens` → mensagens importadas do .txt
- `defeitos` → problemas de comunicação registrados
- **RLS** ativo em tudo: cada usuário só vê seus próprios dados

## Fluxo do usuário
1. Abre o app → se não logado, vai pra `login.html`
2. Faz login/cadastro
3. Cadastra 2 pessoas (Maria, João)
4. Importa `.txt` do WhatsApp
5. App parseia, salva mensagens, mostra dashboard
6. Pode registrar defeitos em cima da conversa

## Formato do .txt do WhatsApp (PT-BR)
```
[22/10/2023, 14:35:12] Maria: olá
[22/10/2023, 14:36:45] João: oi, tudo bem?
```
Também aceita formato sem colchetes:
```
22/10/2023 14:35 - Maria: olá
```

## Próximos passos
1. ✅ Planejamento
2. ✅ Mockup
3. 🔜 Seguir `SUPABASE_SETUP.md` (criar conta + projeto + rodar SQL)
4. 🔜 Preencher `js/config.js` com as chaves
5. 🔜 Abrir `login.html` e testar
