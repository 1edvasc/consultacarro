# ConsultaCarro

Consulta gratuita de veículo pela placa, no mesmo modelo do keplaca.com: página renderizada
no servidor, uma URL por placa (`/placa/ABC1D23`), dados básicos + FIPE + IPVA estimado,
receita opcional com AdSense. Node 20+ e nenhuma dependência.

```bash
npm start          # http://localhost:3000, modo demonstração (dados fictícios)
npm test
```

Para dados reais, crie uma conta na [API PLACAS](https://apiplacas.com.br), adicione saldo via
Pix e defina o token (veja `.env.example`):

```bash
API_PLACAS_TOKEN=seu_token SITE_URL=https://seu.dominio npm start
```

## Como funciona
- `GET /placa/{placa}` → `src/lookup.js` (cache + limite por IP) → fornecedor em `src/providers/`.
- Fornecedor real: `GET https://wdapi2.com.br/v3/basico-fipe/{placa}` com `Authorization: Bearer`.
  Custa R$ 0,03 (básico) + R$ 0,05 (FIPE) por placa nova; o cache evita pagar duas vezes.
- O token fica só no servidor (nunca no navegador).
- Conversão antiga ↔ Mercosul, chassi mascarado e IPVA estimado são calculados localmente.
- `robots.txt` bloqueia `/placa/*` por padrão: robôs visitando placas aleatórias gastariam saldo.
  Ative `INDEX_PLATE_PAGES=true` só com cache persistente e orçamento definido.
- Atrás do Cloudflare/proxy, use `TRUST_PROXY=true` para o limite por IP usar o IP real.

Análise dos concorrentes e da API: [docs/analise-concorrentes.md](docs/analise-concorrentes.md).
