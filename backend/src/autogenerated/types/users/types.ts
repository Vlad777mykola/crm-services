import type { OperationRequest, OperationResponseByStatus, Schema } from '../core.js';

export type CreateUserRequest = OperationRequest<'createUser'>;
export type CreateUserResponse = OperationResponseByStatus<'createUser', 201>;
export type CreateUserConflict = OperationResponseByStatus<'createUser', 409>;

export type GetUserByIdResponse = OperationResponseByStatus<'getUserById', 200>;
export type GetUserByIdNotFound = OperationResponseByStatus<'getUserById', 404>;

export type UserSchema = Schema<'User'>;
