// Notificação assíncrona para o proprietário da MS Elétrica. Sem dados pessoais em logs.
const FROM = 'MS Eletrica & Tech <avisos@avisos.mseletricaetech.com.br>';
const DISTANCES = {
  ate_5m: 'Até 5 m',
  '5_a_10m': '5 a 10 m',
  '10_a_20m': '10 a 20 m',
  mais_20m: 'Mais de 20 m',
  nao_sei: 'Não informado'
};
const PROPERTIES = { casa: 'Casa', apartamento: 'Apartamento' };

export async function notifyWallboxLead(env, lead) {
  if (!env.RESEND_API_KEY || !env.WALLBOX_ALERT_EMAIL) return false;
  const body = [
    'NOVO PEDIDO DE ORÇAMENTO - WALLBOX',
    '',
    'Nome: ' + lead.name,
    'WhatsApp: ' + lead.phone,
    'Veículo: ' + (lead.vehicle || 'Não informado'),
    'Imóvel: ' + (PROPERTIES[lead.property] || 'Não informado'),
    'Distância: ' + (DISTANCES[lead.distance] || 'Não informado'),
    'Página: ' + lead.page,
    'Origem: ' + (lead.utm?.utm_source || 'Não informada'),
    'Campanha: ' + (lead.utm?.utm_campaign || 'Não informada'),
    '',
    'Conversar pelo WhatsApp: https://wa.me/55' + lead.phone,
    'ID do pedido: ' + lead.submissionId
  ].join('\n');
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + env.RESEND_API_KEY,
      'Content-Type': 'application/json',
      'Idempotency-Key': 'wallbox-lead/' + lead.submissionId
    },
    body: JSON.stringify({
      from: FROM,
      to: [env.WALLBOX_ALERT_EMAIL],
      subject: 'Novo pedido de orçamento de Wallbox - MS Elétrica',
      text: body
    }),
    signal: AbortSignal.timeout(8000)
  });
  if (!response.ok) throw new Error('notification_send_failed');
  return true;
}
