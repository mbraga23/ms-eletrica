# Rastreamento dos cliques no WhatsApp

## Conversão do Google Ads preservada

As seis páginas continuam carregando a tag do Google e configurando os mesmos destinos:

- Google Ads: `AW-17634662738`.
- Google Analytics 4: `G-BWRLT4XG1J`.
- Evento nativo do Ads: `conversion`.
- `send_to`: `AW-17634662738/ozZCCO7E2ewcENKy7thB`.

O objeto da chamada de conversão continua contendo somente o `send_to` original. A identificação dos botões foi acrescentada aos eventos analíticos existentes. Os nomes dos eventos, seletores, quantidade de listeners por botão e links do WhatsApp foram preservados.

## O que a medição comprova

Cada clique continua gerando `generate_lead` e a chamada de conversão do Ads. Wallbox, automação, CFTV e iluminação também mantêm seus eventos específicos `*_whatsapp_click`.

Esses eventos medem intenção de contato: não confirmam abertura do aplicativo, envio de mensagem, contato recebido ou lead qualificado. Esta alteração não acrescenta bloqueio de cliques repetidos nem muda a regra de contagem do Ads.

## Parâmetros dos eventos analíticos

| Parâmetro | Origem e significado |
| --- | --- |
| `cta_id` | `data-cta-id` do link. Identificador estável e único dentro da página. |
| `cta_position` | `data-cta-position`. Seção ou posição semântica do botão. |
| `page_type` | Identificação fixa da página: `home`, `wallbox`, `automacao`, `cftv`, `iluminacao` ou `contato`. |
| `service` | `data-service` do link. Indica o contexto do CTA; na página inicial, botões genéricos usam `geral`. Não comprova o serviço solicitado na conversa. |
| `page_location` | Endereço da página visitada. |
| `method` | `whatsapp`, preservado em `generate_lead`. |

Os valores anteriores de `service` nas páginas de serviço foram preservados: `wallbox`, `automacao_residencial`, `cftv` e `iluminacao`. O parâmetro `page: 'contato'` de `generate_lead` e o parâmetro `city: 'Lagoa Santa'` dos eventos específicos de automação e CFTV também continuam presentes.

O contexto padronizado acrescenta `page_location` a `generate_lead` em todas as páginas e inclui `city` também em `generate_lead` de automação e CFTV. Nenhum parâmetro foi acrescentado ao evento nativo `conversion` do Ads.

O handler lê `event.currentTarget`, que é o link ao qual o listener foi associado. Assim, clicar no ícone interno mantém a identificação do mesmo botão. A ausência de atributos `data-cta-*` apenas omite esses metadados, sem impedir os eventos originais.

Não enviar nomes, telefones, mensagens do WhatsApp ou outros dados pessoais nesses atributos. Para utilizar os novos parâmetros em relatórios personalizados do GA4, cadastrar definições personalizadas com escopo de evento na propriedade, conforme necessário. Essa configuração administrativa não é feita pelo HTML.

## Catálogo dos botões

| Página | `cta_id` |
| --- | --- |
| Inicial | `cabecalho_whatsapp`, `hero_orcamento`, `especialidade_wallbox`, `especialidade_automacao`, `especialidade_cftv`, `obra_orcamento`, `final_contato`, `flutuante_whatsapp` |
| Wallbox | `cabecalho_whatsapp`, `hero_avaliacao`, `sobre_enviar_informacoes`, `final_contato`, `flutuante_whatsapp` |
| Automação | `cabecalho_whatsapp`, `hero_avaliacao`, `integracao_cftv`, `primeiros_passos_ideia`, `cobertura_contato`, `final_contato`, `flutuante_whatsapp` |
| CFTV | `cabecalho_whatsapp`, `hero_avaliacao`, `integracao_automacao`, `cobertura_contato`, `final_contato`, `flutuante_whatsapp` |
| Iluminação | `cabecalho_orcamento`, `hero_orcamento`, `sobre_projeto`, `final_contato`, `flutuante_whatsapp` |
| Contato | `cabecalho_whatsapp`, `contato_whatsapp`, `flutuante_whatsapp` |

## Revisão antes de publicar

- Conferir no diff que a inicialização da tag, o ID do Ads, o ID do GA4 e o label da conversão são os mesmos.
- Conferir que cada botão continua tendo um listener de tracking e os mesmos eventos de antes.
- Validar o comportamento e os parâmetros em ambiente controlado, evitando contaminar a medição de produção com cliques de teste.
- Confirmar no Google Ads o vínculo entre o label e a ação de conversão desejada. O nome administrativo da ação não está armazenado no HTML.
- Consultar importações do GA4 e metas de campanha em leitura antes de propor qualquer alteração de otimização ou contagem.

Esta mudança deve ser revisada antes de entrar na branch de publicação. Não inclui alterações de campanhas, metas, faturamento, importações, definições personalizadas do GA4 ou deploy.
