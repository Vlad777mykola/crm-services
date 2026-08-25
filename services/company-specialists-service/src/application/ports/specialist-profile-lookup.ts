export interface SpecialistProfileRef {
  id: string;
  userId: string;
}

export interface SpecialistProfileLookup {
  findById(specialistProfileId: string): Promise<SpecialistProfileRef | undefined>;
  findByUserId(userId: string): Promise<SpecialistProfileRef | undefined>;
}
