import { TtlCache, RateLimiter } from './cache.js';

// Cache + limite por IP: cada placa nova é cobrada pelo fornecedor, então a mesma
// placa nunca é paga duas vezes dentro do TTL e um IP não consegue esvaziar o saldo.
export function createLookupService({ provider, ttlHours = 720, ratePerHour = 20 }) {
  const cache = new TtlCache({ ttlMs: ttlHours * 3_600_000 });
  const limiter = new RateLimiter({ limit: ratePerHour, windowMs: 3_600_000 });
  const inflight = new Map();

  return {
    providerName: provider.name,
    async lookup(plate, ip) {
      const cached = cache.get(plate);
      if (cached !== undefined) return { status: cached ? 'ok' : 'not_found', vehicle: cached, cached: true };
      if (!limiter.allow(ip)) return { status: 'rate_limited' };

      if (!inflight.has(plate)) {
        inflight.set(plate, provider.lookup(plate).finally(() => inflight.delete(plate)));
      }
      try {
        const vehicle = await inflight.get(plate);
        cache.set(plate, vehicle, vehicle ? undefined : 24 * 3_600_000);
        return { status: vehicle ? 'ok' : 'not_found', vehicle, cached: false };
      } catch (err) {
        console.error(`[lookup] ${plate}: ${err.message}`);
        return { status: 'error', error: err };
      }
    },
  };
}
