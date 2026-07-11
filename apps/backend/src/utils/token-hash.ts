import { createHash } from 'node:crypto';

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function verifyTokenHash(token: string, hash: string): boolean {
  const computedHash = createHash('sha256').update(token).digest('hex');
  return computedHash === hash;
}
