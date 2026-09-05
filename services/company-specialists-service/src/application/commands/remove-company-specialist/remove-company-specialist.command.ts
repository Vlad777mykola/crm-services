export interface RemoveCompanySpecialistCommand {
  companyId: string;
  specialistProfileId: string;
  requesterUserId: string;
  correlationId?: string;
}
