describe('Encryption (AES-256-GCM)', () => {
  beforeAll(() => {
    process.env.ENCRYPTION_KEY = 'a'.repeat(64);
  });

  it('encrypts and decrypts correctly', () => {
    const { encrypt, decrypt } = require('../../src/utils/encryption');
    const original = 'my-secret-token-123';
    const encrypted = encrypt(original);
    expect(encrypted).not.toBe(original);
    expect(encrypted.split(':')).toHaveLength(3);
    expect(decrypt(encrypted)).toBe(original);
  });

  it('random IV = different ciphertext each time', () => {
    const { encrypt, decrypt } = require('../../src/utils/encryption');
    const a = encrypt('same');
    const b = encrypt('same');
    expect(a).not.toBe(b);
    expect(decrypt(a)).toBe(decrypt(b));
  });
});
