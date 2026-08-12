import type { Pool } from 'pg';

export class UserRepository {
  constructor(private readonly pool: Pool) {}

  /**
   * Idempotent: `ON CONFLICT DO NOTHING` means a redelivered
   * `auth.user_registered` event (RabbitMQ's at-least-once delivery) never
   * overwrites or duplicates the profile - safe alongside the
   * `processed_events` check in the consumer, which is the primary guard.
   */
  async createProfileIfMissing(input: { userId: string; email: string; name: string }): Promise<void> {
    await this.pool.query(
      `INSERT INTO users_schema.users ("id", "email") VALUES ($1, $2) ON CONFLICT ("id") DO NOTHING`,
      [input.userId, input.email],
    );
    await this.pool.query(
      `INSERT INTO users_schema.user_profiles ("userId", "name") VALUES ($1, $2) ON CONFLICT ("userId") DO NOTHING`,
      [input.userId, input.name],
    );
  }
}
