import axios, { AxiosInstance } from 'axios';

const BASE_URL = 'https://api.exemplo.com/v2';

/**
 * Etapa 1: Autentica com token SGA + usuario + senha
 * Retorna o token_usuario que será usado nas demais requisições
 * O token_usuario NÃO expira (conforme documentação Provider)
 */
export async function authenticateProvider(
  providerToken: string,
  usuario: string,
  senha: string
): Promise<string> {
  const response = await axios.post(
    `${BASE_URL}/usuario/autenticar`,
    { usuario, senha },
    {
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${providerToken}`,
      },
      timeout: 30000,
    }
  );

  const tokenUsuario = response.data?.token_usuario;
  if (!tokenUsuario) {
    throw new Error('Provider auth: token_usuario não retornado');
  }

  return tokenUsuario;
}

/**
 * Etapa 2: Cria um cliente HTTP autenticado com o token_usuario
 * Todas as chamadas subsequentes usam este cliente
 */
export function createProviderClient(tokenUsuario: string): AxiosInstance {
  return axios.create({
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${tokenUsuario}`,
    },
    timeout: 30000, // 30s padrão para chamadas rápidas
  });
}
