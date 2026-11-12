// Não recebe dados do cliente: o Telegram apenas avisa sobre a chegada do pedido.
const MESSAGE = [
  '🚨 NOVO ORÇAMENTO — MS ELÉTRICA ⚡',
  '',
  'Um cliente acabou de solicitar um orçamento de instalação de Wallbox pelo site!',
  '',
  '📩 Verifique seu Gmail para consultar os dados do cliente.',
  '',
  'Responda o mais rápido possível para não perder a oportunidade.'
].join('\n');

export async function notifyWallboxTelegram(env) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return false;
  // A API oficial exige o token no caminho. Nunca registre a URL ou erros do fetch.
  try {
    const response = await fetch(`https://api.telegram.org/bot${encodeURIComponent(env.TELEGRAM_BOT_TOKEN)}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: env.TELEGRAM_CHAT_ID, text: MESSAGE }),
      signal: AbortSignal.timeout(8000)
    });
    if (!response.ok) throw new Error();
    const result = await response.json();
    if (result.ok !== true) throw new Error();
    return true;
  } catch {
    // O erro original pode incluir a URL da API, que contém o token do bot.
    throw new Error('telegram_notification_failed');
  }
}
