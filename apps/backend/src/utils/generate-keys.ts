/**
 * ES256 Key Pair Generator
 *
 * Generates EC P-256 key pairs for JWT signing and verification.
 * Run once to generate keys for your environment:
 *
 *   npx tsx src/utils/generate-keys.ts
 *
 * Output: PEM-encoded keys as base64 strings for .env configuration.
 */

import { generateKeyPair, exportPKCS8, exportSPKI } from 'jose';

async function generateKeyPairs() {
  console.log('🔐 Generating ES256 key pairs...\n');

  // Access token key pair
  const accessKeyPair = await generateKeyPair('ES256', { extractable: true });
  const accessPrivateKey = await exportPKCS8(accessKeyPair.privateKey);
  const accessPublicKey = await exportSPKI(accessKeyPair.publicKey);

  // Refresh token key pair (separate keys for isolation)
  const refreshKeyPair = await generateKeyPair('ES256', { extractable: true });
  const refreshPrivateKey = await exportPKCS8(refreshKeyPair.privateKey);
  const refreshPublicKey = await exportSPKI(refreshKeyPair.publicKey);

  // Base64 encode for safe storage in env vars
  const toBase64 = (pem: string) => Buffer.from(pem).toString('base64');

  console.log('# ── Access Token Keys ──────────────────────────');
  console.log(`JWT_ACCESS_PRIVATE_KEY=${toBase64(accessPrivateKey)}`);
  console.log(`JWT_ACCESS_PUBLIC_KEY=${toBase64(accessPublicKey)}`);
  console.log('');
  console.log('# ── Refresh Token Keys ─────────────────────────');
  console.log(`JWT_REFRESH_PRIVATE_KEY=${toBase64(refreshPrivateKey)}`);
  console.log(`JWT_REFRESH_PUBLIC_KEY=${toBase64(refreshPublicKey)}`);
  console.log('');

  // Verify the keys work
  const { jwtVerify, SignJWT } = await import('jose');
  const testPayload = { sub: 'test', jti: 'test-id' };
  const testToken = await new SignJWT(testPayload)
    .setProtectedHeader({ alg: 'ES256' })
    .setIssuedAt()
    .setExpirationTime('1m')
    .sign(accessKeyPair.privateKey);

  const { payload: verified } = await jwtVerify(testToken, accessKeyPair.publicKey, {
    algorithms: ['ES256'],
  });

  if (verified.sub === 'test') {
    console.log('✅ Key verification test passed');
  } else {
    console.error('❌ Key verification test failed');
    process.exit(1);
  }

  console.log('\n📋 Copy the values above into your .env file.');
  console.log('   To decode a key: Buffer.from(key, "base64").toString("utf-8")');
}

generateKeyPairs().catch((err) => {
  console.error('Failed to generate keys:', err);
  process.exit(1);
});
