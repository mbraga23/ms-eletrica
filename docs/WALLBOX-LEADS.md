# Solicitações de orçamento de Wallbox

O formulário envia dados a uma Pages Function; a resposta de sucesso só é enviada após a inserção no banco D1. A confirmação do formulário não depende do WhatsApp. O banco fica na conta Cloudflare da MS Elétrica e não no GitHub, Analytics ou Google Ads.

## Configuração obrigatória

- Criar banco D1 e aplicar `db/wallbox-leads.sql` no banco correto. Vinculá-lo ao projeto Pages como `WALLBOX_LEADS_DB`.
- Usar banco de teste separado e bindings de preview separados dos de produção. Nunca permitir que um deploy de teste escreva contatos no banco de produção.
- Configurar Turnstile para os domínios autorizados; a função exige resposta válida do Siteverify, hostname correspondente e action `wallbox_lead`.
- Configurar as variáveis de ambiente `TURNSTILE_SITE_KEY` (pública), `TURNSTILE_SECRET_KEY` (secreta) e `RATE_LIMIT_SECRET` (secreta, gerada aleatoriamente com pelo menos 32 bytes de entropia). Não registrar esses segredos no GitHub, em logs ou em capturas de tela.
- Na ausência do banco ou de qualquer chave, a função responde indisponibilidade; não exibir confirmação falsa.
- Após modificar bindings ou variáveis de ambiente no Pages, é necessário fazer novo deploy para que passem a valer.

## Como consultar

Na conta Cloudflare autorizada: **Computação → D1 → banco dos leads → Console**. Use a consulta abaixo para ver os 50 pedidos mais recentes. Os campos de origem e identificadores de anúncios são opcionais. Restrinja a conta Cloudflare a pessoas autorizadas.

```sql
SELECT created_at, name, whatsapp, vehicle, property, distance, source_page,
       referrer_origin, utm_json, click_ids_json
FROM wallbox_leads
ORDER BY created_at DESC
LIMIT 50;
```

Os campos de contato contêm dados pessoais. Não faça capturas públicas do console, não os copie para relatórios de Analytics/Ads e evite exportações desnecessárias. Defina e documente com o responsável uma política de retenção e exclusão conforme as necessidades e obrigações da empresa; não há exclusão automática de leads neste código.

## Repetições e proteção

O identificador aleatório de cada solicitação é uma chave única no D1; uma repetição idêntica retorna o registro existente, sem criar outro contato. A interface precisa manter o mesmo identificador nas tentativas do mesmo envio e obter um token Turnstile novo em cada tentativa. O Siteverify valida cada token no servidor, inclusive em repetições. A limitação por IP usa somente uma assinatura HMAC temporária, não o endereço IP em texto puro. Exige `RATE_LIMIT_SECRET` e limita a 10 tentativas por janela de 10 minutos. O servidor remove entradas de limitação antigas de forma oportunista. A validação inclui origem, tamanho de requisição, dados obrigatórios e listas permitidas de imóvel e distância.

O identificador da solicitação evita registros duplicados; ele não garante que o Google efetivamente receba ou conte cada evento em condições de bloqueio, queda de conexão ou fechamento do navegador. O clique em WhatsApp permanece uma medida diferente de um pedido recebido.

## Notificação

A implantação básica não envia notificação por e-mail. Consultar o D1 enquanto uma solução de aviso não estiver configurada e testada. A ativação do serviço de envio da Cloudflare pode exigir verificação do destino, configuração do domínio remetente e alterações DNS, que devem ser avaliadas antes de serem executadas.

## Testes locais

`node --test tests/wallbox-leads.test.mjs` usa SQLite em memória e simula o serviço de verificação; não envia contatos nem conversões para produção. Após configurar a infraestrutura, validar com banco e ambiente de prévia isolados, e confirmar separadamente o comportamento real do Google Ads.
