import type { Translations } from './en';

export const zhCN: Translations = {
  nav: {
    home: '首页',
    documents: '文档',
    download: '下载',
    tools: '工具',
    settings: '设置',
  },
  settings: {
    preferences: {
      title: '偏好设置',
      language: '语言',
      theme: '主题',
      themeOptions: {
        light: '亮色',
        dark: '暗色',
      },
    },
    account: {
      title: '账号',
      loggedInAs: '当前登录用户：',
      logout: '退出登录',
      notSignedIn: '你还未登录。',
      loginRequirement: '需要登录的功能将不可用。',
      username: '用户名',
      usernamePlaceholder: '请输入用户名',
      password: '密码',
      passwordPlaceholder: '请输入密码',
      signIn: '登录',
      signingIn: '正在登录...',
      toasts: {
        emptyCreds: '请输入用户名和密码',
        loginSuccess: '登录成功！',
        loginFailed: '登录失败',
        networkError: '网络错误，请重试',
        logoutSuccess: '已退出登录',
      },
    },
  },
};
