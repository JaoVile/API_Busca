import axios from 'axios';

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
    // Quepasa usa token no path: /v3/bot/{token}/sendtext
    const url = `${params.baseUrl}/v3/bot/${params.token}/sendtext`;

    await axios.post(url, {
      chatId: `${params.phone}@s.whatsapp.net`,
      text: params.message,
    }, {
      headers: { 'Content-Type': 'application/json' },
      timeout: 15000,
    });

    console.log(`[QUEPASA] Mensagem enviada para ${params.phone}`);
    return true;
  } catch (error: any) {
    const detail = error.response?.data?.status || error.response?.data?.message || error.message;
    throw new Error(`Quepasa: ${detail}`);
  }
}
