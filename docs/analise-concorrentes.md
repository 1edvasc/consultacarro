# Análise: sites de consulta de placa (verificaplaca.com.br, keplaca.com)

> **Limitação desta análise:** a rede da sessão de pesquisa bloqueou o acesso direto a
> `verificaplaca.com.br` e `www.keplaca.com`. Não foi possível inspecionar o HTML, as
> requisições de rede (XHR/fetch) nem os scripts desses sites. O conteúdo abaixo junta
> o que foi **confirmado** em fontes públicas com o **padrão de mercado** dos sites desse tipo.
> As partes inferidas estão marcadas. Para confirmar qual fornecedor cada site usa, veja a seção 5.

## 1. O que se sabe dos dois sites

| Site | O que foi confirmado |
|---|---|
| verificaplaca.com.br | Domínio novo (cerca de 7 meses segundo o siteconfiavel.com.br), registrado em nome de **SIER SOLUCOES TECNOLOGICAS**, sem histórico no Reclame Aqui. |
| keplaca.com | Nenhum dado institucional confirmado. Aparece em artigos de "consulta de placa grátis". |

**Modelo de negócio típico (inferido, é o padrão do setor):**
1. **Isca grátis:** a pessoa digita a placa e recebe marca, modelo, ano, cor, cidade/UF e às vezes o valor FIPE.
   Esse dado custa centavos ao site.
2. **Paywall:** um "relatório completo" com débitos, multas, restrições, roubo/furto, leilão, sinistro,
   gravame e recall, por algo entre R$ 5 e R$ 50 (ex.: ePlaca cobra R$ 4,99 pelo relatório base).
   O site paga ao fornecedor B2B por consulta e fica com a diferença.
3. **Pagamento** por Pix ou cartão via gateway (Mercado Pago, Pagar.me, Asaas, Stripe etc.), relatório
   na tela e/ou em PDF por e-mail.
4. **Aquisição:** SEO com páginas do tipo "consulta placa grátis", "tabela FIPE pela placa" e Google Ads.

Ou seja: **esses sites quase nunca têm acesso próprio às bases oficiais**. Eles revendem APIs de
agregadores.

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
| **Assertiva** | BIN estadual e federal, gravame, leilão, indício de sinistro | sob contrato |
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

## 5. Como confirmar o fornecedor de cada concorrente (próximo passo)
Num navegador comum, com o DevTools aberto na aba **Network → Fetch/XHR**:
1. Fazer uma consulta grátis e ver para qual endpoint vai a placa (às vezes um backend próprio,
   mas o JSON costuma ter campos com nomes típicos de um fornecedor).
2. Ver o domínio do checkout para identificar o gateway de pagamento.
3. Abrir o relatório de exemplo/PDF: muitos trazem o rodapé ou o logo do bureau.
4. `whois`/registro.br e o CNPJ do rodapé, para ver a empresa e seu CNAE.
5. Ferramentas como BuiltWith/Wappalyzer para identificar o stack.

## Fontes
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
