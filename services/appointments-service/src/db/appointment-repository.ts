import type { Pool, PoolClient } from 'pg';

export interface AppointmentRow {
  id: string;
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  clientUserId: string;
  requestedStartAt: Date;
  status: string;
  notes: string | null;
  respondedAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateAppointmentInput {
  companyId: string;
  serviceId: string;
  specialistProfileId: string | null;
  clientUserId: string;
  requestedStartAt: Date;
  notes: string | null;
}

export interface StatusHistoryRow {
  id: string;
  appointmentId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: Date;
}

export class AppointmentRepository {
  constructor(private readonly pool: Pool) {}

  async create(client: PoolClient, input: CreateAppointmentInput): Promise<AppointmentRow> {
    const { rows } = await client.query<AppointmentRow>(
      `INSERT INTO appointments_schema.appointments
         ("companyId", "serviceId", "specialistProfileId", "clientUserId", "requestedStartAt", "status", "notes")
       VALUES ($1, $2, $3, $4, $5, 'pending', $6)
       RETURNING *`,
      [input.companyId, input.serviceId, input.specialistProfileId, input.clientUserId, input.requestedStartAt, input.notes],
    );
    return rows[0];
  }

  async findById(id: string): Promise<AppointmentRow | undefined> {
    const { rows } = await this.pool.query<AppointmentRow>(
      `SELECT * FROM appointments_schema.appointments WHERE "id" = $1`,
      [id],
    );
    return rows[0];
  }

  async findByIdAndCompany(id: string, companyId: string): Promise<AppointmentRow | undefined> {
    const { rows } = await this.pool.query<AppointmentRow>(
      `SELECT * FROM appointments_schema.appointments WHERE "id" = $1 AND "companyId" = $2`,
      [id, companyId],
    );
    return rows[0];
  }

  async findByIdAndClient(id: string, clientUserId: string): Promise<AppointmentRow | undefined> {
    const { rows } = await this.pool.query<AppointmentRow>(
      `SELECT * FROM appointments_schema.appointments WHERE "id" = $1 AND "clientUserId" = $2`,
      [id, clientUserId],
    );
    return rows[0];
  }

  async listByCompany(companyId: string): Promise<AppointmentRow[]> {
    const { rows } = await this.pool.query<AppointmentRow>(
      `SELECT * FROM appointments_schema.appointments WHERE "companyId" = $1 ORDER BY "createdAt" DESC`,
      [companyId],
    );
    return rows;
  }

  async listByClient(clientUserId: string): Promise<AppointmentRow[]> {
    const { rows } = await this.pool.query<AppointmentRow>(
      `SELECT * FROM appointments_schema.appointments WHERE "clientUserId" = $1 ORDER BY "createdAt" DESC`,
      [clientUserId],
    );
    return rows;
  }

  async updateStatus(
    client: PoolClient,
    id: string,
    fields: { status: string; respondedAt?: Date | null; completedAt?: Date | null },
  ): Promise<AppointmentRow> {
    const { rows } = await client.query<AppointmentRow>(
      `UPDATE appointments_schema.appointments
       SET "status" = $2,
           "respondedAt" = COALESCE($3, "respondedAt"),
           "completedAt" = COALESCE($4, "completedAt"),
           "updatedAt" = now()
       WHERE "id" = $1
       RETURNING *`,
      [id, fields.status, fields.respondedAt ?? null, fields.completedAt ?? null],
    );
    return rows[0];
  }

  async recordStatusChange(
    client: PoolClient,
    input: {
      appointmentId: string;
      fromStatus: string | null;
      toStatus: string;
      changedByUserId: string | null;
      reason?: string | null;
    },
  ): Promise<void> {
    await client.query(
      `INSERT INTO appointments_schema.appointment_status_history
         ("appointmentId", "fromStatus", "toStatus", "changedByUserId", "reason")
       VALUES ($1, $2, $3, $4, $5)`,
      [input.appointmentId, input.fromStatus, input.toStatus, input.changedByUserId, input.reason ?? null],
    );
  }

  async listStatusHistory(appointmentId: string): Promise<StatusHistoryRow[]> {
    const { rows } = await this.pool.query<StatusHistoryRow>(
      `SELECT * FROM appointments_schema.appointment_status_history WHERE "appointmentId" = $1 ORDER BY "createdAt" ASC`,
      [appointmentId],
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
