import { createApiPlacasProvider } from './apiplacas.js';
import { createMockProvider } from './mock.js';

export function createProvider(env = process.env) {
  if (env.API_PLACAS_TOKEN) return createApiPlacasProvider({ token: env.API_PLACAS_TOKEN, baseUrl: env.API_PLACAS_URL });
  return createMockProvider();
}
