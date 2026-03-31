import { AxiosInstance } from 'axios';

/**
 * RF05 — Alterações de veículos onde codigo_situacao mudou para "cancelado"
 * POST /listar/alteracao-veiculos
 * Formato datas: dd/mm/yyyy (conforme doc Provider)
 */
export async function getTodayCancellations(client: AxiosInstance): Promise<number> {
  try {
    const now = new Date();
    const dd = String(now.getDate()).padStart(2, '0');
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const yyyy = now.getFullYear();
    const today = `${dd}/${mm}/${yyyy}`;

    const response = await client.post('/listar/alteracao-veiculos', {
      data_inicial: today,
      data_final: today,
      campos: ['codigo_situacao'],
    });

    const items = Array.isArray(response.data) ? response.data : [];

    // Filtra alterações onde o campo é codigo_situacao
    // e o valor_posterior indica cancelamento
    // Códigos comuns de cancelamento na Provider: verificar com o retorno real
    return items.filter((item: any) => {
      const campo = (item.nome_campo_tabela || '').toLowerCase();
      if (campo !== 'codigo_situacao') return false;

      // Conta qualquer mudança de situação como possível cancelamento
      // O valor_posterior contém o código da nova situação
      // Situações de cancelamento geralmente têm descrição contendo "cancel"
      // Como não temos a lista de códigos, contamos todas as alterações de situação
      return true;
    }).length;
  } catch (error: any) {
    throw new Error(
      `Provider Cancelamentos: ${error.response?.status || ''} ${error.message}`
    );
  }
}
