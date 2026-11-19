/** Catálogo local das 27 unidades federativas.
 * A lista de navegação não depende da disponibilidade da API.
 * A presença da UF aqui NÃO indica que há sensores hidrológicos instalados.
 */
export const REGIOES_BRASIL = Object.freeze(["Norte","Nordeste","Centro-Oeste","Sudeste","Sul"])

export const ESTADOS_BRASIL = Object.freeze(
  [
  {
    "uf": "AC",
    "nome": "Acre",
    "regiao": "Norte"
  },
  {
    "uf": "AL",
    "nome": "Alagoas",
    "regiao": "Nordeste"
  },
  {
    "uf": "AP",
    "nome": "Amapá",
    "regiao": "Norte"
  },
  {
    "uf": "AM",
    "nome": "Amazonas",
    "regiao": "Norte"
  },
  {
    "uf": "BA",
    "nome": "Bahia",
    "regiao": "Nordeste"
  },
  {
    "uf": "CE",
    "nome": "Ceará",
    "regiao": "Nordeste"
  },
  {
    "uf": "DF",
    "nome": "Distrito Federal",
    "regiao": "Centro-Oeste"
  },
  {
    "uf": "ES",
    "nome": "Espírito Santo",
    "regiao": "Sudeste"
  },
  {
    "uf": "GO",
    "nome": "Goiás",
    "regiao": "Centro-Oeste"
  },
  {
    "uf": "MA",
    "nome": "Maranhão",
    "regiao": "Nordeste"
  },
  {
    "uf": "MT",
    "nome": "Mato Grosso",
    "regiao": "Centro-Oeste"
  },
  {
    "uf": "MS",
    "nome": "Mato Grosso do Sul",
    "regiao": "Centro-Oeste"
  },
  {
    "uf": "MG",
    "nome": "Minas Gerais",
    "regiao": "Sudeste"
  },
  {
    "uf": "PA",
    "nome": "Pará",
    "regiao": "Norte"
  },
  {
    "uf": "PB",
    "nome": "Paraíba",
    "regiao": "Nordeste"
  },
  {
    "uf": "PR",
    "nome": "Paraná",
    "regiao": "Sul"
  },
  {
    "uf": "PE",
    "nome": "Pernambuco",
    "regiao": "Nordeste"
  },
  {
    "uf": "PI",
    "nome": "Piauí",
    "regiao": "Nordeste"
  },
  {
    "uf": "RJ",
    "nome": "Rio de Janeiro",
    "regiao": "Sudeste"
  },
  {
    "uf": "RN",
    "nome": "Rio Grande do Norte",
    "regiao": "Nordeste"
  },
  {
    "uf": "RS",
    "nome": "Rio Grande do Sul",
    "regiao": "Sul"
  },
  {
    "uf": "RO",
    "nome": "Rondônia",
    "regiao": "Norte"
  },
  {
    "uf": "RR",
    "nome": "Roraima",
    "regiao": "Norte"
  },
  {
    "uf": "SC",
    "nome": "Santa Catarina",
    "regiao": "Sul"
  },
  {
    "uf": "SP",
    "nome": "São Paulo",
    "regiao": "Sudeste"
  },
  {
    "uf": "SE",
    "nome": "Sergipe",
    "regiao": "Nordeste"
  },
  {
    "uf": "TO",
    "nome": "Tocantins",
    "regiao": "Norte"
  }
]
    .sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))
    .map(estado=>Object.freeze(estado))
)
