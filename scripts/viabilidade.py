"""Modelo de viabilidade do ConsultaCarro (site grátis de placa com anúncios).

Uso: python3 scripts/viabilidade.py  — edite as PREMISSAS abaixo para testar seus números.
Todos os valores em R$. "Consulta" = uma pessoa consultando uma placa.
"""

PREMISSAS = {
    # Custo da API por placa NOVA (fora do cache)
    "custo_api": {
        "A: API PLACAS básico + FIPE (/basico-fipe)": 0.08,
        "B: API PLACAS só básico + FIPE grátis local": 0.03,
    },
    "cache_hit": 0.15,          # fração das consultas que já estão em cache (não pagam API)
    "bots": 0.10,               # fração das chamadas à API feitas por robôs (custam e não geram receita)
    "paginas_por_consulta": 2.0, # páginas com anúncio vistas por consulta (home + resultado)
    "imposto": 0.06,            # Simples Nacional, Anexo III, faixa inicial
    "custo_fixo_mes": 250.0,    # VPS ~60 + domínio ~4 + contador ~180 + Cloudflare grátis
    "rpm": {"pessimista": 8.0, "base": 15.0, "otimista": 30.0},  # R$ por 1.000 páginas vistas
    "consultas_mes": [10_000, 100_000, 500_000],
    # Afiliado de relatório completo (ex.: parceiro que paga comissão por venda)
    "afiliado_conversao": 0.005,  # 0,5% das consultas compram
    "afiliado_comissao": 8.0,     # R$ por venda (ex.: ~25% de um relatório de R$ 30)
    # Páginas FIPE por marca/modelo/ano (dados públicos, custo de API zero), por consulta de placa
    "paginas_fipe_por_consulta": 1.0,
}


def custo_api_por_consulta(custo_placa, p):
    # Só placas fora do cache pagam; robôs somam chamadas pagas sem receita.
    return custo_placa * (1 - p["cache_hit"]) / (1 - p["bots"])


def rpm_equilibrio(custo_placa, p, paginas):
    c = custo_api_por_consulta(custo_placa, p)
    return c * 1000 / (paginas * (1 - p["imposto"]))


def resultado_mes(n, custo_placa, rpm, p, paginas, afiliado=False):
    receita_ads = n * paginas * rpm / 1000
    receita_afiliado = n * p["afiliado_conversao"] * p["afiliado_comissao"] if afiliado else 0.0
    receita = receita_ads + receita_afiliado
    custo = n * custo_api_por_consulta(custo_placa, p) + p["custo_fixo_mes"] + receita * p["imposto"]
    return receita, custo, receita - custo


def num(v, casas):
    return f"{v:.{casas}f}".replace(".", ",")


def brl(v):
    s = f"{abs(v):,.0f}".replace(",", ".")
    return ("-R$ " if v < 0 else "R$ ") + s


def main(p=PREMISSAS):
    pag = p["paginas_por_consulta"]
    pag_fipe = pag + p["paginas_fipe_por_consulta"]
    print("## Custo de API por consulta e RPM de equilíbrio\n")
    print("| Opção de dados | Custo API/consulta | RPM de equilíbrio (2 págs) | RPM de equilíbrio (3 págs, com FIPE) |")
    print("|---|---|---|---|")
    for nome, c in p["custo_api"].items():
        print(f"| {nome} | R$ {num(custo_api_por_consulta(c, p), 4)} | R$ {num(rpm_equilibrio(c, p, pag), 2)} | R$ {num(rpm_equilibrio(c, p, pag_fipe), 2)} |")

    cenarios = [
        ("1. Só AdSense, dados A", "A", pag, False),
        ("2. Só AdSense, dados B", "B", pag, False),
        ("3. AdSense + páginas FIPE, dados B", "B", pag_fipe, False),
        ("4. AdSense + páginas FIPE + afiliado, dados B", "B", pag_fipe, True),
    ]
    chaves = {k[0]: v for k, v in p["custo_api"].items()}
    for titulo, dados, paginas, afiliado in cenarios:
        print(f"\n## {titulo}: lucro líquido por mês\n")
        print("| Consultas/mês | " + " | ".join(f"RPM {k} (R$ {v:.0f})" for k, v in p["rpm"].items()) + " |")
        print("|---|" + "---|" * len(p["rpm"]))
        for n in p["consultas_mes"]:
            linha = [brl(resultado_mes(n, chaves[dados], rpm, p, paginas, afiliado)[2]) for rpm in p["rpm"].values()]
            print(f"| {n:,}".replace(",", ".") + " | " + " | ".join(linha) + " |")

    n, rpm = 100_000, p["rpm"]["base"]
    print("\n## Detalhe: 100.000 consultas/mês, RPM base, cenário 4\n")
    receita, custo, lucro = resultado_mes(n, chaves["B"], rpm, p, pag_fipe, True)
    ads = n * pag_fipe * rpm / 1000
    api = n * custo_api_por_consulta(chaves["B"], p)
    print("| Linha | Valor |\n|---|---|")
    print(f"| Receita AdSense ({n * pag_fipe:,.0f} páginas × R$ {rpm:.0f}/mil) | {brl(ads)} |".replace(",", "."))
    print(f"| Receita afiliado ({n * p['afiliado_conversao']:,.0f} vendas × R$ {p['afiliado_comissao']:.0f}) | {brl(receita - ads)} |".replace(",", "."))
    print(f"| (−) API PLACAS | {brl(-api)} |")
    print(f"| (−) Impostos ({p['imposto']:.0%}) | {brl(-receita * p['imposto'])} |")
    print(f"| (−) Custos fixos | {brl(-p['custo_fixo_mes'])} |")
    print(f"| **Lucro líquido** | **{brl(lucro)}** |")
    print(f"| Margem | {lucro / receita:.0%} |")


if __name__ == "__main__":
    main()
