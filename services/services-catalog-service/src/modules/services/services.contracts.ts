export interface CreateServiceRequest {
  name: string;
  description?: string | null;
  category?: string | null;
  durationMinutes: number;
  price?: string | null;
}

export interface UpdateServiceRequest {
  name?: string;
  description?: string | null;
  category?: string | null;
  durationMinutes?: number;
  price?: string | null;
  status?: 'draft' | 'published';
}

export interface CompanyIdParams {
  companyId: string;
}

export interface ServiceIdParams {
  companyId: string;
  serviceId: string;
}

export interface ServiceOnlyIdParams {
  serviceId: string;
}

export interface PublicServicesQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
}

export interface AssignServiceSpecialistRequest {
  specialistProfileId: string;
}

export interface ServiceSpecialistParams {
  serviceId: string;
  specialistProfileId: string;
}
