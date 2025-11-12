'use client';

import { useState, useEffect } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import styles from './page.module.css';
import { login } from '@/lib/api/auth';
import {
  saveAuthInfo,
  getUsername,
  isLoggedIn,
  clearAuthInfo,
} from '@/lib/auth';
import { getTheme, setTheme, type Theme } from '@/lib/theme';

export default function Settings() {
  const [language, setLanguage] = useState('English');
  const [currentTheme, setCurrentTheme] = useState<Theme>('light');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loggedIn, setLoggedIn] = useState(false);
  const [currentUsername, setCurrentUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // 检查登录状态和主题
  useEffect(() => {
    if (isLoggedIn()) {
      setLoggedIn(true);
      setCurrentUsername(getUsername() || '');
    }

    // 初始化主题状态
    setCurrentTheme(getTheme());
  }, []);

  // 处理主题切换
  const handleThemeChange = (newTheme: Theme) => {
    setCurrentTheme(newTheme);
    setTheme(newTheme);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error('Please enter username and password');
      return;
    }

    setIsLoading(true);

    try {
      const response = await login({ username, password });

      if (response.code === 0 && response.data?.token) {
        // 登录成功
        saveAuthInfo(response.data.token, username);
        setLoggedIn(true);
        setCurrentUsername(username);
        setPassword('');
        toast.success('Login successful!');
      } else {
        // 登录失败
        toast.error(response.message || 'Login failed');
      }
    } catch {
      toast.error('Network error, please try again');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    clearAuthInfo();
    setLoggedIn(false);
    setCurrentUsername('');
    setUsername('');
    setPassword('');
    toast.success('Logged out successfully');
  };

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>Settings</h1>

      {/* 语言和主题设置 */}
      <div className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>Preferences</h2>

        {/* Language 选择 */}
        <div className={styles.settingItem}>
          <label htmlFor="language" className={styles.label}>
            Language
          </label>
          <select
            id="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className={styles.select}
          >
            <option value="English">English</option>
            <option value="简体中文">简体中文</option>
            <option value="繁體中文">繁體中文</option>
          </select>
        </div>

        {/* Theme 选择 */}
        <div className={styles.settingItem}>
          <label htmlFor="theme" className={styles.label}>
            Theme
          </label>
          <select
            id="theme"
            value={currentTheme}
            onChange={(e) => handleThemeChange(e.target.value as Theme)}
            className={styles.select}
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </div>

      {/* 登录组件 */}
      <div className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>Account</h2>

        <div className={styles.loginContainer}>
          {loggedIn ? (
            // 已登录状态
            <>
              <div className={styles.loggedInStatus}>
                <p>You&apos;re currently logged in as {currentUsername}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutButton}
              >
                LOG OUT
              </button>
            </>
          ) : (
            // 未登录状态
            <>
              <div className={styles.loginPrompt}>
                <p>You&apos;re not signed in yet.</p>
                <p>Functions that require login will not be available.</p>
              </div>

              <form onSubmit={handleLogin} className={styles.loginForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="username" className={styles.formLabel}>
                    Username
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={styles.input}
                    placeholder="Enter your username"
                    disabled={isLoading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password" className={styles.formLabel}>
                    Password
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    placeholder="Enter your password"
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.loginButton}
                  disabled={isLoading}
                >
                  {isLoading ? 'Signing in...' : 'Sign In'}
                </button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Toast 通知组件 */}
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 2000,
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 3000,
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </div>
  );
}
