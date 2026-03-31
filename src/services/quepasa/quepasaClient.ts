import axios, { AxiosInstance } from 'axios';

export function createQuepasaClient(
  baseUrl: string,
  token: string
): AxiosInstance {
  return axios.create({
    baseURL: baseUrl,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    timeout: 15000,
  });
}
