export interface CompanyMemberAddedData {
  companyId: string;
  userId: string;
  role: string;
}

export interface CompanyMemberRemovedData {
  companyId: string;
  userId: string;
}

export interface CompanyEventData {
  companyId: string;
  name: string;
}

export interface ServiceEventData {
  serviceId: string;
  companyId: string;
  name: string;
  status: string;
}

export interface SpecialistServiceEventData {
  serviceId: string;
  specialistProfileId: string;
}

export interface AiRecommendationCreatedData {
  recommendationId: string;
  appointmentId: string;
  companyId: string;
  summary: string;
  confidence: number;
}
