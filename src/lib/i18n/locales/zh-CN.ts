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
  tools: {
    lottie: {
      title: 'Lottie 预览器',
      empty: '尚未加载动画',
      play: '播放',
      pause: '暂停',
      stop: '停止',
      frameLabel: '帧：',
      loadImages: '加载图片',
      loadJSON: '加载 JSON',
      clearPreview: '清空预览区域',
      toast: {
        imagesLoaded: '图片加载成功！',
      },
      errors: {
        loadJsonFailed: 'JSON 文件加载失败，请检查文件格式。',
      },
    },
    unix: {
      title: 'Unix 时间戳',
      currentTitle: '当前时间戳',
      labels: {
        datetime: '日期时间：',
        seconds: '秒：',
        milliseconds: '毫秒：',
      },
      dateToTs: {
        title: '日期时间 → 时间戳',
        label: '日期时间（YYYY/MM/DD HH:mm:ss）',
        placeholder: '1970/01/01 08:00:00',
        hint: '按 Enter 或点击转换按钮',
        convert: '转换',
        resultLabels: {
          seconds: '秒',
          milliseconds: '毫秒',
        },
      },
      secondsToDate: {
        title: '秒时间戳 → 日期时间',
        label: '时间戳（秒）',
        placeholder: '0',
        convert: '转换',
        copy: '复制',
      },
      msToDate: {
        title: '毫秒时间戳 → 日期时间',
        label: '时间戳（毫秒）',
        placeholder: '0',
        convert: '转换',
        copy: '复制',
      },
      toast: {
        copied: '已复制到剪贴板！',
      },
      errors: {
        invalidDate: '日期格式不正确',
        invalidTimestamp: '时间戳无效',
      },
    },
    bmi: {
      title: 'BMI 计算器',
      display: {
        bmiLabel: 'BMI',
      },
      labels: {
        height: '身高',
        weight: '体重',
      },
      units: {
        cm: '厘米',
        kg: '千克',
      },
      categories: {
        underweight: { name: '偏瘦', range: '< 18.5' },
        normal: { name: '正常', range: '18.5 - 24.9' },
        overweight: { name: '超重', range: '25 - 29.9' },
        obese: { name: '肥胖', range: '≥ 30' },
      },
    },
  },
};
