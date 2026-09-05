export interface CompanyMemberAddedData {
  companyId: string;
  userId: string;
  role: string;
}

export interface CompanyMemberRemovedData {
  companyId: string;
  userId: string;
}

export interface CompanyMemberRoleChangedData {
  companyId: string;
  userId: string;
  fromRole: string;
  toRole: string;
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
  durationMinutes?: number;
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

export interface UserProfileEventData {
  userId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
}

export interface SpecialistProfileEventData {
  specialistProfileId: string;
  userId: string;
  /** Only present on `specialist.created`. */
  displayName?: string;
}

export interface CompanySpecialistLinkEventData {
  companyId: string;
  specialistProfileId: string;
}
