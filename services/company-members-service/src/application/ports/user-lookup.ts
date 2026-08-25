export interface UserSummary {
  name: string;
  email: string | null;
}

export interface UserLookup {
  findUserIdByEmail(email: string): Promise<string | undefined>;
  findUserNamesByIds(userIds: string[]): Promise<Map<string, UserSummary>>;
}
