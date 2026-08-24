export interface UserIdParams {
  id: string;
}

export interface UpdateUserRequest {
  name?: string;
  phone?: string | null;
  city?: string | null;
  bio?: string | null;
}
