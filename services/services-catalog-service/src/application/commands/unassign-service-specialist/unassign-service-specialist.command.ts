export interface UnassignServiceSpecialistCommand {
  serviceId: string;
  specialistProfileId: string;
  requesterUserId: string;
  correlationId?: string;
}
