jest.mock('axios');
jest.mock('../../src/database/prismaClient', () => ({
  __esModule: true,
  default: {
    tenant: {
      findUnique: jest.fn().mockResolvedValue({ companyName: 'TestCorp' }),
    },
    tenantCredentials: {
      findUnique: jest.fn().mockResolvedValue({
        providerTokenEncrypted: 'mock',
        providerUserEncrypted: 'mock',
        providerPassEncrypted: 'mock',
        quepasaTokenEncrypted: 'mock',
        quepasaBaseUrl: 'http://localhost:31000',
        whatsappNumber: '5511999999999',
      }),
    },
    reportLog: {
      create: jest.fn().mockResolvedValue({}),
    },
  },
}));

jest.mock('../../src/utils/encryption', () => ({
  decrypt: jest.fn().mockReturnValue('mocked-token'),
}));

import axios from 'axios';

describe('Report Pipeline', () => {
  it('runs without throwing', async () => {
    const mockInstance = {
      get: jest.fn().mockResolvedValue({ data: { dados: [], total: 0 } }),
      post: jest.fn().mockResolvedValue({
        status: 200,
        data: { token_usuario: 'mock-token', total_veiculos: 0 },
      }),
    };
    (axios.create as jest.Mock).mockReturnValue(mockInstance);
    (axios.post as jest.Mock).mockResolvedValue({
      data: { token_usuario: 'mock-token' },
    });

    const { runReportForTenant } = require('../../src/jobs/reportPipeline');
    await expect(runReportForTenant('test-id')).resolves.not.toThrow();
  });
});
