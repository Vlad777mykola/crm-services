export interface CreateCompanyRequest {
  name: string;
  description?: string | null;
  category?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  isRemoteSupported?: boolean;
  city?: string | null;
  address?: string | null;
}

export interface UpdateCompanyRequest {
  name?: string;
  description?: string | null;
  category?: string | null;
  website?: string | null;
  phone?: string | null;
  email?: string | null;
  isRemoteSupported?: boolean;
  city?: string | null;
  address?: string | null;
  status?: 'draft' | 'published';
}

export interface CompanyIdParams {
  companyId: string;
}

export interface PublicCompaniesQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  city?: string;
}
