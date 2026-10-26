// ============================================================
// Cálculos de métricas em cima das mensagens
// ============================================================

const STOPWORDS = new Set([
  'a','o','e','é','de','do','da','em','um','uma','para','pra','pro','com','que','se','na','no','os','as','dos','das',
  'por','mais','como','mas','ao','à','aos','às','ser','são','foi','estou','está','estava','vou','vai','ter','tem','têm',
  'eu','tu','ele','ela','nós','vós','eles','elas','me','te','lhe','meu','minha','seu','sua','nosso','nossa',
  'sim','não','nao','ok','oi','olá','ola','aí','ai','tá','ta','né','ne','pra','pro','já','ja','só','so','vc','voce','você',
  'q','p','pq','porque','então','entao','isso','isto','esse','essa','este','esta','aquele','aquela','la','lá',
  'bem','muito','muita','muitos','muitas','sem','até','ate','ou','também','tambem','vai','iria','era',
  'midia','mídia','oculta','media','omitted'
]);

const MIDIA_PATTERN = /<\s*(m[íi]dia oculta|media omitted|arquivo anexado|audio omitted|image omitted|video omitted|sticker omitted|imagem oculta|v[íi]deo oculto|[áa]udio oculto|figurinha oculta|gif omitido)\s*>/i;

export function isMidia(conteudo) {
  const limpo = conteudo.trim();
  if (MIDIA_PATTERN.test(limpo)) return true;
  const semBrackets = limpo.replace(/^[<>\s]+|[<>\s]+$/g, '').toLowerCase();
  if (semBrackets === 'mídia oculta' || semBrackets === 'midia oculta' || semBrackets === 'media omitted') return true;
  return false;
}

function normalizarVariacoes(p) {
  if (!p) return p;
  if (/^k{2,}$/i.test(p)) return 'kkk';
  if (/^(ha){2,}h?$/i.test(p)) return 'haha';
  if (/^(he){2,}h?$/i.test(p)) return 'hehe';
  if (/^(rs){2,}$/i.test(p)) return 'rsrs';
  if (/^h+u?m+$/i.test(p)) return 'hmm';
  if (/^(a?h+a?){2,}$/i.test(p) && p.length >= 3) return 'haha';
  return p;
}

export function normalizarPalavra(p) {
  return p
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]/gu, '');
}

export function tempoMedioRespostaPorPessoa(mensagens, pessoaAId, pessoaBId) {
  const ordenadas = [...mensagens].sort((a, b) => new Date(a.enviada_em) - new Date(b.enviada_em));
  const temposA = [];
  const temposB = [];

  for (let i = 1; i < ordenadas.length; i++) {
    const anterior = ordenadas[i - 1];
    const atual = ordenadas[i];
    if (anterior.remetente_id === atual.remetente_id) continue;

    const diff = (new Date(atual.enviada_em) - new Date(anterior.enviada_em)) / 1000;
    if (diff > 60 * 60 * 24) continue;

    if (atual.remetente_id === pessoaAId) temposA.push(diff);
    else if (atual.remetente_id === pessoaBId) temposB.push(diff);
  }

  const media = (arr) => arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : 0;
  return {
    pessoaA: media(temposA),
    pessoaB: media(temposB),
    amostrasA: temposA.length,
    amostrasB: temposB.length
  };
}

export function formatarTempo(segundos) {
  if (!segundos) return '—';
  const s = Math.round(segundos);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const r = s % 60;
  if (m < 60) return r ? `${m}m ${r}s` : `${m}m`;
  const h = Math.floor(m / 60);
  const rm = m % 60;
  return rm ? `${h}h ${rm}m` : `${h}h`;
}

export function volumePorDia(mensagens, dias = 7, refDate = null) {
  const ref = refDate ? new Date(refDate) : new Date();
  ref.setHours(0, 0, 0, 0);
  const buckets = {};
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(ref);
    d.setDate(d.getDate() - i);
    buckets[d.toISOString().slice(0, 10)] = 0;
  }
  for (const m of mensagens) {
    const k = m.enviada_em.slice(0, 10);
    if (k in buckets) buckets[k]++;
  }
  return Object.entries(buckets).map(([data, total]) => ({ data, total }));
}

export function dataMaisRecente(mensagens) {
  if (!mensagens.length) return null;
  return mensagens.reduce((max, m) => {
    const d = new Date(m.enviada_em);
    return d > max ? d : max;
  }, new Date(0));
}

export function rankingPalavras(mensagens, pessoaAId, pessoaBId, topN = 20) {
  const contagem = {};
  for (const m of mensagens) {
    if (isMidia(m.conteudo)) continue;
    const palavras = m.conteudo.split(/\s+/)
      .map(normalizarPalavra)
      .filter(p => p)
      .map(normalizarVariacoes)
      .filter(p => p.length > 2 && !STOPWORDS.has(p));
    for (const p of palavras) {
      if (!contagem[p]) contagem[p] = { total: 0, a: 0, b: 0 };
      contagem[p].total++;
      if (m.remetente_id === pessoaAId) contagem[p].a++;
      else if (m.remetente_id === pessoaBId) contagem[p].b++;
    }
  }
  return Object.entries(contagem)
    .map(([palavra, c]) => ({ palavra, ...c }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topN);
}

export function filtrarPorRange(mensagens, inicio, fim) {
  if (!inicio || !fim) return mensagens;
  const i = new Date(inicio); i.setHours(0, 0, 0, 0);
  const f = new Date(fim); f.setHours(23, 59, 59, 999);
  return mensagens.filter(m => {
    const d = new Date(m.enviada_em);
    return d >= i && d <= f;
  });
}

export function filtrarPorPeriodo(mensagens, dias, refDate = null) {
  if (!dias) return mensagens;
  const ref = refDate ? new Date(refDate) : new Date();
  const fim = new Date(ref);
  fim.setHours(23, 59, 59, 999);
  const inicio = new Date(ref);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - (dias - 1));
  return mensagens.filter(m => {
    const d = new Date(m.enviada_em);
    return d >= inicio && d <= fim;
  });
}
