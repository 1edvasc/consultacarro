import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { normalizePlate, isValidPlate } from './plate.js';
import { createProvider } from './providers/index.js';
import { createLookupService } from './lookup.js';
import { homePage, vehiclePage, infoPage, privacyPage, notFoundPage, layout, searchForm, esc } from './views.js';

const CSS_PATH = fileURLToPath(new URL('../public/style.css', import.meta.url));

export function loadConfig(env = process.env) {
  return {
    port: Number(env.PORT ?? 3000),
    siteUrl: (env.SITE_URL ?? 'http://localhost:3000').replace(/\/$/, ''),
    adsenseClient: env.ADSENSE_CLIENT || '',
    indexPlatePages: env.INDEX_PLATE_PAGES === 'true',
    trustProxy: env.TRUST_PROXY === 'true',
    cacheTtlHours: Number(env.CACHE_TTL_HOURS ?? 720),
    ratePerHour: Number(env.RATE_LIMIT_PER_HOUR ?? 20),
  };
}

export function createApp({ cfg = loadConfig(), provider = createProvider() } = {}) {
  const service = createLookupService({ provider, ttlHours: cfg.cacheTtlHours, ratePerHour: cfg.ratePerHour });
  let css;

  const send = (res, status, body, type = 'text/html; charset=utf-8', headers = {}) => {
    res.writeHead(status, { 'Content-Type': type, 'X-Content-Type-Options': 'nosniff', ...headers });
    res.end(body);
  };
  const redirect = (res, location, status = 302) => send(res, status, '', 'text/plain', { Location: location });

  return async function handler(req, res) {
    const url = new URL(req.url, 'http://local');
    const path = url.pathname;
    try {
      if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'Method Not Allowed', 'text/plain');
      if (path === '/') return send(res, 200, homePage(cfg));
      if (path === '/healthz') return send(res, 200, 'ok', 'text/plain');
      if (path === '/style.css') {
        css ??= await readFile(CSS_PATH);
        return send(res, 200, css, 'text/css; charset=utf-8', { 'Cache-Control': 'public, max-age=86400' });
      }
      if (path === '/robots.txt') {
        const rules = cfg.indexPlatePages ? 'Allow: /' : 'Disallow: /placa/\nDisallow: /buscar';
        return send(res, 200, `User-agent: *\n${rules}\n`, 'text/plain');
      }
      if (path === '/informacao') return send(res, 200, infoPage(cfg, service.providerName));
      if (path === '/privacidade') return send(res, 200, privacyPage(cfg));
      if (path === '/buscar') {
        const plate = normalizePlate(url.searchParams.get('placa'));
        return isValidPlate(plate) ? redirect(res, `/placa/${plate}`) : send(res, 400, invalidPage(cfg, url.searchParams.get('placa')));
      }
      const m = path.match(/^\/placa\/([^/]+)\/?$/);
      if (m) {
        const raw = decodeURIComponent(m[1]);
        const plate = normalizePlate(raw);
        if (!isValidPlate(plate)) return send(res, 400, invalidPage(cfg, raw));
        if (plate !== raw) return redirect(res, `/placa/${plate}`, 301);
        const result = await service.lookup(plate, clientIp(req, cfg));
        const status = { ok: 200, not_found: 404, rate_limited: 429 }[result.status] ?? 503;
        return send(res, status, vehiclePage(cfg, plate, result), undefined, status === 200 ? { 'Cache-Control': 'public, max-age=3600' } : {});
      }
      return send(res, 404, notFoundPage(cfg));
    } catch (err) {
      console.error(err);
      return send(res, 500, 'Erro interno', 'text/plain');
    }
  };
}

function invalidPage(cfg, value) {
  return layout(cfg, { title: 'Placa inválida | ConsultaCarro', description: '', noindex: true,
    body: `<h1>Placa inválida</h1><p class="notice warn">"${esc(value)}" não é uma placa válida. Use ABC1234 ou ABC1D23.</p>${searchForm()}` });
}

function clientIp(req, cfg) {
  if (cfg.trustProxy) {
    const fwd = req.headers['cf-connecting-ip'] ?? req.headers['x-forwarded-for']?.split(',')[0];
    if (fwd) return String(fwd).trim();
  }
  return req.socket.remoteAddress ?? 'unknown';
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const cfg = loadConfig();
  const provider = createProvider();
  createServer(createApp({ cfg, provider })).listen(cfg.port, () => {
    console.log(`ConsultaCarro em ${cfg.siteUrl} (porta ${cfg.port}, fonte: ${provider.name})`);
  });
}
