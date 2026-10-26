# Publicação do site — MS Elétrica & Tech

## Estado da migração

Preparação em 26/10/2026. O domínio oficial continua no **GitHub Pages**. O destino é **Cloudflare Pages com integração GitHub**, ainda sem projeto criado ou DNS alterado nesta preparação. O repositório principal continua sendo `mbraga23/ms-eletrica`.

Base auditada: commit `edd283a1ea89ccd51ee027e9997f7ee668536eed`. O PR de identificação dos botões do WhatsApp e as alterações locais dessa outra tarefa não fazem parte desta migração.

## Configuração do Cloudflare Pages

Criar em **Workers & Pages → Create application → Pages → Import an existing Git repository**. Autorizar a integração GitHub para este repositório; não usar Direct Upload, pois o objetivo é publicar automaticamente a cada push.

| Campo | Valor para este projeto |
| --- | --- |
| Repositório | `mbraga23/ms-eletrica` |
| Branch de produção | `main` |
| Framework preset | `None` |
| Root directory | Raiz do repositório; deixar vazio |
| Build command | `exit 0` |
| Build output directory | `.` |
| Variáveis, secrets e bindings | Nenhum necessário |

O site contém HTML, CSS e JavaScript embutidos e imagens em `img/`. Não há compilação, instalação de pacotes ou diretório `dist`. A integração deve manter os deploys automáticos da branch de produção habilitados. Anotar aqui o nome e o endereço reais do projeto após a criação; não presumir que o nome sugerido estará disponível.

O primeiro deploy de `main` deve usar uma revisão que já contenha `404.html` e `_headers`. Se a preparação ainda estiver apenas na branch de migração, validar seu preview antes de mesclar; não considerar o candidato protegido sem conferir o cabeçalho e o comportamento 404 reais.

## URLs e arquivos preservados

- Principal: `https://mseletricaetech.com.br/`.
- Páginas: `/wallbox/`, `/iluminacao/`, `/automacao/`, `/cftv/` e `/contato/`.
- Preservar títulos, descriptions, canonical, Open Graph, JSON-LD, `robots.txt`, `sitemap.xml` e `google9db414ac277743df.html`.
- Preservar GA4 `G-BWRLT4XG1J`, Ads `AW-17634662738` e o destino de conversão `AW-17634662738/ozZCCO7E2ewcENKy7thB`, junto com seus eventos e links do WhatsApp.
- `_headers` adiciona `noindex` somente aos hosts `pages.dev`; o domínio oficial continua indexável. Confirmar o cabeçalho no deploy real.
- `404.html` evita o fallback de SPA do Pages: endereço inexistente deve responder HTTP 404, em vez de retornar a home com HTTP 200.

**CNAME:** manter `mseletricaetech.com.br` enquanto GitHub Pages estiver ativo. Esse arquivo pertence à configuração do GitHub Pages por branch; ele não configura domínios no Cloudflare e não deve receber o endereço `pages.dev`. Após o corte validado e a desativação autorizada do GitHub Pages, sua remoção pode ser feita separadamente.

## Ordem da migração

1. Criar o projeto Pages conectado ao GitHub, inicialmente só com seu endereço temporário `pages.dev`. Manter o GitHub Pages ativo.
2. Testar todas as páginas em desktop e celular, imagens, fontes, menus, links, WhatsApp, eventos, canonical, sitemap, robots, 404 e URLs com UTM/GCLID/WBRAID/GBRAID. Comparar com o domínio oficial. Bloquear envios de medição durante testes automatizados para não registrar cliques de QA como conversões reais.
3. Antes de qualquer troca de DNS, obter o inventário completo da zona atual no Registro.br e registrar todos os serviços. A consulta pública não enumera todos os subdomínios ou seletores DKIM.
4. Preparar a zona Cloudflare com todos os registros existentes, mantendo inicialmente os apontamentos web do GitHub. Conferir MX, SPF, DKIM, DMARC, verificações, CAA, SRV e subdomínios; não apagar registros de e-mail ou outros serviços.
5. Explicar e aprovar a transição de nameservers/DNSSEC. O domínio está nos NS `d.sec.dns.br` e `e.sec.dns.br`, com DS ativo na auditoria. Usar somente os nameservers que a Cloudflare atribuir à zona real.
6. Com a zona ativa e DNS validado, cadastrar o domínio oficial em **Custom domains** do projeto Pages e aplicar somente os registros web exigidos pela interface. Não inventar IP ou CNAME de destino.
7. Configurar `www` para o apex com redirecionamento permanente, preservando caminhos e query strings. Verificar certificado SSL, HTTPS e ausência de loops antes de considerar o corte concluído.
8. Revalidar o domínio oficial, GA4/Ads, sitemap, robots, canonical, arquivo de verificação e Search Console. Só depois recomendar a desativação do GitHub Pages.

### DNSSEC específico do Registro.br

O DNSSEC do serviço DNS Registro.br é automático e obrigatório. Seu fluxo de saída retira a chave antiga e só publica novos NS após ao menos duas horas; a transição pode levar até três horas. Não contornar essa espera nem copiar o DS antigo para a nova autoridade. Confirmar resolução validante e, após a estabilização, ativar DNSSEC na Cloudflare e cadastrar o novo DS efetivamente gerado no Registro.br. O retorno ao serviço DNS do Registro.br exige esperar quatro horas desde sua desativação; não prometer rollback imediato por simples troca de NS.

## Redirecionamentos e campanhas

O `_redirects` do Pages não oferece redirecionamento entre domínios. Para `www`, usar a configuração Cloudflare de **Bulk Redirect** após a zona estar pronta:

- Origem: `www.mseletricaetech.com.br/`, sem esquema, para cobrir HTTP e HTTPS conforme o tutorial oficial.
- Destino: `https://mseletricaetech.com.br/`.
- Status: `301`.
- Habilitar **Subpath matching**, **Preserve path suffix** e **Preserve query string**; conferir também o acesso HTTP e sua conversão para HTTPS.
- Não incluir outros subdomínios sem verificar seus serviços.
- O registro web de `www` precisa estar com proxy habilitado para a regra de redirecionamento Cloudflare atuar. Conferir o destino real no projeto e explicar a alteração de DNS antes de aplicá-la.

Exemplo de aceitação: `/wallbox/?utm_source=google&gclid=...` deve chegar ao mesmo caminho e parâmetros no domínio principal. O host `pages.dev` deve continuar acessível durante os testes; seu redirecionamento ao domínio oficial pode ser configurado depois do corte, preservando caminho e query string.

## Diagnóstico e retorno

- Em Pages, verificar branch e SHA do deploy, logs, `exit 0` e saída `.`. A raiz publicada precisa conter `index.html`, as pastas das páginas e `img/`.
- Se uma página interna falhar, verificar seu `index.html`, capitalização do caminho, barra final e ausência de fallback indevido para a home.
- Se uma imagem ou fonte falhar, conferir Network, status HTTP e origem do recurso. Alguns ícones/metadados usam URLs absolutas do domínio oficial; testar também os arquivos diretamente no candidato.
- Se Ads/GA4 falhar, verificar o carregamento da tag, IDs, consentimento/bloqueadores e as chamadas existentes. Não criar outra tag ou conversão para tentar corrigir sem diagnóstico.
- Se o domínio falhar, conferir **Custom domains**, DNS real e certificado antes de mudar registros. Um CNAME isolado, sem associar o domínio ao projeto, não conclui a configuração.
- Antes do corte, o GitHub Pages continua sendo a origem ativa. Após o corte, um retorno de hospedagem deve usar os registros web previamente inventariados; não confundir esse retorno com mudança de nameservers.
- Nunca colocar tokens ou credenciais no repositório. A integração GitHub Pages não deve ser desligada durante a validação do candidato.

## Referências oficiais

- [HTML estático](https://developers.cloudflare.com/pages/framework-guides/deploy-anything/) · [Integração GitHub](https://developers.cloudflare.com/pages/configuration/git-integration/github-integration/)
- [404 e rotas](https://developers.cloudflare.com/pages/configuration/serving-pages/) · [Cabeçalhos](https://developers.cloudflare.com/pages/configuration/headers/)
- [Domínios](https://developers.cloudflare.com/pages/configuration/custom-domains/) · [www para apex](https://developers.cloudflare.com/pages/how-to/www-redirect/)
- [Registro.br: DNSSEC](https://registro.br/tecnologia/dnssec/dns-e-dnssec/) · [Transição do DNS Registro.br](https://registro.br/tecnologia/caracteristicas-tecnicas/)
