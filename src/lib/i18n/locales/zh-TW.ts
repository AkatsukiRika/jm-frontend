import type { Translations } from './en';

export const zhTW: Translations = {
  nav: {
    home: '首頁',
    documents: '文檔',
    download: '下載',
    tools: '工具',
    settings: '設定',
  },
  settings: {
    preferences: {
      title: '偏好設定',
      language: '語言',
      theme: '主題',
      themeOptions: {
        light: '亮色',
        dark: '暗色',
      },
    },
    account: {
      title: '帳戶',
      loggedInAs: '當前登入使用者：',
      logout: '登出',
      notSignedIn: '你尚未登入。',
      loginRequirement: '需要登入的功能將不可用。',
      username: '使用者名稱',
      usernamePlaceholder: '請輸入使用者名稱',
      password: '密碼',
      passwordPlaceholder: '請輸入密碼',
      signIn: '登入',
      signingIn: '登入中...',
      toasts: {
        emptyCreds: '請輸入使用者名稱與密碼',
        loginSuccess: '登入成功！',
        loginFailed: '登入失敗',
        networkError: '網路錯誤，請重試',
        logoutSuccess: '已成功登出',
      },
    },
  },
};
