# Publicação do site — MS Elétrica & Tech

## Estado em 28/10/2026

O site oficial está em **Cloudflare Pages**, no projeto `ms-eletrica`. O endereço temporário é <https://ms-eletrica.pages.dev>. O GitHub continua armazenando o código em `mbraga23/ms-eletrica`; os deploys automáticos da branch `main` estão habilitados.

Deploy validado: `45d8547f-fbcd-472c-bdde-7cf5613eda4c`, da revisão `1155778da4d934d9ecf345880008c14d0d5638d2` de `main`. Cada push para `main` aciona uma nova publicação no Pages; outras branches podem gerar previews.

| Configuração | Valor atual |
| --- | --- |
| Framework | `None` |
| Root directory | Vazio: raiz do repositório |
| Build command | `exit 0` |
| Build output directory | `.` |
| Dependências de build | Nenhuma; HTML, CSS e JavaScript embutidos e imagens em `img/` |
| Domínios personalizados | `mseletricaetech.com.br` e `www.mseletricaetech.com.br`, ativos com SSL |
| DNS web | Dois CNAMEs, apex e `www`, apontando para `ms-eletrica.pages.dev`, ambos com proxy habilitado |
| Nameservers ativos | `greg.ns.cloudflare.com` e `lilith.ns.cloudflare.com` |
| Registro.br | Registro e renovação do domínio; a zona DNS é administrada na Cloudflare |

## Redirecionamento em produção

A regra habilitada **WWW para domínio principal** usa **Single Redirect**. Responde `301` e mantém a query string (`preserve_query_string: true`).

Expressão:

```text
(http.request.full_uri wildcard r"http*://www.mseletricaetech.com.br/*")
```

Destino dinâmico:

```text
wildcard_replace(http.request.full_uri, r"http*://www.mseletricaetech.com.br/*", r"https://mseletricaetech.com.br/${2}")
```

Os 29 casos HTTP/HTTPS verificados passaram, com um salto, caminho e parâmetros preservados e sem loops. Não criar uma segunda regra equivalente sem revisar possíveis conflitos.

## Validações concluídas

- Seis páginas (`/`, `/wallbox/`, `/iluminacao/`, `/automacao/`, `/cftv/`, `/contato/`), 20 arquivos/recursos e fontes conferidos. Conteúdo, URLs, canonical, metadados, JSON-LD, `robots.txt` e sitemap preservados.
- O `noindex` de `_headers` aplica-se somente aos hosts `pages.dev`; o domínio oficial permanece sem esse bloqueio. `404.html` evita o fallback de SPA para endereços inexistentes.
- Os 34 CTAs mantêm links, identificação e eventos. GA4 `G-BWRLT4XG1J`, Ads `AW-17634662738` e destino `AW-17634662738/ozZCCO7E2ewcENKy7thB` foram preservados. O SDK Google respondeu `200` e o `page_view` do GA4, `204`. Não foi gerado lead de teste; os envios ao Ads foram bloqueados durante a validação.
- DNSSEC ativo: novo DS cadastrado no Registro.br; chave 2371, algoritmo 13 e resumo SHA-256 conferidos. Os resolvedores Google e Cloudflare retornaram o DS correspondente e respostas com `AD=true`, sem erro de resolução.
- Search Console: a tela da propriedade `https://mseletricaetech.com.br/` exibiu proprietário verificado e método **Arquivo HTML** concluído em 28/10. O arquivo `/google9db414ac277743df.html` permanece no projeto; o Pages responde `308` para o mesmo caminho sem `.html`, seguido de `200` com o token preservado. Manter esse arquivo. A tela confirma a situação atual da propriedade, não uma nova verificação forçada do arquivo pelo Google.
- Sitemap no Search Console: `sitemap.xml` com status **Processado**, última leitura em 28/10/2026 e seis páginas encontradas. Páginas encontradas no sitemap não comprovam indexação.

## Pendências

**Google Ads:** o recebimento efetivo da conversão pela conta ainda não foi confirmado. A conferência dos eventos no navegador não comprova recebimento de um lead nem envio de mensagem no WhatsApp. Não disparar conversões artificiais para encerrar essa pendência.

## Diagnóstico de deploy

- Em **Workers & Pages → ms-eletrica → Implantações**, conferir o status, a branch, o SHA e os logs. Se uma alteração não aparecer, comparar o SHA publicado com a revisão esperada de `main`.
- Conferir `exit 0`, saída `.` e raiz vazia. A saída deve conter `index.html`, as pastas das páginas e `img/`; não há instalação de pacotes ou pasta `dist` neste projeto.
- Se só o domínio falhar, consultar **Domínios personalizados**, certificado e os registros DNS reais antes de alterar o código. Se só um recurso falhar, verificar seu caminho e capitalização no navegador.
- Validar mudanças em preview antes de incorporá-las à produção. Manter canonical no domínio oficial e o `noindex` do host de preview; bloquear conversões durante testes de cliques. Um retorno de versão pelo Pages deve ser coordenado com a revisão do GitHub para evitar que o próximo push restaure o problema.

## Reserva e retorno

O **GitHub Pages continua habilitado como reserva**, sem ser a origem atual do domínio. O arquivo `CNAME` permanece com `mseletricaetech.com.br`; ele não configura o Cloudflare Pages e não deve receber o endereço `pages.dev`. A reserva não é um failover automático.

A tag `backup/pre-cloudflare-pages-2026-10-26` preserva a revisão `edd283a1ea89ccd51ee027e9997f7ee668536eed`. Ela é uma referência de recuperação, não uma instrução para sobrescrever o código atual.

Resumo dos nove registros web anteriores, conferidos no inventário da zona antes do corte:

| Nome | Tipo | Valores anteriores |
| --- | --- | --- |
| Apex | 4 × A | `185.199.108.153`, `185.199.109.153`, `185.199.110.153`, `185.199.111.153` |
| Apex | 4 × AAAA | `2606:50c0:8000::153`, `2606:50c0:8001::153`, `2606:50c0:8002::153`, `2606:50c0:8003::153` |
| `www` | 1 × CNAME | `mbraga23.github.io` |

Se houver necessidade de retorno, conferir primeiro a disponibilidade do GitHub Pages, seu domínio e certificado; depois revisar os registros web e a regra de redirecionamento antes de qualquer alteração autorizada. Não confundir retorno de hospedagem com troca de nameservers. Preservar o inventário completo da zona fora do repositório: este quadro resume somente os registros web. Preservar e-mail, verificações e outros registros; não remover `CNAME`, desativar GitHub Pages ou trocar DNS sem autorização. Nunca registrar tokens ou credenciais no repositório.

## Referências oficiais

- [Single Redirects](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/) · [Domínios do Pages](https://developers.cloudflare.com/pages/configuration/custom-domains/) · [Cabeçalhos do Pages](https://developers.cloudflare.com/pages/configuration/headers/)
- [DNSSEC na Cloudflare](https://developers.cloudflare.com/dns/dnssec/) · [DNSSEC no Registro.br](https://registro.br/tecnologia/dnssec/dns-e-dnssec/)
- [Verificação de propriedade no Search Console](https://support.google.com/webmasters/answer/9008080?hl=pt-BR)
