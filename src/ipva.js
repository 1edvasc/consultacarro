// Alíquotas de IPVA para automóveis de passeio por UF (referência 2026, aproximadas).
// Variam por tipo de veículo, combustível e isenções; o valor é só uma estimativa.
export const IPVA_RATES = {
  AC: 2, AL: 3, AP: 3, AM: 3, BA: 2.5, CE: 3, DF: 3.5, ES: 2, GO: 3.75,
  MA: 2.5, MT: 3, MS: 3, MG: 4, PA: 2.5, PB: 2.5, PR: 1.9, PE: 2.4, PI: 2.5,
  RJ: 4, RN: 3, RS: 3, RO: 3, RR: 3, SC: 2, SP: 4, SE: 2.5, TO: 2,
};

export function parseBRL(text) {
  if (typeof text === 'number') return text;
  const n = Number(String(text ?? '').replace(/[^\d,]/g, '').replace(',', '.'));
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function formatBRL(value) {
  return value == null ? null : value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function estimateIpva(uf, fipeValue) {
  const rate = IPVA_RATES[String(uf ?? '').toUpperCase()];
  if (!rate || !fipeValue) return null;
  return { rate, value: Math.round(fipeValue * rate) / 100 };
}
