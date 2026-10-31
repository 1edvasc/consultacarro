import { normalizeVehicle } from './normalize.js';

const MODELS = [
  ['VOLKSWAGEN', 'GOL 1.0 MPI', 'Flex', 'AUTOMOVEL', 'R$ 48.900,00', '005340-6'],
  ['FIAT', 'ARGO DRIVE 1.0', 'Flex', 'AUTOMOVEL', 'R$ 72.300,00', '001470-4'],
  ['CHEVROLET', 'ONIX LT 1.0 TURBO', 'Flex', 'AUTOMOVEL', 'R$ 81.500,00', '004498-3'],
  ['HONDA', 'CG 160 FAN', 'Flex', 'MOTOCICLETA', 'R$ 15.200,00', '811163-1'],
  ['TOYOTA', 'COROLLA XEI 2.0', 'Flex', 'AUTOMOVEL', 'R$ 129.900,00', '002162-0'],
];
const COLORS = ['BRANCA', 'PRATA', 'PRETA', 'CINZA', 'VERMELHA'];
const PLACES = [['SAO PAULO', 'SP'], ['CURITIBA', 'PR'], ['BELO HORIZONTE', 'MG'], ['PORTO ALEGRE', 'RS'], ['RECIFE', 'PE']];

function hash(s) {
  let h = 2166136261;
  for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619) >>> 0;
  return h;
}

// Dados fictícios e determinísticos por placa, para desenvolver sem gastar saldo.
export function createMockProvider() {
  return {
    name: 'Demonstração',
    async lookup(plate) {
      const h = hash(plate);
      if (h % 13 === 0) return null;
      const [marca, modelo, combustivel, segmento, valor, codigo] = MODELS[h % MODELS.length];
      const [municipio, uf] = PLACES[(h >>> 3) % PLACES.length];
      const ano = 2012 + ((h >>> 5) % 13);
      return normalizeVehicle(plate, {
        basico: {
          dados: {
            marca, modelo, ano: String(ano), anoModelo: String(ano + 1), cor: COLORS[(h >>> 7) % COLORS.length],
            combustivel, segmento, municipio, uf, situacao: 'SEM RESTRICAO', procedencia: 'NACIONAL',
            chassi: `9BW${String(h).padStart(14, '0').slice(-14)}`,
          },
        },
        fipe: { dados: [{ codigo_fipe: codigo, marca, modelo, ano: ano + 1, combustivel, valor, mes_referencia: 'outubro de 2026' }] },
      }, 'Demonstração (dados fictícios)');
    },
  };
}
