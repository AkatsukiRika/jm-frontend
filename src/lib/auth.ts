const TOKEN_KEY = 'auth_token';
const USERNAME_KEY = 'auth_username';

/**
 * 保存用户登录信息
 */
export function saveAuthInfo(token: string, username: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USERNAME_KEY, username);
  }
}

/**
 * 获取 token
 */
export function getToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(TOKEN_KEY);
  }
  return null;
}

/**
 * 获取用户名
 */
export function getUsername(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem(USERNAME_KEY);
  }
  return null;
}

/**
 * 检查是否已登录
 */
export function isLoggedIn(): boolean {
  return !!getToken();
}

/**
 * 清除登录信息（登出）
 */
export function clearAuthInfo() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USERNAME_KEY);
  }
}
