export type AuthContext = {
  userId: string;
};

export type AccessTokenPayload = {
  sub: string;
  iss?: string;
  aud?: string;
  iat?: number;
  exp?: number;
};

export type VerifyAccessTokenOptions = {
  jwtSecret: string;
  issuer?: string;
  audience?: string;
};
