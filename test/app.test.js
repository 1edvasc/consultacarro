import test from 'node:test';
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { createApp, loadConfig } from '../src/server.js';
import { createApiPlacasProvider } from '../src/providers/apiplacas.js';

async function start(provider, env = {}) {
  const cfg = loadConfig({ RATE_LIMIT_PER_HOUR: '2', ...env });
  const server = createServer(createApp({ cfg, provider }));
  await new Promise((r) => server.listen(0, r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { base, close: () => server.close() };
}

const sample = {
  error: false,
  basico: { error: false, dados: { marca: 'VOLKSWAGEN', modelo: 'T-CROSS', ano: '2022', anoModelo: '2022', cor: 'BRANCA', municipio: 'CURITIBA', uf: 'PR', chassi: '9BWZZZ377VT004251' } },
  fipe: { error: false, dados: [{ codigo_fipe: '005340-6', modelo: 'T-Cross 1.0', ano: 2022, valor: 'R$ 100.000,00', mes_referencia: 'outubro de 2026' }] },
};

test('cliente da API PLACAS envia Bearer e normaliza a resposta', async () => {
  let seen;
  const provider = createApiPlacasProvider({
    token: 'tok',
    fetchImpl: async (url, opts) => { seen = { url, auth: opts.headers.Authorization }; return new Response(JSON.stringify(sample)); },
  });
  const v = await provider.lookup('ABC1D23');
  assert.equal(seen.url, 'https://wdapi2.com.br/v3/basico-fipe/ABC1D23');
  assert.equal(seen.auth, 'Bearer tok');
  assert.equal(v.marca, 'VOLKSWAGEN');
  assert.equal(v.chassi, '***********004251');
  assert.equal(v.fipe[0].valorNum, 100000);
});

test('API PLACAS: 404 vira placa não encontrada e 402 vira erro', async () => {
  const notFound = createApiPlacasProvider({ token: 't', fetchImpl: async () => new Response('{"error":true,"codigo":"placa_nao_encontrada"}', { status: 404 }) });
  assert.equal(await notFound.lookup('ABC1234'), null);
  const broke = createApiPlacasProvider({ token: 't', fetchImpl: async () => new Response('{"error":true,"codigo":"saldo_insuficiente","message":"Saldo insuficiente"}', { status: 402 }) });
  await assert.rejects(broke.lookup('ABC1234'), /Saldo insuficiente/);
});

test('páginas, redirecionamentos, cache e limite por IP', async () => {
  let calls = 0;
  const provider = { name: 'Teste', lookup: async (p) => { calls++; return p === 'ZZZ9999' ? null : createApiPlacasProvider({ token: 't', fetchImpl: async () => new Response(JSON.stringify(sample)) }).lookup(p); } };
  const { base, close } = await start(provider);
  try {
    let r = await fetch(`${base}/`);
    assert.equal(r.status, 200);
    assert.match(await r.text(), /Consultar placa grátis/);

    r = await fetch(`${base}/buscar?placa=abc-1234`, { redirect: 'manual' });
    assert.equal(r.headers.get('location'), '/placa/ABC1234');

    r = await fetch(`${base}/placa/abc1234`, { redirect: 'manual' });
    assert.equal(r.status, 301);

    r = await fetch(`${base}/placa/ABC1234`);
    const html = await r.text();
    assert.equal(r.status, 200);
    assert.match(html, /T-CROSS/);
    assert.match(html, /ABC1C34/);
    assert.match(html, /R\$\s?1\.900,00/); // IPVA PR 1,9% de 100 mil

    await fetch(`${base}/placa/ABC1234`);
    assert.equal(calls, 1, 'segunda visita vem do cache');

    r = await fetch(`${base}/placa/ZZZ9999`);
    assert.equal(r.status, 404);

    r = await fetch(`${base}/placa/AAA1111`);
    assert.equal(r.status, 429, 'terceira placa nova no mesmo IP passa do limite de 2');

    r = await fetch(`${base}/placa/<script>`);
    assert.equal(r.status, 400);
    assert.doesNotMatch(await r.text(), /<script>/);

    r = await fetch(`${base}/robots.txt`);
    assert.match(await r.text(), /Disallow: \/placa\//);
  } finally {
    close();
  }
});
