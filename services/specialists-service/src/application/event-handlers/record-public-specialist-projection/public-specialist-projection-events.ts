export interface CompanyCreatedData {
  companyId: string;
  name: string;
  slug: string;
}

export interface CompanyUpdatedData {
  companyId: string;
  name: string;
  status: string;
}

export interface CompanySpecialistData {
  companyId: string;
  specialistProfileId: string;
}

export interface ServiceData {
  serviceId: string;
  companyId: string;
  name: string;
  status: string;
}

export interface SpecialistServiceData {
  serviceId: string;
  companyId: string;
  specialistProfileId: string;
}

export interface ReviewReceivedData {
  specialistProfileId?: string | null;
  rating: number;
}
