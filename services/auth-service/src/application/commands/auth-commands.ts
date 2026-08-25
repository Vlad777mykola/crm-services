import type { DataSource } from 'typeorm';

import { IdentityRepository } from '../../db/identity-repository.js';
import { SessionRepository } from '../../db/session-repository.js';
import { env } from '../../env.js';
import { AppError } from '../../errors/AppError.js';
import type { RequestMeta } from '../../modules/auth/auth.service.js';
import { signAccessToken } from '../../security/jwt.js';
import { hashPassword, verifyPassword } from '../../security/password.js';
import { generateRefreshToken, hashRefreshToken } from '../../security/refresh-token.js';
import { TypeOrmAuthEventOutbox } from '../services/typeorm-auth-event-outbox.js';
import { toIdentityView, type AuthResult } from '../view-models/identity-view.js';

const PASSWORD_PROVIDER = 'password';

function refreshTokenExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
}

export class AuthCommands {
  constructor(
    private readonly dataSource: DataSource,
    private readonly identities: IdentityRepository,
    private readonly sessions: SessionRepository,
    private readonly outbox: TypeOrmAuthEventOutbox,
  ) {}

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

    const identity = await this.dataSource.transaction(async (manager) => {
      const createdIdentity = await this.identities.create(manager, {
        provider: PASSWORD_PROVIDER,
        providerUserId: input.email,
        email: input.email,
        passwordHash,
      });
      await this.outbox.record(manager, {
        type: 'auth.user_registered',
        aggregateId: createdIdentity.id,
        payload: { userId: createdIdentity.id, email: input.email, name: input.name },
      });
      return createdIdentity;
    });

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
}
