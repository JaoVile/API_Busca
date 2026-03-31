import { createQuepasaClient } from './quepasaClient';

export interface SendMessageParams {
  baseUrl: string;
  token: string;
  phone: string;
  message: string;
}

export async function sendWhatsAppMessage(
  params: SendMessageParams
): Promise<boolean> {
  try {
    const client = createQuepasaClient(params.baseUrl, params.token);

    await client.post('/v3/bot/sendtext', {
      chatId: `${params.phone}@s.whatsapp.net`,
      text: params.message,
    });

    console.log(`[QUEPASA] Mensagem enviada para ${params.phone}`);
    return true;
  } catch (error: any) {
    const detail = error.response?.data?.message || error.message;
    throw new Error(`Quepasa: ${detail}`);
  }
}
