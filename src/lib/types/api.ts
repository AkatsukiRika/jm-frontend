// API 响应的通用格式
export interface ApiResponse<T = unknown> {
  code: number; // 成功：0，失败：1，无资格：2
  message: string;
  data?: T;
}

// 登录请求参数
export interface LoginRequest {
  username: string;
  password: string;
}

// 登录响应数据
export interface LoginResponse {
  token?: string;
}
