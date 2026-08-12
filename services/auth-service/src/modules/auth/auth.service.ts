import type { Pool } from 'pg';

import { AppError } from '../../errors/AppError.js';
import { env } from '../../env.js';
import type { AuthIdentityRow } from '../../db/identity-repository.js';
import { IdentityRepository } from '../../db/identity-repository.js';
import { SessionRepository } from '../../db/session-repository.js';
import { recordOutboxEvent } from '../../outbox/outbox-repository.js';
import { hashPassword, verifyPassword } from '../../security/password.js';
import { signAccessToken } from '../../security/jwt.js';
import { generateRefreshToken, hashRefreshToken } from '../../security/refresh-token.js';

const PASSWORD_PROVIDER = 'password';

export interface RequestMeta {
  userAgent: string | null;
  ipAddress: string | null;
}

/**
 * Minimal identity payload - Phase 2 intentionally does not return
 * name/phone/city/bio, which now live in users-service's own schema and
 * aren't reachable via HTTP until Phase 3 (`GET /users/me`). See
 * docs/architecture/microservices-extraction-checklist.md Task 2.4.
 */
export interface IdentityView {
  id: string;
  email: string | null;
  createdAt: Date;
}

export interface AuthResult {
  identity: IdentityView;
  accessToken: string;
  refreshToken: string;
}

function toIdentityView(row: AuthIdentityRow): IdentityView {
  return { id: row.id, email: row.email, createdAt: row.createdAt };
}

function refreshTokenExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
}

export class AuthService {
  private readonly identities: IdentityRepository;
  private readonly sessions: SessionRepository;

  constructor(private readonly pool: Pool) {
    this.identities = new IdentityRepository(pool);
    this.sessions = new SessionRepository(pool);
  }

  private async issueSession(userId: string, meta: RequestMeta): Promise<{ refreshToken: string }> {
    const refreshToken = generateRefreshToken();
    await this.sessions.create({
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: refreshTokenExpiryDate(),
    });
    return { refreshToken };
  }

  async register(input: { email: string; name: string; password: string }, meta: RequestMeta): Promise<AuthResult> {
    const existing = await this.identities.findByEmail(input.email);
    if (existing) {
      throw new AppError('A user with this email already exists', 409);
    }

    const passwordHash = await hashPassword(input.password);

    const client = await this.pool.connect();
    let identity: AuthIdentityRow;
    try {
      await client.query('BEGIN');
      identity = await this.identities.create(client, {
        provider: PASSWORD_PROVIDER,
        providerUserId: input.email,
        email: input.email,
        passwordHash,
      });
      // Published so users-service can create a profile - see
      // contracts/events/auth.user_registered.v1.json. Same DB transaction as
      // the identity insert, so both commit or roll back together.
      await recordOutboxEvent(client, {
        type: 'auth.user_registered',
        aggregateId: identity.id,
        payload: { userId: identity.id, email: input.email, name: input.name },
      });
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }

    const { refreshToken } = await this.issueSession(identity.id, meta);
    const accessToken = signAccessToken(identity.id);

    return { identity: toIdentityView(identity), accessToken, refreshToken };
  }

  async login(input: { email: string; password: string }, meta: RequestMeta): Promise<AuthResult> {
    const identity = await this.identities.findByEmail(input.email);

    if (!identity?.passwordHash || !(await verifyPassword(input.password, identity.passwordHash))) {
      throw new AppError('Invalid email or password', 401);
    }

    const { refreshToken } = await this.issueSession(identity.id, meta);
    const accessToken = signAccessToken(identity.id);

    return { identity: toIdentityView(identity), accessToken, refreshToken };
  }

  async refresh(rawRefreshToken: string | undefined, meta: RequestMeta): Promise<{ accessToken: string; refreshToken: string }> {
    if (!rawRefreshToken) {
      throw new AppError('Missing refresh token', 401);
    }

    const session = await this.sessions.findByRefreshTokenHash(hashRefreshToken(rawRefreshToken));

    if (!session || session.status !== 'active' || session.expiresAt.getTime() < Date.now()) {
      throw new AppError('Invalid or expired refresh token', 401);
    }

    const newRefreshToken = generateRefreshToken();
    await this.sessions.rotate(session.id, {
      refreshTokenHash: hashRefreshToken(newRefreshToken),
      expiresAt: refreshTokenExpiryDate(),
      userAgent: meta.userAgent ?? session.userAgent,
      ipAddress: meta.ipAddress ?? session.ipAddress,
    });

    return { accessToken: signAccessToken(session.userId), refreshToken: newRefreshToken };
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    if (!rawRefreshToken) {
      return;
    }

    const session = await this.sessions.findByRefreshTokenHash(hashRefreshToken(rawRefreshToken));

    if (session && session.status === 'active') {
      await this.sessions.revoke(session.id);
    }
  }

  async getCurrentIdentity(userId: string): Promise<IdentityView> {
    const identity = await this.identities.findById(userId);

    if (!identity) {
      throw new AppError('User not found', 404);
    }

    return toIdentityView(identity);
  }
}
