# Análise: sites de consulta de placa (verificaplaca.com.br, keplaca.com)

> **Atualização (análise direta):** os dois sites foram abertos com um navegador real (Playwright),
> com as chamadas de rede registradas e o JavaScript de produção inspecionado. As conclusões
> abaixo vêm do código que os próprios sites entregam ao navegador.

## 1. O que foi descoberto

### 1.1 verificaplaca.com.br: relatório pago, dados da **Assertiva** e da **CheckTudo**

**Stack**
- SPA em React + Vite + Tailwind + Radix/shadcn, servida atrás do Cloudflare.
- Backend em **Supabase**, com domínio próprio `api.verificaplaca.com.br/functions/v1/*` (Edge Functions).
  Tabelas visíveis no bundle: `consultas_placa`, `checkouts`, `checkout_agregados`, `upsell_settings`, `recovery_settings`.
- Anti-robô com **Cloudflare Turnstile** (sitekey `0x4AAAAAAB4SkkzucSgwmus0`): sem token, o botão
  "CONSULTAR PLACA" não é liberado.
- Pagamento pelo **Pagar.me**, em Pix (QR code) e cartão. O checkout pede nome, e-mail, CPF e telefone.
- Rastreamento: GTM, Google Ads, GA4 com tag first-party (`/sxim/...`), Meta Pixel com CAPI e Cloudflare Insights.
- **O mesmo código atende `automovelonline.com.br`** (canonical encontrado no bundle). É o mesmo
  operador, ou uma solução white-label, rodando mais de uma marca.

**Fluxo**
1. A placa vai para `POST functions/v1/consultar-placa-free` com `{placa, user_agent, turnstileToken}`.
   A resposta traz dados básicos do veículo (`placa_modelo_novo`, `placa_modelo_antigo`, `ano_modelo`, ...).
2. Uma tela "parcial" mostra parte dos dados e oferece os planos. O flag remoto `get-flow-config-public`
   (`skip_parcial_enabled`) faz teste A/B pulando essa tela.
3. `criar-checkout-pagarme` recebe `{placa, plano, consulta_id, customer:{name,email,document,phones}}`
   e devolve o QR do Pix.
4. Depois do pagamento vêm o upsell de adicionais (`criar-checkout-addon`, `get-checkout-addons`) e
   a recuperação de carrinho por e-mail (`recovery`, `unsubscribe`).

**Planos encontrados no código (R$)**
| id | Nome | Preço |
|---|---|---|
| `bin_estadual` | Débitos e Multas Estaduais (Renajud, débitos, movimentação) | 12,90 |
| `bin_estadual_owner` | "Quem é o Dono" | 12,90 |
| `gravame` | Gravame (financiamento) | 13,90 |
| `indicio_sinistro` | Indício de Sinistro | 14,90 |
| `leilao` | Leilão Completo (histórico, score de aceitação/vistoria, FIPE) | 34,90 |
| pacote `bin_estadual+bin_estadual_owner+bin_federal+renavam+gravame+indicio_sinistro` | Pacote Completo | 39,90 |
| pacote anterior `+leilao` | Pacote Completo + Leilão | 64,90 |
| outros | 9,90 / 15,90 (variações e adicionais) | |

Os ids dos planos (`bin_estadual`, `bin_federal`, `gravame`, `indicio_sinistro`, `leilao`) são
**exatamente os nomes dos produtos da API de Veículos da Assertiva**.

**Fornecedores de dados (prova direta):** o painel administrativo, que vem incluído no bundle público,
tem um gráfico de custo e margem por fornecedor com os campos `chamadas_assertiva`, `chamadas_checktudo`,
`custo_assertiva_brl`, `custo_checktudo_brl` e `custo_outro_brl`. Há também o texto: *"bureau: Fornecedor
de dados por trás do relatório (Assertiva ou CheckTudo). Vem do `bureau` gravado no checkout."*
Ou seja, cada relatório é comprado da **Assertiva** ou da **CheckTudo**, e o site mede a margem de cada venda.

> Observação: embutir o painel administrativo no bundle público expõe métricas internas a qualquer visitante.
> No nosso projeto, o admin deve ficar em um bundle ou rota separada, protegida no servidor.

### 1.2 keplaca.com: grátis, ganha dinheiro com **AdSense**

**Stack**
- Site PHP renderizado no servidor (`/site/site/templates/keplaca/...`), atrás do Cloudflare.
- Não há API no navegador: o formulário só redireciona para `GET /placa/ABC1234`, e a página já vem
  pronta do servidor. É SEO programático, com uma URL por placa.
- Receita: **Google AdSense** (`ca-pub-3144675853968749`) e Funding Choices (consentimento). Não há paywall.
- O texto usa português de Portugal ("Indique a placa", "Aulas Condução"), sinal de um operador
  português/europeu com uma rede de sites de SEO.

**Dados mostrados (exemplo: ABC1234):** marca, modelo, importado, ano, cor, potência, combustível,
chassi mascarado (`*****P246344`), UF, município, segmento, código e valor FIPE, IPVA, e a conversão
para a placa Mercosul (calculada localmente: o 2º número vira letra, 2→C).

**Fontes declaradas** (página `/informacao`): "sites do Detran, Renavam e outros", FIPE "em parceria com
o site Tabela FIPE Brasil" e IPVA "coletado do site IPVA" (SEFAZ/DETRAN). Na prática é a mesma base de
**dados cadastrais básicos** (marca/modelo/cor/município/chassi parcial) que vários fornecedores de
"placa básica" vendem por centavos, guardada em cache no servidor e cruzada com a FIPE pública.

#### API do keplaca: o que dá e o que não dá para provar (REA, 31/10/2026)

- Captura de rede da home + envio do formulário, analisada com o REA (`inspect_web_network_capture`
  → visão `api-surface`, Evidence `ev_73034b6f…c7a635`): as únicas chamadas do navegador são
  AdSense, Funding Choices, GA4 e o desafio do Cloudflare. **Nenhuma chamada de API de placa.**
- O único JS próprio (`script-base.js`, 12 KB) analisado com `analyze_javascript_application`
  (Evidence `ev_98da0ed5…757c71`): zero requisições (`fetch`/XHR/WebSocket). O formulário só faz
  `window.location = '/placa/' + placa`.
- Conclusão (observada): a consulta ao fornecedor acontece **no servidor PHP**. O nome do fornecedor
  não aparece em nada que o site entrega, então **não é possível provar qual API o keplaca usa**.
  O Cloudflare também bloqueia navegadores automatizados em `/placa/*` (HTTP 403).
- Inferência: os campos exibidos (marca, modelo, ano, cor, combustível, potência, segmento,
  chassi mascarado, município/UF, código e valor FIPE) batem com o que as APIs de "placa básica + FIPE"
  devolvem. A opção pública e barata que entrega exatamente esse conjunto é a **API PLACAS**
  (`apiplacas.com.br`, endpoint `wdapi2.com.br`, o domínio `wdapi2.com.br` redireciona para
  `apiplacas.com.br`). Usamos essa no nosso site.

**API PLACAS (apiplacas.com.br): pública, autoatendimento, pré-paga via Pix, sem mensalidade**
(preços da home do site em 31/10/2026; a página `/valores` ficou atrás do desafio do Cloudflare)

| Produto | Endpoint `https://wdapi2.com.br/v3` | Preço/consulta |
|---|---|---|
| Consulta veicular simples (marca, modelo, ano, cor, combustível, município) | `/basico/{placa}` | R$ 0,03 |
| Consulta FIPE | `/fipe/{placa}` | R$ 0,05 |
| Renavam | `/renavam/{placa}` | R$ 0,12 |
| Chassi | `/chassi/{placa}` | R$ 0,12 |
| Número do motor | `/motor/{placa}` | R$ 0,12 |
| Completa (básico + motor + chassi + Renavam, uma cobrança) | `/completa/{placa}` | R$ 0,20 |
| Com situação/restrições | (em preparação) | R$ 0,05 |

Autenticação `Authorization: Bearer <token>`; erros em JSON com `codigo` (`placa_invalida`,
`saldo_insuficiente` = HTTP 402, `placa_nao_encontrada` = 404); erros não são cobrados;
`/saldo` e `/logs` são grátis. Há bônus por faixa de recarga.

### 1.3 olhonocarro.com.br: líder de mercado, ecossistema **Gringo** + infraestrutura **CheckTudo**

Análise feita com o REA (`analyze_web_bundle` via CDP: 23 scripts, 20 parseados, Next.js com alta
confiança), mais a captura de rede de todas as origens e a leitura dos 39 scripts de produção (~4 MB).

**Stack**
- Front em **Next.js** (páginas estáticas com `_next/data/<buildId>/*.json`) com Redux, Radix e Tailwind,
  hospedado/servido na Vercel. Sentry e Dynatrace para monitoramento.
- APIs próprias em subdomínios:
  | Host | Papel (pelo código) |
  |---|---|
  | `onc-uluru-api.olhonocarro.com.br` | API principal: `/api/query/pre`, `/api/query/v2/...`, `/api/query/{id}/progress/sse` (progresso em tempo real por SSE), carrinho (`/api/user-cart/*`, `/api/anon-cart/`), cupons, usuário/LGPD (`/api/user/consent`, `/data/download`, `/set-to-deletion`), parceiros/afiliados (`/api/partner/incomings`), opinião do dono, test-drive |
  | `xbub67gq59.execute-api.sa-east-1.amazonaws.com/prod` | API de pagamento (AWS API Gateway em São Paulo, headers `X-Paym-Origin`/`X-Payme...`) |
  | `onc-highway.olhonocarro.com.br/api/event` + `gateway.olhonocarro.com.br/spec/1.0` | Pipeline próprio de eventos/analytics |
  | **`checktudo-hexagon.olhonocarro.com.br`** | CDN das fotos de anúncios no relatório (bloco `partnerInfo`) |
  | `hexagon-localizador-agregados.olhonocarro.com.br` | Fotos do "localizador de números" (chassi/motor gravados nas peças) |
  | `olhonocarro.usezapay.com.br` | **Zapay**: consulta grátis de débitos e emissão do CRLV digital, com pagamento de IPVA/multas |
  | `blog.olhonocarro.com.br` | WordPress headless via GraphQL (`GetPost`, `GetRecentPostsByCategory`...) |
- Outros: GrowthBook (feature flags/A-B, com flag `payment-v2`), Braze e Novu (CRM/notificações),
  Adjust (atribuição de app), FingerprintJS (`openfpcdn.io`, anti-fraude no fluxo de consulta),
  Hotjar, Clarity, GetSiteControl, selo do Reclame Aqui.
- Design system e ícones vêm do **Gringo** (`gringo-icon/*.svg`, classes `gng-*`, `GRINGO_KIND_MAP` para
  débitos, link "COTAR SEGURO" para `gringo.go.link`). O Olho no Carro roda dentro do ecossistema
  do app Gringo (super-app do motorista).

**Fluxo de consulta (pelo código)**
1. `POST /api/query/pre {plate | chassis}` devolve `plate, chassis, brand, model, brandImageUrl`
   ("confirmar dados do veículo", grátis).
2. Carrinho e cupom, depois pagamento na API AWS (`/pagamento`, `/checkout`). O cliente pode comprar
   pacotes de créditos (`/api/product/credit-packs`).
3. A consulta é processada de forma **assíncrona**: `/perfil/consulta/{id}/processando` acompanha o
   progresso por **SSE**, porque cada bloco vem de um fornecedor diferente e chega em tempos diferentes.
   Há `reprocess` (v2/v3) para os blocos que falharem.

**Produtos e preços** (`consultas-e-pacotes.json`, em centavos)
| code | Produto | Preço |
|---|---|---|
| 100 | Veículo Completo (mais de 25 informações) | R$ 64,90 |
| 30 | Veículo Essencial | R$ 45,90 |
| 18 | Leilão + Dados do Veículo | R$ 34,90 |
| — | Gravame | R$ 14,90 |
| 98 | Dados Cadastrais do Veículo | R$ 13,90 |
| crlv-digital | Débitos + CRLV digital (via Zapay) | grátis |

**Blocos do relatório** (estrutura real do relatório de exemplo em `index.json`, campo `queryData`):
`dadosPrincipais` (placa, renavam, chassi, motor...), `dadosCadastrais` (nacional + estadual, chassi
remarcado), `restrictions` (nacional/estadual), `renajudDetails`, `gravame`, `debtsAndFines`,
`theftHistory`, `sinistro`, `auctionHistory` + `auctionScore` (desvalorização %), `refusalInTrade`
(risco de comercialização), `insuranceAcceptance`, `recall`, `historicoProprietarios` (nº de donos, UFs),
`historicoKm`, `historicoDeManutencao`, `historicoFipe`, `custoMedio`, `fichaTecnica`, `partesPrincipais`,
`localizadorDeAgregado`, `partnerInfo` (fotos e preço de anúncios antigos), `cotacaoSeguro`,
`modelFailures`/`vehicleFailures`, `ownerReview`, `faturamento` (tipo de documento faturado).

**Fontes dos dados (o que o próprio site declara, mais as evidências)**
- Dados cadastrais nacionais: "registradas na **Senatran**" (base nacional/BIN).
- Sinistro: "bancos de dados que armazenam registros das **seguradoras**".
- Fotos e preço de anúncio: "**sites de venda parceiros**", servidos pelo host `checktudo-hexagon`, o
  que indica que o motor de dados/agregação é a **CheckTudo** (o mesmo bureau que o verificaplaca revende).
- Débitos e multas: **Zapay**, com mapeamento para IPVA, licenciamento, dívida ativa e `MULTA_RENAINF`.
- Preço: FIPE (com histórico) e referências MOLICAR no texto de seguro.
- Opinião do dono e blog: conteúdo próprio, o que dá SEO e diferencial.

### 1.4 Resumo dos três modelos
| | verificaplaca | keplaca | olhonocarro |
|---|---|---|---|
| Receita | Venda de relatório (R$ 12,90 a 64,90) com upsell | Anúncios (AdSense) | Relatório (R$ 13,90 a 64,90), créditos, afiliados, comissão da Zapay e cotação de seguro (Gringo) |
| Dado grátis | Básico com teaser, protegido por Turnstile | Básico + FIPE + IPVA, aberto | Marca/modelo + débitos/CRLV grátis (Zapay) |
| Fornecedor | Assertiva e CheckTudo (relatório) | Base cadastral básica + FIPE pública | Infra CheckTudo + Senatran + seguradoras + Zapay |
| Stack | React SPA + Supabase Edge Functions + Pagar.me | PHP server-side, uma página por placa | Next.js/Vercel + APIs próprias + AWS + SSE |
| Aquisição | Google Ads, Meta Ads (CAPI) | SEO orgânico | SEO (blog, catálogo, opinião do dono), app, CRM (Braze) |

**Lições do olhonocarro para o nosso projeto:**
- Processamento assíncrono por blocos com SSE: o relatório aparece aos poucos e o reprocessamento é por bloco.
- Isca grátis que **gera receita**: débitos e CRLV via parceiro de pagamento (modelo Zapay), em vez de só custo.
- Conteúdo próprio (opinião do dono, catálogo, falhas comuns do modelo) é diferencial que o bureau não vende.
- Página de LGPD completa: consentimento, download de dados e exclusão de conta.

## 2. De onde os dados vêm de verdade

### 2.1 Fontes primárias (oficiais)
| Fonte | O que tem | Como se acessa |
|---|---|---|
| **SENATRAN / RENAVAM, via Serpro** (base nacional, a "BIN") | Cadastro do veículo, chassi, restrições, roubo/furto, RENAINF (multas), recall | API REST do Serpro **só com Termo de Autorização do SENATRAN** e certificado digital. Não é viável para uma startup B2C. |
| **DETRANs estaduais** ("base estadual") | Débitos (IPVA, licenciamento, multas estaduais), bloqueios | Sites de cada DETRAN, em geral com placa + RENAVAM, às vezes com captcha. Os agregadores automatizam isso. |
| **Sinesp Cidadão** (Ministério da Justiça) | Situação de roubo/furto | App/site com login gov.br. Uso automatizado não é permitido. |
| **Tabela FIPE** | Preço médio de mercado | Pública e gratuita (marca/modelo/ano → preço). O cruzamento placa → modelo FIPE precisa de uma fonte de cadastro. |
| **Leiloeiros, seguradoras, B3/SNG (gravame)** | Leilão, sinistro/perda total, alienação fiduciária | Bases privadas, vendidas por bureaus. |

### 2.2 Agregadores B2B (o que os concorrentes provavelmente usam)
| Fornecedor | Destaques | Preço informado |
|---|---|---|
| **APIBrasil** | Placa + FIPE + chassi | ~R$ 0,10/consulta (segundo o blog da própria empresa) |
| **WebXcar** | Placa básica + FIPE, chassi | Chassi a R$ 2,99, tem teste grátis |
| **ConsultarPlaca** (docs.consultarplaca.com.br) | FIPE por placa com histórico de 12 meses, leilão, sinistro, roubo/furto | não informado |
| **FipeAPI** (fipeapi.com.br) | FIPE por placa, token após cadastro | não informado |
| **Credify** | Cautelar completa: sinistro, roubo/furto, recall, gravame, leilão conjugado, indício de sinistro, FIPE, base nacional | sob contrato |
| **Assertiva** ✅ usado pelo verificaplaca | BIN estadual e federal, gravame, leilão, indício de sinistro | sob contrato |
| **CheckTudo** ✅ usado pelo verificaplaca | Relatórios veiculares (leilão, sinistro, débitos, gravame) | sob contrato |
| **AnyCar** | Pagamento por chamada, sem mínimo, mais de 40 tipos de consulta | por chamada |
| **AvaliService, Motor Consulta, Brasil Dados** | Leilão em várias bases, consulta em lote, JSON | sob contrato |
| **Infosimples** | Automatiza portais do SENATRAN/Serpro/DETRAN | Muitas consultas exigem credencial do **titular** (gov.br/certificado), então não servem para consultar placa de terceiros |

## 3. Arquitetura proposta para o nosso site

```
[Next.js / landing SEO] → [API própria (Node/TS)] → [camada "providers"]
                                   │                    ├─ Provider A (barato: placa básica + FIPE)
                                   │                    ├─ Provider B (completo: leilão/sinistro/gravame)
                                   │                    └─ FIPE pública (fallback de preço)
                                   ├─ Cache (Redis/Postgres): mesma placa, sem pagar de novo por N horas
                                   ├─ Pagamentos (Pix + cartão) + webhook → libera o relatório
                                   └─ Gerador de PDF + e-mail
```

Recomendações para recriar melhor:
- **Interface de provider abstrata** (`consultarBasico`, `consultarCompleto`) para trocar ou combinar
  fornecedores por preço e disponibilidade, com fallback automático quando um cai.
- **Grátis de verdade com custo controlado:** mostrar o básico, usando cache agressivo e rate-limit
  por IP com captcha (Turnstile/hCaptcha), porque cada consulta grátis custa dinheiro.
- **Relatório em camadas** (básico / intermediário / completo) com preços escalonados, vendendo
  "pacotes" de N consultas para lojistas e revendas.
- **Diferenciais:** relatório com score de risco, explicação em linguagem simples de cada restrição,
  link permanente do relatório para compartilhar com o comprador, API própria para B2B.
- **SEO programático:** páginas por marca/modelo/ano com valor FIPE (dados públicos e gratuitos).

## 4. Pontos legais (importante)
- **LGPD:** não expor dados pessoais do proprietário (nome, CPF, endereço). Sites que mostram isso
  correm risco jurídico. Mostrar só dados do **veículo**.
- Confirmar com cada fornecedor a **origem lícita** da base e ter isso no contrato.
- Não fazer scraping de DETRAN/Sinesp em nome próprio: viola os termos e esbarra em captchas e
  bloqueios.
- Termos de uso e política de privacidade claros, com CNPJ visível. A falta disso é justamente o
  que gera o selo "Cuidado" nos concorrentes.
- Não se apresentar como órgão oficial nem usar marca do DETRAN/gov.br.

## 5. Como foi feita a confirmação (reproduzível)
Feito com Playwright nesta análise (seção 1). Para repetir manualmente, num navegador comum, com o DevTools aberto na aba **Network → Fetch/XHR**:
1. Fazer uma consulta grátis e ver para qual endpoint vai a placa (às vezes um backend próprio,
   mas o JSON costuma ter campos com nomes típicos de um fornecedor).
2. Ver o domínio do checkout para identificar o gateway de pagamento.
3. Abrir o relatório de exemplo/PDF: muitos trazem o rodapé ou o logo do bureau.
4. `whois`/registro.br e o CNPJ do rodapé, para ver a empresa e seu CNAE.
5. Ferramentas como BuiltWith/Wappalyzer para identificar o stack.

## Fontes
- https://apiplacas.com.br/
- https://apiplacas.com.br/documentacao
- https://www.siteconfiavel.com.br/site/verificaplaca-com-br
- https://serprocrm.custhelp.com/app/answers/detail/a_id/174/~/consulta-online-senatran
- https://portalservicos.senatran.serpro.gov.br/
- https://infosimples.com/consultas/senatran-meus-veiculos-comp/
- https://apibrasil.blog/consulta-placa-fipe-api-node-js/
- https://webxcar.com.br/consultas/
- https://docs.consultarplaca.com.br/
- https://fipeapi.com.br/documentacao-placa.php
- https://eplaca.com.br/
- https://docs.credify.com.br/api-reference/api-reference/2-veiculos-e-mobilidade/visao-geral
- https://integracao.assertivasolucoes.com.br/v3/portal/veiculos
- https://anycar.com.br/para-empresas/api
- https://avaliservice.com.br/
- https://www.motorconsulta.com.br/NossosServicos.aspx
- https://brasildados.org/consulta-veiculo-por-placa/
- https://tecnoblog.net/responde/como-saber-se-um-carro-e-roubado-pela-placa-app-sinesp-cidadao/
