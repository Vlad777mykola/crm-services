import type { Repository } from 'typeorm';

import { hashPassword, verifyPassword } from '@/common/auth/password.js';
import { signAccessToken } from '@/common/auth/jwt.js';
import { generateRefreshToken, hashRefreshToken } from '@/common/auth/refresh-token.js';
import { AppError } from '@/common/errors/AppError.js';
import { env } from '@/env/env.js';
import { AppDataSource } from '@/infrastructure/database/data-source.js';
import { User, UserStatus } from '@/modules/users/user.entity.js';

import { AuthIdentity } from './identities/auth-identity.entity.js';
import { Session, SessionStatus } from './sessions/session.entity.js';

const PASSWORD_PROVIDER = 'password';

export interface RequestMeta {
  userAgent: string | null;
  ipAddress: string | null;
}

export interface AuthResult {
  user: User;
  accessToken: string;
  refreshToken: string;
}

function getUserRepository(): Repository<User> {
  return AppDataSource.getRepository(User);
}

function getIdentityRepository(): Repository<AuthIdentity> {
  return AppDataSource.getRepository(AuthIdentity);
}

function getSessionRepository(): Repository<Session> {
  return AppDataSource.getRepository(Session);
}

function refreshTokenExpiryDate(): Date {
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + env.REFRESH_TOKEN_TTL_DAYS);
  return expiresAt;
}

async function issueSession(userId: string, meta: RequestMeta): Promise<{ session: Session; refreshToken: string }> {
  const sessionRepository = getSessionRepository();
  const refreshToken = generateRefreshToken();

  const session = await sessionRepository.save(
    sessionRepository.create({
      userId,
      refreshTokenHash: hashRefreshToken(refreshToken),
      status: SessionStatus.ACTIVE,
      userAgent: meta.userAgent,
      ipAddress: meta.ipAddress,
      expiresAt: refreshTokenExpiryDate(),
    }),
  );

  return { session, refreshToken };
}

export async function register(
  input: { email: string; name: string; password: string },
  meta: RequestMeta,
): Promise<AuthResult> {
  const userRepository = getUserRepository();
  const identityRepository = getIdentityRepository();

  const existing = await userRepository.findOne({ where: { email: input.email } });
  if (existing) {
    throw new AppError('A user with this email already exists', 409);
  }

  const passwordHash = await hashPassword(input.password);

  const user = await userRepository.save(
    userRepository.create({
      email: input.email,
      name: input.name,
      phone: null,
      status: UserStatus.ACTIVE,
    }),
  );

  await identityRepository.save(
    identityRepository.create({
      userId: user.id,
      provider: PASSWORD_PROVIDER,
      providerUserId: input.email,
      email: input.email,
      passwordHash,
    }),
  );

  const { refreshToken } = await issueSession(user.id, meta);
  const accessToken = signAccessToken(user.id);

  return { user, accessToken, refreshToken };
}

export async function login(input: { email: string; password: string }, meta: RequestMeta): Promise<AuthResult> {
  const userRepository = getUserRepository();
  const identityRepository = getIdentityRepository();

  const user = await userRepository.findOne({ where: { email: input.email } });
  if (!user) {
    throw new AppError('Invalid email or password', 401);
  }

  const identity = await identityRepository.findOne({
    where: { userId: user.id, provider: PASSWORD_PROVIDER },
  });

  if (!identity?.passwordHash || !(await verifyPassword(input.password, identity.passwordHash))) {
    throw new AppError('Invalid email or password', 401);
  }

  if (user.status !== UserStatus.ACTIVE) {
    throw new AppError('This account is disabled', 403);
  }

  const { refreshToken } = await issueSession(user.id, meta);
  const accessToken = signAccessToken(user.id);

  return { user, accessToken, refreshToken };
}

export async function refresh(
  rawRefreshToken: string | undefined,
  meta: RequestMeta,
): Promise<{ accessToken: string; refreshToken: string }> {
  if (!rawRefreshToken) {
    throw new AppError('Missing refresh token', 401);
  }

  const sessionRepository = getSessionRepository();
  const session = await sessionRepository.findOne({ where: { refreshTokenHash: hashRefreshToken(rawRefreshToken) } });

  if (!session || session.status !== SessionStatus.ACTIVE || session.expiresAt.getTime() < Date.now()) {
    throw new AppError('Invalid or expired refresh token', 401);
  }

  // Rotation: replace the stored hash in-place and extend the session's expiry.
  const newRefreshToken = generateRefreshToken();
  session.refreshTokenHash = hashRefreshToken(newRefreshToken);
  session.expiresAt = refreshTokenExpiryDate();
  session.userAgent = meta.userAgent ?? session.userAgent;
  session.ipAddress = meta.ipAddress ?? session.ipAddress;
  await sessionRepository.save(session);

  return { accessToken: signAccessToken(session.userId), refreshToken: newRefreshToken };
}

export async function logout(rawRefreshToken: string | undefined): Promise<void> {
  if (!rawRefreshToken) {
    return;
  }

  const sessionRepository = getSessionRepository();
  const session = await sessionRepository.findOne({ where: { refreshTokenHash: hashRefreshToken(rawRefreshToken) } });

  if (session && session.status === SessionStatus.ACTIVE) {
    session.status = SessionStatus.REVOKED;
    session.revokedAt = new Date();
    await sessionRepository.save(session);
  }
}

export async function getCurrentUser(userId: string): Promise<User> {
  const userRepository = getUserRepository();
  const user = await userRepository.findOne({ where: { id: userId } });

  if (!user) {
    throw new AppError('User not found', 404);
  }

  return user;
}
