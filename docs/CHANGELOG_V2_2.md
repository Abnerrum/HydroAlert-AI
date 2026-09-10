# HydroAlert AI v2.2 — território nacional, segurança e front-end

## Resumo

A versão 2.2 amplia a leitura territorial do dashboard para uma navegação Brasil → regiões → Goiás. A atualização também introduz headers defensivos na API, comparação constante do token de API, configuração explícita de hosts permitidos e uma camada visual responsiva para o novo explorador regional.

> As geometrias regionais exibidas no mapa são **camadas de referência visual** para navegação e demonstração. Elas não substituem limites oficiais, mapas de risco ou cartografia homologada.

## Alterações implementadas

| Área | Alteração | Resultado |
| --- | --- | --- |
| Mapa | Adicionados controles para Brasil, Norte, Nordeste, Centro-Oeste, Sudeste, Sul e Goiás. | O usuário pode centralizar o mapa por região sem perder o mapa operacional dos sensores de Goiás. |
| Mapa | Adicionadas caixas territoriais, rótulos e cores de referência no Leaflet. | A hierarquia Brasil → região → estado fica visível mesmo quando a base simulada possui sensores somente em Goiás. |
| Front-end | Criado o componente `region-explorer` com estados ativo, foco visível e layout responsivo. | A seleção funciona em desktop, tablet e celular. |
| API | Adicionado `TrustedHostMiddleware` configurável com `ALLOWED_HOSTS`. | Hosts não autorizados podem ser bloqueados em ambientes publicados. O padrão `*` foi mantido para facilitar o desenvolvimento local. |
| API | Adicionados `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy` e `Content-Security-Policy`. | O navegador recebe políticas defensivas contra MIME sniffing, clickjacking, vazamento de referrer e execução de recursos não autorizados. |
| API | A comparação de `X-API-Key` utiliza `hmac.compare_digest`. | A comparação do token deixa de usar uma comparação direta simples. |
| Configuração | Documentada a variável `ALLOWED_HOSTS` em `.env.example`. | O operador sabe como restringir os hosts aceitos em produção. |
| Testes | Adicionado teste para os headers de segurança. | A proteção básica do navegador passa a ser verificada automaticamente. |

## Configuração recomendada

Para desenvolvimento local, a configuração padrão é suficiente. Para um ambiente publicado, defina pelo menos:

```text
API_TOKEN=gere-um-token-forte-e-fora-do-repositorio
CORS_ORIGINS=https://seu-dominio.example
ALLOWED_HOSTS=seu-dominio.example
```

Os segredos não devem ser commitados. Use variáveis de ambiente, secrets do provedor de hospedagem ou um gerenciador de segredos.

## Validação

Na raiz do repositório:

```bash
ruff check .
python -m unittest discover -s tests -v
```

Para testar a política de hosts em um ambiente restrito, defina `ALLOWED_HOSTS` e envie uma requisição com um cabeçalho `Host` não autorizado. O Starlette deve responder com status `400`.

## Limitações

A base atual de sensores simulados continua concentrada em Goiás. As demais regiões possuem visualização territorial de referência e não possuem telemetria própria nesta versão. A integração futura com limites oficiais deve usar dados licenciados e fontes institucionais validadas.

## Referências

[1]: https://www.starlette.io/middleware/ "Starlette middleware documentation"
[2]: https://owasp.org/www-project-secure-headers/ "OWASP Secure Headers Project"
[3]: https://docs.python.org/3/library/hmac.html#hmac.compare_digest "Python hmac compare_digest documentation"
[4]: https://www.openstreetmap.org/copyright "OpenStreetMap copyright and attribution"
