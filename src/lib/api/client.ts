import type { ApiResponse } from '../types/api';

const BASE_URL = 'https://www.tang-ping.top';

/**
 * 通用的 API 请求函数
 */
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  const url = `${BASE_URL}${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers,
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: ApiResponse<T> = await response.json();
    return data;
  } catch (error) {
    // 网络错误或其他异常
    console.error('API request failed:', error);
    return {
      code: 1,
      message: error instanceof Error ? error.message : 'Network error',
    };
  }
}
