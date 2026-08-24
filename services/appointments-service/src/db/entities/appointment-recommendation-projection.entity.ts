import { EntitySchema } from 'typeorm';

export interface AppointmentRecommendationProjection {
  id: string;
  appointmentId: string;
  companyId: string;
  summary: string;
  confidence: number;
  createdAt: Date;
}

export const AppointmentRecommendationProjectionEntity = new EntitySchema<AppointmentRecommendationProjection>({
  name: 'AppointmentRecommendationProjection',
  schema: 'appointments_schema',
  tableName: 'appointment_recommendation_projections',
  columns: {
    id: { type: 'uuid', primary: true },
    appointmentId: { type: 'uuid' },
    companyId: { type: 'uuid' },
    summary: { type: String },
    confidence: { type: 'numeric', precision: 3, scale: 2 },
    createdAt: { type: 'timestamptz', createDate: true },
  },
  indices: [
    { name: 'IDX_appointment_recommendation_projections_appointmentId', columns: ['appointmentId'] },
  ],
});
