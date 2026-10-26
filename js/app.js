// ============================================================
// App principal (SPA) — dashboard, defeitos, palavras, pessoas
// ============================================================
import { supabase, requireAuth } from './supabase.js';
import { logout } from './auth.js';
import { pwa, registerPwa } from './pwa.js';
import { parseWhatsAppTxt, readFileAsText } from './importar.js';
import {
  tempoMedioRespostaPorPessoa,
  formatarTempo,
  volumePorDia,
  rankingPalavras,
  filtrarPorPeriodo,
  dataMaisRecente
} from './metricas.js';

// ---------- Estado global ----------
const state = {
  user: null,
  perfil: null,
  conversas: [],
  conversaAtual: null,
  pessoas: [],
  mensagens: [],
  defeitos: [],
  periodoDias: null,
  editandoPessoaId: null,
  editandoDefeitoId: null
};

// ---------- Utils ----------
const $ = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

function fmtNum(n) {
  if (n == null || isNaN(n)) return '0';
  return Number(n).toLocaleString('pt-BR');
}

function iniciais(nome) {
  if (!nome) return '?';
  const partes = nome.trim().split(/\s+/);
  if (partes.length === 1) return partes[0].slice(0, 2).toUpperCase();
  return (partes[0][0] + partes[partes.length - 1][0]).toUpperCase();
}

function timeAgo(iso) {
  const diff = (Date.now() - new Date(iso)) / 1000;
  if (diff < 60) return 'agora';
  if (diff < 3600) return `há ${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `há ${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d`;
  return new Date(iso).toLocaleDateString('pt-BR');
}

function openModal(id) { $(id).classList.add('open'); }
function closeModal(id) { $(id).classList.remove('open'); }

// ---------- Navegação SPA ----------
function switchView(name) {
  $$('.view').forEach(v => v.classList.remove('active'));
  $(`#view-${name}`).classList.add('active');
  $$('.nav-item').forEach(i => i.classList.toggle('active', i.dataset.view === name));
  if (name === 'home') renderHome();
  if (name === 'defeitos') renderDefeitos();
  if (name === 'palavras') renderPalavras();
  if (name === 'pessoas') renderPessoas();
}

// ---------- Load data ----------
async function carregarPerfil() {
  const { data } = await supabase.from('perfis').select('*').eq('id', state.user.id).single();
  state.perfil = data;
}

async function carregarPessoas() {
  const { data, error } = await supabase.from('pessoas').select('*').order('criada_em', { ascending: false });
  if (error) console.error(error);
  state.pessoas = data || [];
}

async function carregarConversas() {
  const { data, error } = await supabase
    .from('conversas')
    .select('*, pessoa_a:pessoa_a_id(*), pessoa_b:pessoa_b_id(*)')
    .order('criada_em', { ascending: false });
  if (error) console.error(error);
  state.conversas = data || [];
  state.conversaAtual = state.conversas[0] || null;
}

async function carregarMensagens() {
  if (!state.conversaAtual) { state.mensagens = []; return; }
  const todas = [];
  const PAGE = 1000;
  let offset = 0;
  while (true) {
    const { data, error } = await supabase
      .from('mensagens')
      .select('*')
      .eq('conversa_id', state.conversaAtual.id)
      .order('enviada_em', { ascending: true })
      .range(offset, offset + PAGE - 1);
    if (error) { console.error(error); break; }
    if (!data || data.length === 0) break;
    todas.push(...data);
    if (data.length < PAGE) break;
    offset += PAGE;
  }
  state.mensagens = todas;
}

async function carregarDefeitos() {
  if (!state.conversaAtual) { state.defeitos = []; return; }
  const { data, error } = await supabase
    .from('defeitos')
    .select('*')
    .eq('conversa_id', state.conversaAtual.id)
    .order('criado_em', { ascending: false });
  if (error) console.error(error);
  state.defeitos = data || [];
}

async function recarregarTudo() {
  await carregarPessoas();
  await carregarConversas();
  await carregarMensagens();
  await carregarDefeitos();
  renderHome();
}

// ---------- Render: HOME (dashboard ou setup) ----------
function renderHome() {
  const container = $('#home-content');

  if (state.conversas.length === 0) {
    container.innerHTML = renderSetup();
    bindSetupHandlers();
    return;
  }

  container.innerHTML = renderDashboard();
  bindDashboardHandlers();
}

function renderSetup() {
  const temPessoas = state.pessoas.length >= 2;
  return `
    <div class="card">
      <div class="card-head">
        <div class="card-title">
          <svg viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>
          Vamos começar
        </div>
      </div>
      <div style="font-size: 13px; color: var(--text-dim); line-height: 1.6;">
        1. Cadastre as duas pessoas da conversa<br>
        2. Importe o <strong>.txt</strong> exportado do WhatsApp
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>
          Pessoas (${state.pessoas.length})
        </div>
        <button class="card-link" data-action="nova-pessoa">
          + adicionar
        </button>
      </div>
      ${state.pessoas.length === 0
        ? '<div style="color: var(--text-dim); font-size: 13px; text-align: center; padding: 16px;">Nenhuma pessoa cadastrada</div>'
        : state.pessoas.map((p) => `
          <div style="padding: 10px 0; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border);">
            <div class="avatar" style="background: ${p.cor_avatar || '#58a6ff'};">${iniciais(p.nome)}</div>
            <div style="flex: 1; min-width: 0;">
              <div style="font-size: 14px; font-weight: 500;">${p.nome}</div>
              <div style="font-size: 11px; color: var(--text-dim);">${p.cargo || '—'}</div>
            </div>
            <button class="icon-btn" data-edit-pessoa="${p.id}" aria-label="Editar" style="width:30px;height:30px;">
              <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
          </div>
        `).join('')
      }
    </div>

    <button class="btn btn-primary" ${temPessoas ? '' : 'disabled'} data-action="importar">
      <svg viewBox="0 0 24 24"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
      Importar conversa .txt
    </button>
    ${!temPessoas ? '<div style="text-align: center; color: var(--text-dim); font-size: 12px; margin-top: 8px;">Cadastre 2 pessoas primeiro</div>' : ''}
  `;
}

function bindSetupHandlers() {
  const act = $('[data-action="nova-pessoa"]');
  if (act) act.onclick = () => { resetModalPessoa(); openModal('#modal-pessoa'); };
  const imp = $('[data-action="importar"]');
  if (imp && !imp.disabled) imp.onclick = () => openModal('#modal-importar');
  $$('[data-edit-pessoa]').forEach(b => b.onclick = () => abrirEdicaoPessoa(b.dataset.editPessoa));
}

function renderDashboard() {
  const c = state.conversaAtual;
  const refDate = dataMaisRecente(state.mensagens);
  const mensagens = filtrarPorPeriodo(state.mensagens, state.periodoDias, refDate);
  const tempos = tempoMedioRespostaPorPessoa(mensagens, c.pessoa_a_id, c.pessoa_b_id);
  const vol = volumePorDia(mensagens, 7, refDate);
  const maxVol = Math.max(...vol.map(v => v.total), 1);
  const palavras = rankingPalavras(mensagens, c.pessoa_a_id, c.pessoa_b_id, 5);
  const defeitosAbertos = state.defeitos.filter(d => d.status !== 'resolvido').length;
  const maxPal = palavras[0]?.total || 1;
  const legendaVol = refDate
    ? `Volume (últimos 7 dias até ${refDate.toLocaleDateString('pt-BR')})`
    : 'Volume (últimos 7 dias)';

  let infoPeriodo = '';
  if (state.periodoDias && refDate) {
    const inicio = new Date(refDate);
    inicio.setDate(inicio.getDate() - (state.periodoDias - 1));
    infoPeriodo = `${inicio.toLocaleDateString('pt-BR')} — ${refDate.toLocaleDateString('pt-BR')}`;
  } else if (state.mensagens.length) {
    const primeira = new Date(state.mensagens[0].enviada_em);
    infoPeriodo = `${primeira.toLocaleDateString('pt-BR')} — ${refDate.toLocaleDateString('pt-BR')}`;
  }

  return `
    <div class="chips">
      <button class="chip ${state.periodoDias === 1 ? 'active' : ''}" data-periodo="1">Hoje</button>
      <button class="chip ${state.periodoDias === 7 ? 'active' : ''}" data-periodo="7">7 dias</button>
      <button class="chip ${state.periodoDias === 30 ? 'active' : ''}" data-periodo="30">30 dias</button>
      <button class="chip ${state.periodoDias === null ? 'active' : ''}" data-periodo="">Tudo</button>
    </div>
    ${infoPeriodo ? `<div style="font-size: 11px; color: var(--text-dim); margin-bottom: 12px; margin-top: -8px; margin-left: 4px;">${infoPeriodo} · ${fmtNum(mensagens.length)} mensagens</div>` : ''}

    <div class="card">
      <div class="card-head">
        <div class="card-title">
          <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          Tempo médio de resposta
        </div>
      </div>
      <div class="kpi-dual">
        <div class="kpi-cell">
          <div class="kpi-cell-head">
            <div class="avatar a avatar-sm">${iniciais(c.pessoa_a.nome)}</div>
            <div class="kpi-cell-name">${c.pessoa_a.nome}</div>
          </div>
          <div class="kpi-cell-value">${formatarTempo(tempos.pessoaA)}</div>
          <div class="kpi-cell-label">${fmtNum(tempos.amostrasA)} respostas</div>
        </div>
        <div class="kpi-cell">
          <div class="kpi-cell-head">
            <div class="avatar b avatar-sm">${iniciais(c.pessoa_b.nome)}</div>
            <div class="kpi-cell-name">${c.pessoa_b.nome}</div>
          </div>
          <div class="kpi-cell-value">${formatarTempo(tempos.pessoaB)}</div>
          <div class="kpi-cell-label">${fmtNum(tempos.amostrasB)} respostas</div>
        </div>
      </div>
    </div>

    <div class="kpi-row">
      <div class="kpi-simple">
        <div class="kpi-simple-head">
          <svg viewBox="0 0 24 24"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
          Mensagens
        </div>
        <div class="kpi-simple-value" title="${mensagens.length.toLocaleString('pt-BR')}">${fmtNum(mensagens.length)}</div>
      </div>
      <div class="kpi-simple">
        <div class="kpi-simple-head">
          <svg viewBox="0 0 24 24"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
          Defeitos
        </div>
        <div class="kpi-simple-value">${fmtNum(defeitosAbertos)}</div>
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">
          <svg viewBox="0 0 24 24"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
          ${legendaVol}
        </div>
      </div>
      <div class="chart">
        ${vol.map(v => `<div class="chart-bar"><div class="fill" style="height: ${(v.total / maxVol) * 100}%"></div></div>`).join('')}
      </div>
      <div class="chart-labels">
        ${vol.map(v => `<span>${new Date(v.data).toLocaleDateString('pt-BR', { weekday: 'short' }).slice(0, 3)}</span>`).join('')}
      </div>
    </div>

    <div class="card">
      <div class="card-head">
        <div class="card-title">
          <svg viewBox="0 0 24 24"><path d="M4 7V4h16v3"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
          Palavras mais usadas
        </div>
        <button class="card-link" data-nav="palavras">
          ver todas
          <svg viewBox="0 0 24 24"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>
      <div class="legend">
        <div class="legend-item"><div class="legend-dot a"></div> ${c.pessoa_a.nome}</div>
        <div class="legend-item"><div class="legend-dot b"></div> ${c.pessoa_b.nome}</div>
      </div>
      ${palavras.length === 0
        ? '<div style="color: var(--text-dim); font-size: 13px; text-align: center; padding: 12px;">Sem palavras no período</div>'
        : palavras.map((p, i) => `
          <div class="palavra">
            <div class="palavra-head">
              <span class="palavra-word"><span class="palavra-rank">${i+1}</span>${p.palavra}</span>
              <span class="palavra-count" title="${p.total.toLocaleString('pt-BR')}">${fmtNum(p.total)}</span>
            </div>
            <div class="palavra-bar">
              <div class="palavra-fill-a" style="width: ${(p.a / maxPal) * 100}%"></div>
              <div class="palavra-fill-b" style="width: ${(p.b / maxPal) * 100}%"></div>
            </div>
            <div class="palavra-breakdown">
              <span class="palavra-breakdown-item"><span class="legend-dot a"></span>${c.pessoa_a.nome.split(' ')[0]} <strong>${fmtNum(p.a)}</strong></span>
              <span class="palavra-breakdown-item"><span class="legend-dot b"></span>${c.pessoa_b.nome.split(' ')[0]} <strong>${fmtNum(p.b)}</strong></span>
            </div>
          </div>
        `).join('')
      }
    </div>
  `;
}

function bindDashboardHandlers() {
  $$('[data-periodo]').forEach(btn => {
    btn.onclick = () => {
      state.periodoDias = btn.dataset.periodo ? parseInt(btn.dataset.periodo, 10) : null;
      renderHome();
    };
  });
  $$('[data-nav]').forEach(btn => btn.onclick = () => switchView(btn.dataset.nav));
}

// ---------- Render: PESSOAS ----------
function renderPessoas() {
  const html = state.pessoas.length === 0 ? renderEmptyPessoas() : state.pessoas.map(p => `
    <div style="padding: 12px 0; display: flex; align-items: center; gap: 10px; border-bottom: 1px solid var(--border);">
      <div class="avatar avatar-lg" style="background: ${p.cor_avatar || '#58a6ff'};">${iniciais(p.nome)}</div>
      <div style="flex: 1; min-width: 0;">
        <div style="font-size: 15px; font-weight: 600;">${p.nome}</div>
        <div style="font-size: 12px; color: var(--text-dim);">${p.cargo || '—'}</div>
      </div>
      <button class="icon-btn" data-edit-pessoa="${p.id}" aria-label="Editar">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
      </button>
      <button class="icon-btn" data-del-pessoa="${p.id}" aria-label="Remover">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
      </button>
    </div>
  `).join('');

  $('#pessoas-list').innerHTML = html;
  $$('[data-del-pessoa]').forEach(b => b.onclick = () => deletarPessoa(b.dataset.delPessoa));
  $$('[data-edit-pessoa]').forEach(b => b.onclick = () => abrirEdicaoPessoa(b.dataset.editPessoa));
}

function renderEmptyPessoas() {
  return `
    <div class="empty">
      <svg viewBox="0 0 24 24"><circle cx="12" cy="7" r="4"/><path d="M5.5 21a6.5 6.5 0 0 1 13 0"/></svg>
      <div class="empty-title">Nenhuma pessoa</div>
      <div class="empty-text">Adicione as pessoas da conversa</div>
    </div>
  `;
}

// ---------- Render: DEFEITOS ----------
function renderDefeitos() {
  const list = $('#defeitos-list');
  if (!state.defeitos.length) {
    list.innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="16" rx="2"/><path d="M9 13l2 2 4-4"/></svg>
        <div class="empty-title">Sem defeitos</div>
        <div class="empty-text">Registre problemas de comunicação encontrados</div>
      </div>
    `;
    return;
  }
  list.innerHTML = state.defeitos.map(d => `
    <div class="defeito">
      <div class="defeito-icon ${d.severidade === 'critica' ? 'alta' : d.severidade}">
        <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      <div class="defeito-body">
        <div class="defeito-title">${d.titulo}</div>
        <div class="defeito-desc">${d.descricao || '—'}</div>
        <div class="defeito-meta">
          <span class="badge st-${d.status === 'em_andamento' ? 'andamento' : d.status}">${d.status.replace('_', ' ')}</span>
          <span class="defeito-date">${timeAgo(d.criado_em)}</span>
        </div>
      </div>
      <div class="defeito-actions">
        <button data-edit-defeito="${d.id}" aria-label="Editar">
          <svg viewBox="0 0 24 24"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button data-del-defeito="${d.id}" aria-label="Remover">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `).join('');
  $$('[data-edit-defeito]').forEach(b => b.onclick = () => abrirEdicaoDefeito(b.dataset.editDefeito));
  $$('[data-del-defeito]').forEach(b => b.onclick = () => deletarDefeito(b.dataset.delDefeito));
}

// ---------- Render: PALAVRAS ----------
function renderPalavras() {
  const list = $('#palavras-list');
  if (!state.conversaAtual || !state.mensagens.length) {
    list.innerHTML = `
      <div class="empty">
        <svg viewBox="0 0 24 24"><path d="M4 7V4h16v3"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
        <div class="empty-title">Sem palavras</div>
        <div class="empty-text">Importe uma conversa primeiro</div>
      </div>
    `;
    return;
  }
  const c = state.conversaAtual;
  const palavras = rankingPalavras(state.mensagens, c.pessoa_a_id, c.pessoa_b_id, 50);
  const max = palavras[0]?.total || 1;
  list.innerHTML = `
    <div class="legend">
      <div class="legend-item"><div class="legend-dot a"></div> ${c.pessoa_a.nome}</div>
      <div class="legend-item"><div class="legend-dot b"></div> ${c.pessoa_b.nome}</div>
    </div>
    ${palavras.map((p, i) => `
      <div class="palavra">
        <div class="palavra-head">
          <span class="palavra-word"><span class="palavra-rank">${i+1}</span>${p.palavra}</span>
          <span class="palavra-count" title="${p.total.toLocaleString('pt-BR')}">${fmtNum(p.total)}</span>
        </div>
        <div class="palavra-bar">
          <div class="palavra-fill-a" style="width: ${(p.a / max) * 100}%"></div>
          <div class="palavra-fill-b" style="width: ${(p.b / max) * 100}%"></div>
        </div>
        <div class="palavra-breakdown">
          <span class="palavra-breakdown-item"><span class="legend-dot a"></span>${c.pessoa_a.nome.split(' ')[0]} <strong>${fmtNum(p.a)}</strong></span>
          <span class="palavra-breakdown-item"><span class="legend-dot b"></span>${c.pessoa_b.nome.split(' ')[0]} <strong>${fmtNum(p.b)}</strong></span>
        </div>
      </div>
    `).join('')}
  `;
}

// ---------- Ações ----------
async function criarPessoa(nome, cargo, cor) {
  const { data, error } = await supabase.from('pessoas').insert({
    nome, cargo: cargo || null, cor_avatar: cor, criada_por: state.user.id
  }).select().single();
  if (error) { alert('Erro ao criar pessoa: ' + error.message); return null; }
  state.pessoas.unshift(data);
  return data;
}

async function atualizarPessoa(id, nome, cargo, cor) {
  const { data, error } = await supabase.from('pessoas')
    .update({ nome, cargo: cargo || null, cor_avatar: cor })
    .eq('id', id)
    .select().single();
  if (error) { alert('Erro ao atualizar: ' + error.message); return null; }
  const idx = state.pessoas.findIndex(p => p.id === id);
  if (idx >= 0) state.pessoas[idx] = data;
  if (state.conversaAtual) {
    if (state.conversaAtual.pessoa_a_id === id) state.conversaAtual.pessoa_a = data;
    if (state.conversaAtual.pessoa_b_id === id) state.conversaAtual.pessoa_b = data;
  }
  return data;
}

function abrirEdicaoPessoa(id) {
  const p = state.pessoas.find(x => x.id === id);
  if (!p) return;
  state.editandoPessoaId = id;
  const form = $('#form-pessoa');
  form.nome.value = p.nome || '';
  form.cargo.value = p.cargo || '';
  const cor = p.cor_avatar || '#58a6ff';
  const radio = form.querySelector(`input[name="cor"][value="${cor}"]`);
  if (radio) {
    radio.checked = true;
    $$('#modal-pessoa .color-swatch').forEach(s => s.classList.remove('selected'));
    radio.nextElementSibling.classList.add('selected');
  }
  $('#modal-pessoa-title').textContent = 'Editar pessoa';
  openModal('#modal-pessoa');
}

async function deletarPessoa(id) {
  if (!confirm('Remover essa pessoa?')) return;
  const { error } = await supabase.from('pessoas').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  await recarregarTudo();
  renderPessoas();
}

async function importarArquivo(file, pessoaAId, pessoaBId) {
  const texto = await readFileAsText(file);
  const { messages, senders } = parseWhatsAppTxt(texto);

  if (messages.length === 0) {
    alert('Nenhuma mensagem encontrada no arquivo. Verifique o formato (deve ser exportação do WhatsApp sem mídia).');
    return;
  }

  const pessoaA = state.pessoas.find(p => p.id === pessoaAId);
  const pessoaB = state.pessoas.find(p => p.id === pessoaBId);

  const mapaRemetente = {};
  for (const s of senders) {
    const sNorm = s.toLowerCase();
    if (sNorm.includes(pessoaA.nome.toLowerCase().split(' ')[0]) ||
        pessoaA.nome.toLowerCase().includes(sNorm.split(' ')[0])) {
      mapaRemetente[s] = pessoaAId;
    } else if (sNorm.includes(pessoaB.nome.toLowerCase().split(' ')[0]) ||
               pessoaB.nome.toLowerCase().includes(sNorm.split(' ')[0])) {
      mapaRemetente[s] = pessoaBId;
    }
  }

  const naoMapeados = senders.filter(s => !mapaRemetente[s]);
  if (naoMapeados.length > 0) {
    const escolha = prompt(`Não consegui identificar automaticamente estes remetentes: ${naoMapeados.join(', ')}.\n\nResponda com o nome do primeiro remetente (${pessoaA.nome} ou ${pessoaB.nome}):`);
    if (!escolha) return;
    const primeiro = naoMapeados[0];
    if (escolha.toLowerCase().includes(pessoaA.nome.toLowerCase().split(' ')[0])) {
      mapaRemetente[primeiro] = pessoaAId;
      naoMapeados.slice(1).forEach(s => mapaRemetente[s] = pessoaBId);
    } else {
      mapaRemetente[primeiro] = pessoaBId;
      naoMapeados.slice(1).forEach(s => mapaRemetente[s] = pessoaAId);
    }
  }

  const { data: conversa, error: errConv } = await supabase.from('conversas').insert({
    titulo: `${pessoaA.nome} × ${pessoaB.nome}`,
    pessoa_a_id: pessoaAId,
    pessoa_b_id: pessoaBId,
    criada_por: state.user.id
  }).select().single();
  if (errConv) { alert('Erro ao criar conversa: ' + errConv.message); return; }

  const linhas = messages.map(m => ({
    conversa_id: conversa.id,
    remetente_id: mapaRemetente[m.remetente],
    conteudo: m.conteudo,
    enviada_em: m.enviada_em
  })).filter(m => m.remetente_id);

  const CHUNK = 500;
  for (let i = 0; i < linhas.length; i += CHUNK) {
    const { error } = await supabase.from('mensagens').insert(linhas.slice(i, i + CHUNK));
    if (error) { alert('Erro ao inserir mensagens: ' + error.message); return; }
  }

  alert(`${linhas.length} mensagens importadas com sucesso!`);
  closeModal('#modal-importar');
  await recarregarTudo();
}

async function criarDefeito(titulo, descricao, severidade, status) {
  if (!state.conversaAtual) { alert('Nenhuma conversa ativa'); return; }
  const { data, error } = await supabase.from('defeitos').insert({
    conversa_id: state.conversaAtual.id,
    titulo, descricao: descricao || null, severidade, status,
    criado_por: state.user.id
  }).select().single();
  if (error) { alert(error.message); return; }
  state.defeitos.unshift(data);
}

async function atualizarDefeito(id, titulo, descricao, severidade, status) {
  const update = { titulo, descricao: descricao || null, severidade, status };
  if (status === 'resolvido') update.resolvido_em = new Date().toISOString();
  else update.resolvido_em = null;
  const { data, error } = await supabase.from('defeitos')
    .update(update).eq('id', id).select().single();
  if (error) { alert('Erro: ' + error.message); return; }
  const idx = state.defeitos.findIndex(d => d.id === id);
  if (idx >= 0) state.defeitos[idx] = data;
}

async function deletarDefeito(id) {
  if (!confirm('Remover esse defeito?')) return;
  const { error } = await supabase.from('defeitos').delete().eq('id', id);
  if (error) { alert(error.message); return; }
  state.defeitos = state.defeitos.filter(d => d.id !== id);
  renderDefeitos();
}

function abrirEdicaoDefeito(id) {
  const d = state.defeitos.find(x => x.id === id);
  if (!d) return;
  state.editandoDefeitoId = id;
  const form = $('#form-defeito');
  form.titulo.value = d.titulo || '';
  form.descricao.value = d.descricao || '';
  form.severidade.value = d.severidade || 'media';
  form.status.value = d.status || 'aberto';
  $('#modal-defeito-title').textContent = 'Editar defeito';
  openModal('#modal-defeito');
}

function resetModalDefeito() {
  const form = $('#form-defeito');
  form.reset();
  state.editandoDefeitoId = null;
  $('#modal-defeito-title').textContent = 'Novo defeito';
}

// ---------- Topbar / nome usuario ----------
function renderTopbar() {
  const el = $('#topbar-content');
  if (state.conversaAtual) {
    const c = state.conversaAtual;
    el.innerHTML = `
      <div class="pair">
        <div class="avatar a">${iniciais(c.pessoa_a.nome)}</div>
        <div class="pair-connector"></div>
        <div class="avatar b">${iniciais(c.pessoa_b.nome)}</div>
      </div>
      <div class="topbar-info">
        <div class="topbar-title">${c.pessoa_a.nome} × ${c.pessoa_b.nome}</div>
        <div class="topbar-sub" title="${state.mensagens.length.toLocaleString('pt-BR')} mensagens">${fmtNum(state.mensagens.length)} mensagens</div>
      </div>
      <button class="icon-btn" id="btn-menu" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>
    `;
  } else {
    el.innerHTML = `
      <div class="topbar-info">
        <div class="topbar-title">Olá, ${state.perfil?.nome?.split(' ')[0] || 'bem-vindo'}</div>
        <div class="topbar-sub">Configure seu primeiro par</div>
      </div>
      <button class="icon-btn" id="btn-menu" aria-label="Menu">
        <svg viewBox="0 0 24 24" fill="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
      </button>
    `;
  }
  $('#btn-menu').onclick = () => {
    atualizarMenuInstall();
    openModal('#modal-menu');
  };
}

function atualizarMenuInstall() {
  const btn = $('#btn-install');
  if (!btn) return;
  btn.hidden = !pwa.isInstallable() || pwa.isInstalled();
}

function bindModalMenu() {
  $('#modal-menu [data-close]').onclick = () => closeModal('#modal-menu');
  $('#btn-logout').onclick = async () => {
    closeModal('#modal-menu');
    await logout();
  };
  $('#btn-install').onclick = async () => {
    await pwa.install();
    atualizarMenuInstall();
  };
  pwa.onChange = atualizarMenuInstall;
}

// ---------- Modal: pessoa ----------
function resetModalPessoa() {
  const form = $('#form-pessoa');
  form.reset();
  state.editandoPessoaId = null;
  $('#modal-pessoa-title').textContent = 'Nova pessoa';
  $$('#modal-pessoa .color-swatch').forEach(s => s.classList.remove('selected'));
  const first = form.querySelector('input[name="cor"]');
  if (first) {
    first.checked = true;
    first.nextElementSibling.classList.add('selected');
  }
}

function bindModalPessoa() {
  const form = $('#form-pessoa');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const nome = form.nome.value.trim();
    const cargo = form.cargo.value.trim();
    const cor = form.cor.value;
    if (!nome) return;
    if (state.editandoPessoaId) {
      await atualizarPessoa(state.editandoPessoaId, nome, cargo, cor);
    } else {
      await criarPessoa(nome, cargo, cor);
    }
    closeModal('#modal-pessoa');
    resetModalPessoa();
    renderHome();
    renderTopbar();
    if ($('#view-pessoas').classList.contains('active')) renderPessoas();
  };
  $('#modal-pessoa [data-close]').onclick = () => {
    closeModal('#modal-pessoa');
    resetModalPessoa();
  };
}

// ---------- Modal: importar ----------
function bindModalImportar() {
  const sel = $('#modal-importar');
  sel.querySelector('[data-close]').onclick = () => closeModal('#modal-importar');

  const form = $('#form-importar');
  form.onopen = () => {
    const opts = state.pessoas.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    form.pessoa_a.innerHTML = opts;
    form.pessoa_b.innerHTML = opts;
    if (state.pessoas[1]) form.pessoa_b.value = state.pessoas[1].id;
  };

  $('#modal-importar [data-close]').onclick = () => closeModal('#modal-importar');

  form.onsubmit = async (e) => {
    e.preventDefault();
    const file = form.arquivo.files[0];
    const a = form.pessoa_a.value;
    const b = form.pessoa_b.value;
    if (!file) return alert('Selecione um arquivo .txt');
    if (a === b) return alert('As duas pessoas devem ser diferentes');
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Importando...';
    try {
      await importarArquivo(file, a, b);
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg> Importar`;
    }
  };
}

// ---------- Modal: defeito ----------
function bindModalDefeito() {
  const form = $('#form-defeito');
  form.onsubmit = async (e) => {
    e.preventDefault();
    const titulo = form.titulo.value.trim();
    const descricao = form.descricao.value.trim();
    const severidade = form.severidade.value;
    const status = form.status.value;
    if (!titulo) return;
    if (state.editandoDefeitoId) {
      await atualizarDefeito(state.editandoDefeitoId, titulo, descricao, severidade, status);
    } else {
      await criarDefeito(titulo, descricao, severidade, status);
    }
    closeModal('#modal-defeito');
    resetModalDefeito();
    renderHome();
    renderDefeitos();
  };
  $('#modal-defeito [data-close]').onclick = () => {
    closeModal('#modal-defeito');
    resetModalDefeito();
  };
}

// Observer para abrir modal importar com pessoas atualizadas
const observer = new MutationObserver(() => {
  if ($('#modal-importar').classList.contains('open')) {
    const form = $('#form-importar');
    const opts = state.pessoas.map(p => `<option value="${p.id}">${p.nome}</option>`).join('');
    form.pessoa_a.innerHTML = opts;
    form.pessoa_b.innerHTML = opts;
    if (state.pessoas[1]) form.pessoa_b.value = state.pessoas[1].id;
  }
});

// ---------- Splash ----------
function esconderSplash() {
  const s = $('#splash');
  if (!s) return;
  s.classList.add('hidden');
  setTimeout(() => s.remove(), 400);
}

// ---------- Bootstrap ----------
async function main() {
  registerPwa();
  const inicio = Date.now();
  state.user = await requireAuth('login.html');
  if (!state.user) return;

  await carregarPerfil();
  await carregarPessoas();
  await carregarConversas();
  await carregarMensagens();
  await carregarDefeitos();

  renderTopbar();
  switchView('home');

  const minSplash = 400;
  const passou = Date.now() - inicio;
  setTimeout(esconderSplash, Math.max(0, minSplash - passou));

  // Bottom nav
  $$('.nav-item').forEach(item => {
    item.onclick = () => switchView(item.dataset.view);
  });

  // FAB
  $('#fab').onclick = () => {
    const v = document.querySelector('.view.active').id;
    if (v === 'view-pessoas') { resetModalPessoa(); return openModal('#modal-pessoa'); }
    if (v === 'view-defeitos') { resetModalDefeito(); return openModal('#modal-defeito'); }
    if (!state.conversaAtual) { resetModalPessoa(); return openModal('#modal-pessoa'); }
    resetModalDefeito();
    openModal('#modal-defeito');
  };

  // Pessoas: botão adicionar
  $('#btn-nova-pessoa').onclick = () => { resetModalPessoa(); openModal('#modal-pessoa'); };

  // Modals
  bindModalPessoa();
  bindModalImportar();
  bindModalDefeito();
  bindModalMenu();

  observer.observe($('#modal-importar'), { attributes: true, attributeFilter: ['class'] });
}

main();
