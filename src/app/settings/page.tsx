'use client';

import { useState } from 'react';
import styles from './page.module.css';

export default function Settings() {
  const [language, setLanguage] = useState('English');
  const [theme, setTheme] = useState('Light');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // 登录逻辑暂时留空
    console.log('Login attempt:', { username, password });
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
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            className={styles.select}
          >
            <option value="Light">Light</option>
            <option value="Dark">Dark</option>
            <option value="Mortis">Mortis</option>
          </select>
        </div>
      </div>

      {/* 登录组件 */}
      <div className={styles.settingsSection}>
        <h2 className={styles.sectionTitle}>Account</h2>

        <div className={styles.loginContainer}>
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
              />
            </div>

            <button type="submit" className={styles.loginButton}>
              Sign In
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
