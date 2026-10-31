import { formatPlate, toMercosul, toOld, plateFormat } from './plate.js';
import { estimateIpva, formatBRL } from './ipva.js';

export const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

function adsense(cfg) {
  return cfg.adsenseClient
    ? `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${esc(cfg.adsenseClient)}" crossorigin="anonymous"></script>`
    : '';
}

function adSlot(cfg) {
  return cfg.adsenseClient
    ? `<ins class="adsbygoogle ad" style="display:block" data-ad-client="${esc(cfg.adsenseClient)}" data-ad-format="auto" data-full-width-responsive="true"></ins><script>(adsbygoogle=window.adsbygoogle||[]).push({});</script>`
    : '';
}

export function searchForm(value = '') {
  return `<form class="search" action="/buscar" method="get" role="search">
  <label for="placa">Digite a placa</label>
  <div class="search-row">
    <input id="placa" name="placa" value="${esc(value)}" maxlength="8" autocomplete="off" spellcheck="false"
      placeholder="ABC1D23" pattern="[A-Za-z]{3}-?[0-9][A-Za-z0-9][0-9]{2}" required>
    <button type="submit">Consultar grátis</button>
  </div>
  <small>Formato antigo (ABC1234) ou Mercosul (ABC1D23), sem traço.</small>
</form>`;
}

export function layout(cfg, { title, description, body, canonical, noindex = false }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
${canonical ? `<link rel="canonical" href="${esc(cfg.siteUrl + canonical)}">` : ''}
${noindex ? '<meta name="robots" content="noindex">' : ''}
<link rel="stylesheet" href="/style.css">
${adsense(cfg)}
</head>
<body>
<header class="top"><a class="brand" href="/"><span class="plate-badge">BR</span> ConsultaCarro</a>
<nav><a href="/">Consultar placa</a><a href="/informacao">Fontes dos dados</a></nav></header>
<main>${body}</main>
<footer>
<p>ConsultaCarro é um site independente, sem vínculo com DETRAN, SENATRAN ou qualquer órgão público.
Os dados vêm de fornecedores privados e podem estar desatualizados; confirme no órgão oficial antes de fechar negócio.
Não exibimos dados pessoais de proprietários.</p>
<p><a href="/informacao">Fontes dos dados</a> · <a href="/privacidade">Privacidade</a></p>
</footer>
</body>
</html>`;
}

export function homePage(cfg) {
  return layout(cfg, {
    title: 'Consultar placa grátis – marca, modelo, FIPE e IPVA | ConsultaCarro',
    description: 'Consulte qualquer veículo pela placa, grátis: marca, modelo, ano, cor, município, valor FIPE e estimativa de IPVA.',
    canonical: '/',
    body: `<section class="hero">
<h1>Consultar placa grátis</h1>
<p>Veja marca, modelo, ano, cor, município, valor FIPE e uma estimativa do IPVA de qualquer veículo, só com a placa.</p>
${searchForm()}
</section>
${adSlot(cfg)}
<section class="cards">
<article><h2>Sem RENAVAM</h2><p>Basta a placa, no formato antigo ou Mercosul. A conversão entre os dois formatos aparece no resultado.</p></article>
<article><h2>Valor FIPE</h2><p>Preço médio de mercado pela Tabela FIPE do mês, com o código FIPE do modelo.</p></article>
<article><h2>IPVA estimado</h2><p>Calculado com a alíquota do estado de registro sobre o valor FIPE.</p></article>
</section>`,
  });
}

function row(label, value) {
  return value == null || value === '' ? '' : `<tr><th>${esc(label)}</th><td>${esc(value)}</td></tr>`;
}

export function vehiclePage(cfg, plate, result) {
  const fmt = plateFormat(plate);
  const other = fmt === 'antiga' ? toMercosul(plate) : toOld(plate);
  const canonical = `/placa/${plate}`;
  const conv = other ? `<p class="conv">${fmt === 'antiga' ? 'No padrão Mercosul' : 'No padrão antigo'}: <a href="/placa/${esc(other)}"><b>${esc(formatPlate(other))}</b></a></p>` : '';
  const head = `<h1>Placa <span class="plate">${esc(formatPlate(plate))}</span></h1>${conv}`;
  const noindex = !cfg.indexPlatePages;

  if (result.status === 'not_found') {
    return layout(cfg, { title: `Placa ${plate} não encontrada | ConsultaCarro`, description: `Consulta da placa ${plate}.`, canonical, noindex: true,
      body: `${head}<p class="notice">Nenhum veículo encontrado para esta placa. Confira se digitou corretamente.</p>${searchForm(plate)}` });
  }
  if (result.status !== 'ok') {
    const msg = result.status === 'rate_limited'
      ? 'Você fez muitas consultas em pouco tempo. Tente de novo daqui a alguns minutos.'
      : 'A fonte de dados está indisponível no momento. Tente de novo em instantes.';
    return layout(cfg, { title: `Placa ${plate} | ConsultaCarro`, description: `Consulta da placa ${plate}.`, noindex: true,
      body: `${head}<p class="notice warn">${msg}</p>${searchForm(plate)}` });
  }

  const v = result.vehicle;
  const fipe = v.fipe[0];
  const ipva = estimateIpva(v.uf, fipe?.valorNum);
  const name = [v.marca, v.modelo].filter(Boolean).join(' ');
  const fipeRows = v.fipe.map((f) => `<tr><td>${esc(f.codigo)}</td><td>${esc(f.modelo)}</td><td>${esc(f.ano)}</td><td class="num">${esc(f.valor)}</td></tr>`).join('');

  return layout(cfg, {
    title: `Placa ${formatPlate(plate)} – ${name || 'veículo'} | ConsultaCarro`,
    description: `Placa ${formatPlate(plate)}: ${name} ${v.anoModelo ?? v.ano ?? ''}, cor ${v.cor ?? '-'}, ${v.municipio ?? ''}/${v.uf ?? ''}. Valor FIPE e IPVA.`,
    canonical, noindex,
    body: `${head}
<p class="lead">${esc(name)}${v.anoModelo || v.ano ? ` · ${esc(v.ano ?? '')}/${esc(v.anoModelo ?? '')}` : ''}</p>
<div class="grid">
<section class="panel"><h2>Dados do veículo</h2><table>
${row('Marca', v.marca)}${row('Modelo', v.modelo)}${row('Versão', v.versao)}${row('Ano de fabricação', v.ano)}${row('Ano do modelo', v.anoModelo)}
${row('Cor', v.cor)}${row('Combustível', v.combustivel)}${row('Potência', v.potencia)}${row('Tipo', v.segmento)}${row('Espécie', v.especie)}
${row('Procedência', v.procedencia)}${row('Chassi', v.chassi)}${row('Município', v.municipio)}${row('UF', v.uf)}${row('Situação', v.situacao)}
</table></section>
<section class="panel"><h2>Valor FIPE</h2>
${fipe ? `<p class="big">${esc(fipe.valor)}</p><p class="muted">Referência: ${esc(fipe.mesReferencia ?? '-')}</p>` : '<p class="muted">Sem valor FIPE para este veículo.</p>'}
<h2>IPVA estimado</h2>
${ipva ? `<p class="big">${esc(formatBRL(ipva.value))}</p><p class="muted">Alíquota de ${esc(String(ipva.rate).replace('.', ','))}% em ${esc(v.uf)} sobre o valor FIPE. Estimativa: o valor oficial é definido pela SEFAZ do estado e pode ter descontos ou isenção.</p>` : '<p class="muted">Não foi possível estimar.</p>'}
</section>
</div>
${adSlot(cfg)}
${v.fipe.length > 1 ? `<section class="panel"><h2>Modelos FIPE compatíveis</h2><table class="list"><tr><th>Código</th><th>Modelo</th><th>Ano</th><th>Valor</th></tr>${fipeRows}</table></section>` : ''}
<p class="muted small">Fonte: ${esc(v.fonte)} · consultado em ${esc(new Date(v.consultadoEm).toLocaleDateString('pt-BR'))}</p>
${searchForm()}`,
  });
}

export function infoPage(cfg, providerName) {
  return layout(cfg, { title: 'Fontes dos dados | ConsultaCarro', description: 'De onde vêm os dados exibidos no ConsultaCarro.', canonical: '/informacao',
    body: `<h1>Fontes dos dados</h1>
<p>Os dados cadastrais do veículo (marca, modelo, ano, cor, município, UF) e o valor FIPE são obtidos de um fornecedor privado de consulta veicular (atualmente: <b>${esc(providerName)}</b>).</p>
<p>O valor FIPE é o preço médio de mercado publicado pela Fundação Instituto de Pesquisas Econômicas. O IPVA mostrado é uma <b>estimativa</b> feita com a alíquota do estado sobre o valor FIPE; o valor oficial é o da SEFAZ do estado.</p>
<p>Não exibimos nome, CPF ou endereço de proprietários. Para débitos, multas e restrições, consulte o DETRAN do seu estado.</p>` });
}

export function privacyPage(cfg) {
  return layout(cfg, { title: 'Privacidade | ConsultaCarro', description: 'Política de privacidade.', canonical: '/privacidade',
    body: `<h1>Privacidade</h1>
<p>Registramos a placa consultada e o endereço IP apenas para cache e prevenção de abuso. Não pedimos cadastro nem guardamos dados pessoais de proprietários de veículos.</p>
<p>Se houver anúncios, o Google pode usar cookies para exibi-los, conforme a política do Google AdSense.</p>` });
}

export function notFoundPage(cfg) {
  return layout(cfg, { title: 'Página não encontrada | ConsultaCarro', description: '', noindex: true,
    body: `<h1>Página não encontrada</h1>${searchForm()}` });
}
