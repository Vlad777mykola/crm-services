/** Matches contracts/events/auth.user_registered.v1.json's `data` shape. */
export interface AuthUserRegisteredData {
  userId: string;
  email: string;
  name: string;
}
