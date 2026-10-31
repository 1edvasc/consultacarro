import { normalizeVehicle } from './normalize.js';

export class ProviderError extends Error {
  constructor(message, { status, code } = {}) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

// API PLACAS (apiplacas.com.br). Documentação: https://apiplacas.com.br/documentacao
// /basico-fipe cobra vehicle_basic (R$ 0,03) + FIPE (R$ 0,05) por placa nova.
export function createApiPlacasProvider({ token, baseUrl = 'https://wdapi2.com.br/v3', timeoutMs = 10_000, fetchImpl = fetch }) {
  if (!token) throw new Error('API_PLACAS_TOKEN ausente');
  return {
    name: 'API PLACAS',
    async lookup(plate) {
      let res;
      try {
        res = await fetchImpl(`${baseUrl}/basico-fipe/${encodeURIComponent(plate)}`, {
          headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
          signal: AbortSignal.timeout(timeoutMs),
        });
      } catch (err) {
        throw new ProviderError(`Falha ao contatar a API: ${err.message}`, { status: 503, code: 'rede' });
      }
      const body = await res.json().catch(() => null);
      if (res.status === 404) return null;
      if (!res.ok || body?.error) {
        throw new ProviderError(body?.message ?? `HTTP ${res.status}`, { status: res.status, code: body?.codigo });
      }
      if (body?.basico?.error && !body?.fipe?.dados?.length) return null;
      return normalizeVehicle(plate, body, 'API PLACAS');
    },
  };
}
