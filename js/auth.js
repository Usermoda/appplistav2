// ============================================================
// Auth: login, cadastro, logout
// ============================================================
import { supabase } from './supabase.js';

function showAlert(id, type, msg) {
  const el = document.getElementById(id);
  if (!el) return;
  el.className = `alert alert-${type} show`;
  el.textContent = msg;
}

function hideAlert(id) {
  const el = document.getElementById(id);
  if (el) el.classList.remove('show');
}

function translateError(err) {
  const m = (err?.message || '').toLowerCase();
  if (m.includes('invalid login')) return 'Email ou senha incorretos.';
  if (m.includes('user already registered')) return 'Já existe uma conta com esse email.';
  if (m.includes('password should be at least')) return 'A senha precisa ter pelo menos 6 caracteres.';
  if (m.includes('unable to validate email')) return 'Email inválido.';
  if (m.includes('email not confirmed')) return 'Confirme seu email antes de entrar.';
  return err?.message || 'Erro inesperado. Tente novamente.';
}

// ---------- LOGIN ----------
export function initLogin() {
  const form = document.getElementById('login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('login-alert');
    const btn = form.querySelector('button[type="submit"]');
    const email = form.email.value.trim();
    const password = form.password.value;

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Entrando...';

    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      showAlert('login-alert', 'error', translateError(error));
      btn.disabled = false;
      btn.innerHTML = originalLoginBtn();
      return;
    }
    window.location.href = 'index.html';
  });
}

// ---------- CADASTRO ----------
export function initCadastro() {
  const form = document.getElementById('cadastro-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    hideAlert('cadastro-alert');
    const btn = form.querySelector('button[type="submit"]');
    const nome = form.nome.value.trim();
    const cargo = form.cargo.value.trim();
    const email = form.email.value.trim();
    const password = form.password.value;
    const password2 = form.password2.value;

    if (password !== password2) {
      showAlert('cadastro-alert', 'error', 'As senhas não conferem.');
      return;
    }
    if (password.length < 6) {
      showAlert('cadastro-alert', 'error', 'A senha precisa ter pelo menos 6 caracteres.');
      return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Criando conta...';

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { nome, cargo } }
    });

    if (error) {
      showAlert('cadastro-alert', 'error', translateError(error));
      btn.disabled = false;
      btn.innerHTML = originalCadastroBtn();
      return;
    }

    if (data.session) {
      window.location.href = 'index.html';
    } else {
      showAlert('cadastro-alert', 'success', 'Conta criada! Verifique seu email para confirmar.');
      btn.disabled = false;
      btn.innerHTML = originalCadastroBtn();
    }
  });
}

// ---------- LOGOUT ----------
export async function logout() {
  await supabase.auth.signOut();
  window.location.href = 'login.html';
}

function originalLoginBtn() {
  return `Entrar
    <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
}
function originalCadastroBtn() {
  return `Criar conta
    <svg viewBox="0 0 24 24"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>`;
}
