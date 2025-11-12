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
import { useTranslation } from '@/components/I18nProvider';
import { localeNames, type Locale } from '@/lib/i18n/locales';

export default function Settings() {
  const { locale, setLocale, t } = useTranslation();
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

  // 处理语言切换
  const handleLanguageChange = (newLocale: Locale) => {
    setLocale(newLocale);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!username.trim() || !password.trim()) {
      toast.error(t.settings.account.toasts.emptyCreds);
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
        toast.success(t.settings.account.toasts.loginSuccess);
      } else {
        // 登录失败
        toast.error(response.message || t.settings.account.toasts.loginFailed);
      }
    } catch {
      toast.error(t.settings.account.toasts.networkError);
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
    toast.success(t.settings.account.toasts.logoutSuccess);
  };

  return (
    <div className={styles.container}>
      {/* 语言和主题设置 */}
      <div className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>{t.settings.preferences.title}</h2>

        {/* Language 选择 */}
        <div className={styles.settingItem}>
          <label htmlFor="language" className={styles.label}>
            {t.settings.preferences.language}
          </label>
          <select
            id="language"
            value={locale}
            onChange={(e) => handleLanguageChange(e.target.value as Locale)}
            className={styles.select}
          >
            <option value="en">{localeNames.en}</option>
            <option value="zh-CN">{localeNames['zh-CN']}</option>
            <option value="zh-TW">{localeNames['zh-TW']}</option>
          </select>
        </div>

        {/* Theme 选择 */}
        <div className={styles.settingItem}>
          <label htmlFor="theme" className={styles.label}>
            {t.settings.preferences.theme}
          </label>
          <select
            id="theme"
            value={currentTheme}
            onChange={(e) => handleThemeChange(e.target.value as Theme)}
            className={styles.select}
          >
            <option value="light">{t.settings.preferences.themeOptions.light}</option>
            <option value="dark">{t.settings.preferences.themeOptions.dark}</option>
          </select>
        </div>
      </div>

      {/* 登录组件 */}
      <div className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>{t.settings.account.title}</h2>

        <div className={styles.loginContainer}>
          {loggedIn ? (
            // 已登录状态
            <>
              <div className={styles.loggedInStatus}>
                <p>
                  {t.settings.account.loggedInAs} {currentUsername}
                </p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className={styles.logoutButton}
              >
                {t.settings.account.logout}
              </button>
            </>
          ) : (
            // 未登录状态
            <>
              <div className={styles.loginPrompt}>
                <p>{t.settings.account.notSignedIn}</p>
                <p>{t.settings.account.loginRequirement}</p>
              </div>

              <form onSubmit={handleLogin} className={styles.loginForm}>
                <div className={styles.formGroup}>
                  <label htmlFor="username" className={styles.formLabel}>
                    {t.settings.account.username}
                  </label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className={styles.input}
                    placeholder={t.settings.account.usernamePlaceholder}
                    disabled={isLoading}
                  />
                </div>

                <div className={styles.formGroup}>
                  <label htmlFor="password" className={styles.formLabel}>
                    {t.settings.account.password}
                  </label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={styles.input}
                    placeholder={t.settings.account.passwordPlaceholder}
                    disabled={isLoading}
                  />
                </div>

                <button
                  type="submit"
                  className={styles.loginButton}
                  disabled={isLoading}
                >
                  {isLoading
                    ? t.settings.account.signingIn
                    : t.settings.account.signIn}
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
