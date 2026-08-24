import 'reflect-metadata';
import { DataSource } from 'typeorm';

import { env } from '../env.js';
import { MemberEntity } from './entities/member.entity.js';
import { MemberInvitationEntity } from './entities/member-invitation.entity.js';
import { OutboxEventEntity } from './entities/outbox-event.entity.js';
import { ProcessedEventEntity } from './entities/processed-event.entity.js';

export function createDataSource(): DataSource {
  return new DataSource({
    type: 'postgres',
    url: env.DATABASE_URL,
    entities: [MemberEntity, MemberInvitationEntity, ProcessedEventEntity, OutboxEventEntity],
    synchronize: false,
    logging: false,
  });
}
