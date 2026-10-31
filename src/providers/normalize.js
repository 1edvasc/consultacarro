import { maskChassi } from '../plate.js';
import { parseBRL } from '../ipva.js';

const pick = (obj, ...keys) => {
  for (const k of keys) {
    const v = obj?.[k] ?? obj?.[k.toUpperCase()];
    if (v !== undefined && v !== null && String(v).trim() !== '') return v;
  }
  return null;
};

// Converte a resposta de /v3/basico-fipe (ou equivalente) para o formato usado nas páginas.
// Os campos variam por veículo, por isso tudo é opcional.
export function normalizeVehicle(plate, body, fonte) {
  const basico = body?.basico?.dados ?? body?.dados ?? {};
  const fipeList = Array.isArray(body?.fipe?.dados) ? body.fipe.dados : [];
  return {
    placa: plate,
    marca: pick(basico, 'marca'),
    modelo: pick(basico, 'modelo'),
    versao: pick(basico, 'versao', 'submodelo'),
    ano: pick(basico, 'ano', 'ano_fabricacao'),
    anoModelo: pick(basico, 'anoModelo', 'ano_modelo'),
    cor: pick(basico, 'cor'),
    combustivel: pick(basico, 'combustivel'),
    potencia: pick(basico, 'potencia'),
    segmento: pick(basico, 'segmento', 'tipo_veiculo', 'tipo'),
    especie: pick(basico, 'especie'),
    procedencia: pick(basico, 'procedencia', 'origem', 'nacionalidade'),
    municipio: pick(basico, 'municipio', 'cidade'),
    uf: pick(basico, 'uf'),
    situacao: pick(basico, 'situacao'),
    chassi: maskChassi(pick(basico, 'chassi')),
    fipe: fipeList.map((f) => ({
      codigo: f.codigo_fipe ?? null,
      marca: f.marca ?? f.texto_marca ?? null,
      modelo: f.modelo ?? f.texto_modelo ?? null,
      ano: f.ano ?? f.ano_modelo ?? null,
      combustivel: f.combustivel ?? null,
      valor: f.valor ?? f.texto_valor ?? null,
      valorNum: parseBRL(f.valor ?? f.texto_valor),
      mesReferencia: f.mes_referencia ?? null,
      score: f.score ?? null,
      historico: Array.isArray(f.historico) ? f.historico : [],
    })),
    fonte,
    consultadoEm: new Date().toISOString(),
  };
}
