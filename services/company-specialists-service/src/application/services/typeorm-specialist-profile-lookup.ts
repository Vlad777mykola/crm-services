import type { DataSource } from 'typeorm';

import {
  findSpecialistProfileById,
  findSpecialistProfileByUserId,
} from '../../db/legacy-specialists-bridge.js';
import type { SpecialistProfileLookup, SpecialistProfileRef } from '../ports/specialist-profile-lookup.js';

export class TypeOrmSpecialistProfileLookup implements SpecialistProfileLookup {
  constructor(private readonly dataSource: DataSource) {}

  findById(specialistProfileId: string): Promise<SpecialistProfileRef | undefined> {
    return findSpecialistProfileById(this.dataSource, specialistProfileId);
  }

  findByUserId(userId: string): Promise<SpecialistProfileRef | undefined> {
    return findSpecialistProfileByUserId(this.dataSource, userId);
  }
}
