# Viabilidade financeira: site grátis de consulta de placa (modelo keplaca)

> Estimativa de 25/11/2026. Os números saem de `scripts/viabilidade.py`; troque as premissas
> e rode `python3 scripts/viabilidade.py` para refazer as contas com dados reais.

## Resumo

- **Copiar o keplaca do jeito que está (API PLACAS `/basico-fipe` + só AdSense) dá prejuízo.**
  Cada consulta custa ~R$ 0,076 de API e rende ~R$ 0,03 de anúncio (2 páginas a RPM R$ 15).
  Só empata com RPM acima de **R$ 40 por mil páginas**, bem acima do que sites de nicho no Brasil
  costumam ter (R$ 12 a 35).
- **Fica viável com três ajustes:**
  1. Pagar só o básico (R$ 0,03) e tirar a FIPE de graça (tabela pública guardada localmente).
     O RPM de equilíbrio cai para ~R$ 15.
  2. Criar páginas FIPE por marca/modelo/ano, que dão pageview com anúncio sem custo de API.
  3. Somar uma receita por consulta além do anúncio (afiliado de relatório completo).
- No cenário base com os três ajustes, **100 mil consultas/mês dão ~R$ 4.900 de lucro líquido**
  (margem ~58%). Metade disso vem do afiliado, que é a premissa menos comprovada.
- O risco principal não é custo, é **tráfego**: o keplaca vive de SEO, e chegar a 100 mil
  consultas/mês leva meses. Comprar tráfego (Google Ads) não fecha: o clique custa mais
  que a receita de uma consulta.

## Premissas

| Premissa | Valor | De onde vem |
|---|---|---|
| API PLACAS básico | R$ 0,03/placa nova | apiplacas.com.br (preço público) |
| API PLACAS FIPE | R$ 0,05/placa nova | apiplacas.com.br |
| FIPE grátis | R$ 0 | tabela pública (fipe.api.br / parallelum): 500 a 1.000 req/dia grátis; baixar a tabela uma vez por mês e guardar local |
| Cache | 15% das consultas já estão em cache | estimativa conservadora: a maioria das placas é única |
| Robôs | 10% das chamadas pagas | estimativa; reduz com Turnstile + limite por IP (já no código) |
| Páginas com anúncio por consulta | 2 (home + resultado); 3 com uma página FIPE | estimativa |
| RPM AdSense | R$ 8 / 15 / 30 por mil páginas | blogs de monetização citam R$ 12–35 para nichos e R$ 3–15 genérico; não há dado oficial do nicho automotivo |
| Imposto | 6% | Simples Nacional Anexo III, faixa inicial (confirmar com contador) |
| Custo fixo | R$ 250/mês | VPS ~R$ 60, domínio ~R$ 4, contador ~R$ 180, Cloudflare grátis |
| Afiliado | 0,5% das consultas compram, R$ 8 de comissão | **hipótese**: depende de fechar parceria com um site de relatório pago |

Não consegui o tráfego do keplaca (Similarweb não tem o domínio indexado), então os volumes
são cenários, não uma estimativa do concorrente.

## Custo de API por consulta e RPM de equilíbrio

| Opção de dados | Custo API/consulta | RPM de equilíbrio (2 págs) | RPM de equilíbrio (3 págs, com FIPE) |
|---|---|---|---|
| A: API PLACAS básico + FIPE (/basico-fipe) | R$ 0,0756 | R$ 40,19 | R$ 26,79 |
| B: API PLACAS só básico + FIPE grátis local | R$ 0,0283 | R$ 15,07 | R$ 10,05 |

## 1. Só AdSense, dados A: lucro líquido por mês

| Consultas/mês | RPM pessimista (R$ 8) | RPM base (R$ 15) | RPM otimista (R$ 30) |
|---|---|---|---|
| 10.000 | -R$ 855 | -R$ 724 | -R$ 442 |
| 100.000 | -R$ 6.302 | -R$ 4.986 | -R$ 2.166 |
| 500.000 | -R$ 30.508 | -R$ 23.928 | -R$ 9.828 |

## 2. Só AdSense, dados B: lucro líquido por mês

| Consultas/mês | RPM pessimista (R$ 8) | RPM base (R$ 15) | RPM otimista (R$ 30) |
|---|---|---|---|
| 10.000 | -R$ 383 | -R$ 251 | R$ 31 |
| 100.000 | -R$ 1.579 | -R$ 263 | R$ 2.557 |
| 500.000 | -R$ 6.897 | -R$ 317 | R$ 13.783 |

## 3. AdSense + páginas FIPE, dados B: lucro líquido por mês

| Consultas/mês | RPM pessimista (R$ 8) | RPM base (R$ 15) | RPM otimista (R$ 30) |
|---|---|---|---|
| 10.000 | -R$ 308 | -R$ 110 | R$ 313 |
| 100.000 | -R$ 827 | R$ 1.147 | R$ 5.377 |
| 500.000 | -R$ 3.137 | R$ 6.733 | R$ 27.883 |

## 4. AdSense + páginas FIPE + afiliado, dados B: lucro líquido por mês

| Consultas/mês | RPM pessimista (R$ 8) | RPM base (R$ 15) | RPM otimista (R$ 30) |
|---|---|---|---|
| 10.000 | R$ 68 | R$ 266 | R$ 689 |
| 100.000 | R$ 2.933 | R$ 4.907 | R$ 9.137 |
| 500.000 | R$ 15.663 | R$ 25.533 | R$ 46.683 |

## Detalhe: 100.000 consultas/mês, RPM base, cenário 4

| Linha | Valor |
|---|---|
| Receita AdSense (300.000 páginas × R$ 15/mil) | R$ 4.500 |
| Receita afiliado (500 vendas × R$ 8) | R$ 4.000 |
| (−) API PLACAS | -R$ 2.833 |
| (−) Impostos (6%) | -R$ 510 |
| (−) Custos fixos | -R$ 250 |
| **Lucro líquido** | **R$ 4.907** |
| Margem | 58% |

## O que os números dizem

1. **O custo da API é o que decide.** Com dados A (R$ 0,08 por placa) nenhum cenário de só
   AdSense dá lucro, e quanto mais tráfego, maior o prejuízo. O keplaca provavelmente paga bem
   menos por placa (base própria acumulada ou compra em volume); isso é inferência, não dá
   para ver de fora.
2. **Páginas FIPE são o melhor lucro marginal:** tráfego de SEO com anúncio e custo de API
   zero. Elas não estão no código ainda (próximo passo).
3. **O afiliado faz o negócio ficar de pé no cenário pessimista.** Sem ele (cenário 3),
   RPM R$ 8 dá prejuízo em qualquer volume.
4. **Escala só ajuda quando a margem por consulta já é positiva.** Os custos fixos são baixos;
   o que importa é receita por consulta > custo de API por consulta.

## Ponto de equilíbrio por consulta (dados B, 3 páginas)

- Custo de API por consulta: R$ 0,028
- Receita de anúncio por consulta: 3 × RPM / 1.000 → R$ 0,045 com RPM R$ 15
- Sobra ~R$ 0,014 por consulta depois do imposto: são necessárias ~18 mil consultas/mês só
  para pagar os R$ 250 fixos, sem afiliado.

## Riscos

- **Tráfego:** SEO leva de 6 a 12 meses. Até lá, custo fixo sem receita (~R$ 250/mês).
- **AdSense:** o Google pode reprovar ou limitar sites de "dados de veículo" e páginas geradas
  automaticamente com pouco conteúdo. O RPM real só se conhece depois de rodar.
- **Robôs:** cada placa nova custa dinheiro. Se um robô passar pelo limite, o saldo some.
  Manter Turnstile, limite por IP, `robots.txt` bloqueando `/placa/*` e alerta de saldo baixo
  na API PLACAS.
- **Fornecedor único:** se a API PLACAS subir preço ou cair, o site para. A camada de
  provider já permite trocar.
- **Jurídico/LGPD:** não mostrar dados de proprietário; vender chassi/Renavam completos só
  depois de validar com advogado.

## Próximos passos sugeridos

1. Trocar `/basico-fipe` por `/basico` + tabela FIPE local (corta 62% do custo de API).
2. Criar páginas `/fipe/{marca}/{modelo}/{ano}` geradas da tabela FIPE (SEO sem custo de API).
3. Procurar programa de afiliados de relatório veicular e medir a conversão real.
4. Rodar 1–2 meses com orçamento de API limitado (ex.: R$ 100 de saldo) e trocar as premissas
   deste modelo pelos números reais de RPM, cache e conversão.

## Fontes

- API PLACAS, preços: https://apiplacas.com.br/
- RPM AdSense no Brasil (estimativas de blogs): https://bigdatauniversity.com.br/?p=111964 ,
  https://guiaferramentasdigitais.com.br/guias/google-adsense-como-funciona/ ,
  https://www.ranktracker.com/pt-br/blog/adsense-payment-trends-by-country/
- FIPE grátis e limites: https://www.tabnews.com.br/dedx/guia-completo-da-api-fipe-como-consultar-precos-de-veiculos-no-brasil ,
  https://packagist.org/packages/deividfortuna/fipe
