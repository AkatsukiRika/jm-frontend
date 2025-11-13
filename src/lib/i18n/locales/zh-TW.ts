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
  tools: {
    questionDeck: {
      title: '題組建立器',
      labels: {
        file: '檔案',
        noFile: '無檔案',
        question: '問題',
        answer: '答案',
      },
      buttons: {
        deleteTip: '刪除題組文件確認',
        prev: '上一題',
        next: '下一題',
        addTip: '新建題組文件',
        download: '下載當前題組 JSON',
        save: '儲存',
        saving: '儲存中...',
        confirm: '確認',
        confirming: '確認中...',
        close: '關閉',
      },
      placeholders: {
        question: '在這裡輸入問題...',
        answer: '在這裡輸入答案...',
      },
      progress: {
        loading: '載入中...'
      },
      dialog: {
        quickJump: '快速跳轉',
        hintPrefix: '當前共有',
        hintSuffix: '題，點擊序號跳轉',
      },
      confirm: {
        deleteDeckPrefix: '確認刪除整個題組檔案',
        deleteDeckSuffix: '嗎？',
        irreversible: '此操作不可回復，是否繼續？',
      },
      prompts: {
        newFilename: '輸入新題組檔名（例如：my_deck.json）',
      },
      toasts: {
        saveSuccess: '儲存成功',
      },
      errors: {
        listFailed: '獲取檔案列表失敗',
        listException: '獲取檔案列表異常',
        getFailed: '獲取題組失敗',
        getException: '獲取題組異常',
        deleteFailed: '刪除失敗',
        deleteException: '刪除異常',
        createFailed: '建立題組失敗',
        createException: '建立題組異常',
        needSelect: '請先選擇或建立題組檔案',
        saveFailed: '儲存失敗',
        saveException: '儲存異常',
        needSelectToDownload: '請先選擇題組檔案',
        downloadFailed: '下載失敗',
        downloadException: '下載異常',
      },
    },
    lottie: {
      title: 'Lottie 預覽器',
      empty: '尚未載入動畫',
      play: '播放',
      pause: '暫停',
      stop: '停止',
      frameLabel: '幀：',
      loadImages: '載入圖片',
      loadJSON: '載入 JSON',
      clearPreview: '清空預覽區域',
      toast: {
        imagesLoaded: '圖片載入成功！',
      },
      errors: {
        loadJsonFailed: 'JSON 檔案載入失敗，請檢查檔案格式。',
      },
    },
    unix: {
      title: 'Unix 時間戳',
      currentTitle: '當前時間戳',
      labels: {
        datetime: '日期時間：',
        seconds: '秒：',
        milliseconds: '毫秒：',
      },
      dateToTs: {
        title: '日期時間 → 時間戳',
        label: '日期時間（YYYY/MM/DD HH:mm:ss）',
        placeholder: '1970/01/01 08:00:00',
        hint: '按 Enter 或點擊轉換按鈕',
        convert: '轉換',
        resultLabels: {
          seconds: '秒',
          milliseconds: '毫秒',
        },
      },
      secondsToDate: {
        title: '秒時間戳 → 日期時間',
        label: '時間戳（秒）',
        placeholder: '0',
        convert: '轉換',
        copy: '複製',
      },
      msToDate: {
        title: '毫秒時間戳 → 日期時間',
        label: '時間戳（毫秒）',
        placeholder: '0',
        convert: '轉換',
        copy: '複製',
      },
      toast: {
        copied: '已複製到剪貼簿！',
      },
      errors: {
        invalidDate: '日期格式不正確',
        invalidTimestamp: '時間戳無效',
      },
    },
    bmi: {
      title: 'BMI 計算器',
      display: {
        bmiLabel: 'BMI',
      },
      labels: {
        height: '身高',
        weight: '體重',
      },
      units: {
        cm: '公分',
        kg: '公斤',
      },
      categories: {
        underweight: { name: '過輕', range: '< 18.5' },
        normal: { name: '正常', range: '18.5 - 24.9' },
        overweight: { name: '過重', range: '25 - 29.9' },
        obese: { name: '肥胖', range: '≥ 30' },
      },
    },
  },
};
