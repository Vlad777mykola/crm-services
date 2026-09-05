export interface UserIdParams {
  id: string;
}

/**
 * Deliberately excludes email/phone/bio - GET /users/:id has no auth
 * requirement (any authenticated or anonymous caller can look up an id), so
 * it must never return PII. Full profile stays behind GET /users/me.
 */
export interface PublicUserProfile {
  id: string;
  name: string;
  city: string | null;
  status: string;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string | null;
  city?: string | null;
  bio?: string | null;
}
