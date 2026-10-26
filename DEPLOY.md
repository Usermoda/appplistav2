# Deploy no Netlify — Passo a Passo

App 100% estático, sem build step. Deploy em ~3 minutos.

---

## Passo 1 — Criar conta no Netlify

1. Acesse **https://app.netlify.com/signup**
2. Clique em **"Sign up with GitHub"** (mais fácil, usa a mesma conta do seu repo)
3. Autoriza o Netlify no GitHub

---

## Passo 2 — Importar o repositório

1. No painel do Netlify, clique em **"Add new site"** → **"Import an existing project"**
2. Escolhe **"Deploy with GitHub"**
3. Autoriza o Netlify a acessar seus repositórios (ou escolhe só o repo `appplistav2`)
4. Clica no repo **`Usermoda/appplistav2`**

---

## Passo 3 — Configurar o build

Na tela de configuração:

- **Branch to deploy:** `main`
- **Build command:** (deixa VAZIO)
- **Publish directory:** `.` (apenas um ponto)

> O arquivo `netlify.toml` já tem essa config, então o Netlify preenche sozinho. Só confere.

Clica em **"Deploy site"**. Em ~30 segundos tá no ar.

---

## Passo 4 — Pegar a URL do site

Depois do deploy, o Netlify dá uma URL tipo:
```
https://astonishing-pangolin-abc123.netlify.app
```

**Opcional — mudar o nome:**
1. Painel do site → **"Site configuration"** → **"Change site name"**
2. Escolhe algo como `app-lista-conversas` → vira `https://app-lista-conversas.netlify.app`

---

## Passo 5 — IMPORTANTE: liberar o novo domínio no Supabase

Agora o app roda em um domínio novo. Precisa autorizar no Supabase:

1. Entra no painel do **Supabase** → seu projeto
2. **Authentication** → **URL Configuration**
3. **Site URL:** troca pra sua URL do Netlify, ex: `https://app-lista-conversas.netlify.app`
4. **Redirect URLs:** adiciona:
   - `https://app-lista-conversas.netlify.app/**`
   - `http://localhost:5500/**` (mantém o local pra desenvolvimento)
5. **Save**

Se pular esse passo, o login vai dar erro de "redirect not allowed".

---

## Passo 6 — Testar

1. Abre a URL do Netlify no celular ou desktop
2. Cadastra uma conta
3. Faz login
4. Adiciona pessoas, importa `.txt`
5. No Chrome Android, menu do navegador → **"Instalar app"** / **"Adicionar à tela inicial"**

Agora é um PWA de verdade, com ícone na home do celular.

---

## Deploys automáticos

Cada `git push` pra branch `main` no GitHub dispara um deploy automático no Netlify. Em ~30 segundos o novo código tá no ar.

---

## Problemas comuns

**"Deploy failed"**
→ Olha o log na aba **Deploys**. Se der timeout, geralmente é network — redeploy manual.

**App carrega mas login dá erro**
→ Esqueceu do Passo 5 (liberar o domínio no Supabase).

**PWA não aparece "Instalar"**
→ O Netlify já serve com HTTPS (requisito do PWA). Se mesmo assim não aparecer, abre o DevTools → aba **Application** → **Manifest** → vê se tá tudo verde.

**Service Worker antigo em cache**
→ No DevTools → **Application** → **Service Workers** → **Unregister** → F5. Ou simplesmente aguarda ~1 min, o `netlify.toml` força `no-cache` no `sw.js`.
