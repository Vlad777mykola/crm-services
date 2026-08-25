import type { DataSource } from 'typeorm';

import { AuthCommands } from '../../application/commands/auth-commands.js';
import { AuthQueries } from '../../application/queries/auth-queries.js';
import { TypeOrmAuthEventOutbox } from '../../application/services/typeorm-auth-event-outbox.js';
import type { AuthResult, IdentityView } from '../../application/view-models/identity-view.js';
import { IdentityRepository } from '../../db/identity-repository.js';
import { SessionRepository } from '../../db/session-repository.js';

export interface RequestMeta {
  userAgent: string | null;
  ipAddress: string | null;
  correlationId?: string;
}

/**
 * Minimal identity payload - Phase 2 intentionally does not return
 * name/phone/city/bio, which now live in users-service's own schema and
 * aren't reachable via HTTP until Phase 3 (`GET /users/me`). See
 * docs/architecture/microservices-extraction-checklist.md Task 2.4.
 */
export type { AuthResult, IdentityView } from '../../application/view-models/identity-view.js';

export class AuthService {
  private readonly commands: AuthCommands;
  private readonly queries: AuthQueries;

  constructor(dataSource: DataSource) {
    const identities = new IdentityRepository(dataSource);
    const sessions = new SessionRepository(dataSource);
    this.commands = new AuthCommands(dataSource, identities, sessions, new TypeOrmAuthEventOutbox());
    this.queries = new AuthQueries(identities);
  }

  async register(input: { email: string; name: string; password: string }, meta: RequestMeta): Promise<AuthResult> {
    return this.commands.register(input, meta);
  }

  async login(input: { email: string; password: string }, meta: RequestMeta): Promise<AuthResult> {
    return this.commands.login(input, meta);
  }

  async refresh(rawRefreshToken: string | undefined, meta: RequestMeta): Promise<{ accessToken: string; refreshToken: string }> {
    return this.commands.refresh(rawRefreshToken, meta);
  }

  async logout(rawRefreshToken: string | undefined): Promise<void> {
    return this.commands.logout(rawRefreshToken);
  }

  async getCurrentIdentity(userId: string): Promise<IdentityView> {
    return this.queries.getCurrentIdentity(userId);
  }
}
