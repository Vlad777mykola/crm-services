export interface CompanyIdParams {
  companyId: string;
}

export interface RequestIdParams {
  requestId: string;
}

export interface SendSpecialistRequestRequest {
  specialistProfileId: string;
  message?: string | null;
}
