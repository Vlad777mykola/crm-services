import type { Pool, PoolClient } from 'pg';

export interface ReviewRow {
  id: string;
  appointmentId: string;
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  clientUserId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
}

export interface CreateReviewInput {
  appointmentId: string;
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  clientUserId: string;
  rating: number;
  comment: string | null;
}

export class ReviewRepository {
  constructor(private readonly pool: Pool) {}

  async findByAppointmentId(appointmentId: string): Promise<ReviewRow | undefined> {
    const { rows } = await this.pool.query<ReviewRow>(
      `SELECT * FROM reviews_schema.reviews WHERE "appointmentId" = $1`,
      [appointmentId],
    );
    return rows[0];
  }

  async create(client: PoolClient, input: CreateReviewInput): Promise<ReviewRow> {
    const { rows } = await client.query<ReviewRow>(
      `INSERT INTO reviews_schema.reviews
         ("appointmentId", "companyId", "serviceId", "specialistProfileId", "clientUserId", "rating", "comment")
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        input.appointmentId,
        input.companyId,
        input.serviceId,
        input.specialistProfileId,
        input.clientUserId,
        input.rating,
        input.comment,
      ],
    );
    return rows[0];
  }

  async listByCompany(companyId: string): Promise<ReviewRow[]> {
    const { rows } = await this.pool.query<ReviewRow>(
      `SELECT * FROM reviews_schema.reviews WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
      [companyId],
    );
    return rows;
  }

  async listByService(serviceId: string): Promise<ReviewRow[]> {
    const { rows } = await this.pool.query<ReviewRow>(
      `SELECT * FROM reviews_schema.reviews WHERE "serviceId" = $1 ORDER BY "createdAt" DESC`,
      [serviceId],
    );
    return rows;
  }

  async listBySpecialist(specialistProfileId: string): Promise<ReviewRow[]> {
    const { rows } = await this.pool.query<ReviewRow>(
      `SELECT * FROM reviews_schema.reviews WHERE "specialistProfileId" = $1 ORDER BY "createdAt" DESC`,
      [specialistProfileId],
    );
    return rows;
  }

  async withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await fn(client);
      await client.query('COMMIT');
      return result;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
}
