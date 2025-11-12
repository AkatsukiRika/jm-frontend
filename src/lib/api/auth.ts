import { apiRequest } from './client';
import type { LoginRequest, LoginResponse, ApiResponse } from '../types/api';

/**
 * 用户登录
 */
export async function login(
  credentials: LoginRequest
): Promise<ApiResponse<LoginResponse>> {
  return apiRequest<LoginResponse>('/api/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}
