import type { OperationRequest, OperationResponseByStatus, Schema } from '../core.js';

export type RegisterRequest = OperationRequest<'registerUser'>;
export type RegisterResponse = OperationResponseByStatus<'registerUser', 201>;
export type RegisterConflict = OperationResponseByStatus<'registerUser', 409>;

export type LoginRequest = OperationRequest<'loginUser'>;
export type LoginResponse = OperationResponseByStatus<'loginUser', 200>;
export type LoginUnauthorized = OperationResponseByStatus<'loginUser', 401>;

export type RefreshResponse = OperationResponseByStatus<'refreshSession', 200>;
export type LogoutResponse = OperationResponseByStatus<'logoutUser', 200>;
export type GetCurrentUserResponse = OperationResponseByStatus<'getCurrentUser', 200>;

export type AuthSessionSchema = Schema<'AuthSession'>;
