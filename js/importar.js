// ============================================================
// Parser do .txt do WhatsApp
// Suporta formatos PT-BR:
//   [22/10/2023, 14:35:12] Maria: olá
//   22/10/2023 14:35 - Maria: olá
// ============================================================

const REGEX_BRACKET = /^\[(\d{1,2})\/(\d{1,2})\/(\d{2,4}),?\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\]\s+([^:]+?):\s([\s\S]*)$/;
const REGEX_DASH = /^(\d{1,2})\/(\d{1,2})\/(\d{2,4})\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*-\s+([^:]+?):\s([\s\S]*)$/;

function parseLine(line) {
  const m = line.match(REGEX_BRACKET) || line.match(REGEX_DASH);
  if (!m) return null;
  const [, d, mo, y, h, mi, s, sender, content] = m;
  const year = y.length === 2 ? 2000 + parseInt(y, 10) : parseInt(y, 10);
  const date = new Date(year, parseInt(mo, 10) - 1, parseInt(d, 10), parseInt(h, 10), parseInt(mi, 10), parseInt(s || '0', 10));
  return {
    enviada_em: date.toISOString(),
    remetente: sender.trim(),
    conteudo: content.trim()
  };
}

export function parseWhatsAppTxt(text) {
  const lines = text.split(/\r?\n/);
  const messages = [];
  let current = null;

  for (const raw of lines) {
    const parsed = parseLine(raw);
    if (parsed) {
      if (current) messages.push(current);
      current = parsed;
    } else if (current && raw.trim()) {
      current.conteudo += '\n' + raw;
    }
  }
  if (current) messages.push(current);

  const senders = [...new Set(messages.map(m => m.remetente))];
  return { messages, senders };
}

export function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsText(file, 'utf-8');
  });
}
