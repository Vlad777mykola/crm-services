import { createHash, randomBytes } from 'node:crypto';

// The raw refresh token is returned to the client once (as an httpOnly cookie value)
// and never persisted - only its sha256 hash is stored, so a DB read alone can never
// yield a usable token.
export function generateRefreshToken(): string {
  return randomBytes(48).toString('hex');
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
