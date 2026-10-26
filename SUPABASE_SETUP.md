# Guia Supabase — Passo a Passo (primeira vez)

Supabase é um backend pronto (banco Postgres + autenticação + API). Grátis até certo limite. Não precisa instalar nada no computador — tudo pelo navegador.

---

## Passo 1 — Criar conta

1. Acesse **https://supabase.com**
2. Clique em **"Start your project"** (canto superior direito)
3. Faça login com GitHub, Google ou email

---

## Passo 2 — Criar o projeto

1. Depois de logado, clique em **"New Project"**
2. Preencha:
   - **Name:** `app-lista` (ou o nome que quiser)
   - **Database Password:** gere uma senha forte e **salve em algum lugar seguro** (você precisa dela se for mexer no banco diretamente)
   - **Region:** `South America (São Paulo)` — mais rápido pro Brasil
   - **Pricing Plan:** Free
3. Clique em **"Create new project"**
4. Aguarde ~2 minutos (ele provisiona o banco)

---

## Passo 3 — Pegar as chaves (URL + anon key)

1. No menu lateral esquerdo, clique no ícone de **engrenagem** (Settings)
2. Vá em **"API"**
3. Você vai ver:
   - **Project URL** → algo como `https://xxxxxxxx.supabase.co`
   - **Project API keys** → tem a `anon` `public` (é essa que vamos usar)

4. Copie as duas e cole em `js/config.js` do projeto:

```js
export const SUPABASE_URL = 'https://xxxxxxxx.supabase.co';
export const SUPABASE_ANON_KEY = 'eyJhbGci...';
```

> A chave `anon` é **pública** — pode ir no frontend. É protegida pelo RLS (Row Level Security) que configuramos no SQL. **Nunca** use a chave `service_role` no frontend.

---

## Passo 4 — Criar as tabelas (rodar o SQL)

1. No menu lateral esquerdo, clique em **"SQL Editor"** (ícone de banco de dados)
2. Clique em **"+ New query"**
3. Abra o arquivo `supabase/schema.sql` do projeto, copie **tudo**
4. Cole no editor do Supabase
5. Clique em **"Run"** (canto inferior direito, ou Ctrl+Enter)
6. Deve aparecer **"Success. No rows returned"**

Para conferir que deu certo:
- Menu lateral → **"Table Editor"**
- Você deve ver as tabelas: `perfis`, `pessoas`, `conversas`, `mensagens`, `defeitos`

---

## Passo 5 — Configurar autenticação por email

1. Menu lateral → **"Authentication"** → **"Providers"**
2. **Email** já vem ativo por padrão. Clique nele pra abrir.
3. Para desenvolvimento, **desative "Confirm email"** (se deixar ativo, o Supabase manda um email de confirmação toda vez que alguém se cadastra — chato pra testar). Depois, em produção, você reativa.
4. Clique em **"Save"**

---

## Passo 6 — Permitir o domínio local

1. Menu lateral → **"Authentication"** → **"URL Configuration"**
2. Em **"Site URL"**, coloque: `http://localhost:5500` (ou a porta que você usar)
3. Em **"Redirect URLs"**, adicione o mesmo
4. **Save**

> Se você for abrir o `index.html` direto pelo Windows (double-click, `file://`), a autenticação funciona mas o Supabase pode reclamar. Melhor usar uma extensão do VS Code tipo **"Live Server"** — ela abre o HTML em `http://localhost:5500`.

---

## Passo 7 — Testar

1. Preencha `js/config.js` com as suas chaves
2. Abra `login.html` com Live Server (ou outro servidor local)
3. Clique em **"Cadastre-se"** e crie um usuário
4. Faça login
5. Pronto!

---

## Problemas comuns

**"Invalid API key"**
→ Chave errada em `config.js`. Confira na aba Settings → API.

**"User already registered"**
→ Já existe uma conta com esse email. Vai pro login ou troca de email.

**"Row Level Security"**
→ Alguma tabela sem policy. Rode o SQL do `schema.sql` de novo (ele usa `create policy if not exists`... ah não, não usa — se já rodou, as policies já existem, pode ignorar erros duplicados).

**Nada aparece na tabela depois de salvar**
→ Vai em **"Table Editor"**, clica na tabela, vê se os dados estão lá. Se estão: RLS tá bloqueando a leitura. Confira se você tá logado (`auth.uid()` precisa retornar seu id).

---

## Como consultar os dados direto no banco

1. Menu lateral → **"Table Editor"**
2. Clique na tabela
3. Dá pra ver, editar, deletar linhas direto pela interface

Ou via SQL:
1. Menu lateral → **"SQL Editor"**
2. `select * from mensagens;`
3. Run

---

Pronto. Qualquer dúvida, pergunta.
