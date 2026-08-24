export interface CreateSpecialistProfileRequest {
  displayName: string;
  headline?: string | null;
  bio?: string | null;
  category?: string | null;
  city?: string | null;
  isRemoteSupported?: boolean;
}

export interface UpdateSpecialistProfileRequest {
  displayName?: string;
  headline?: string | null;
  bio?: string | null;
  category?: string | null;
  city?: string | null;
  isRemoteSupported?: boolean;
  status?: 'draft' | 'published';
}

export interface SpecialistIdParams {
  specialistId: string;
}

export interface PublicSpecialistsQuery {
  page?: number;
  pageSize?: number;
  q?: string;
  category?: string;
  city?: string;
  remoteOnly?: boolean;
}
