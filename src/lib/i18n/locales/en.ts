export const en = {
  nav: {
    home: 'Home',
    documents: 'Documents',
    download: 'Download',
    tools: 'Tools',
    settings: 'Settings',
  },
  settings: {
    preferences: {
      title: 'Preferences',
      language: 'Language',
      theme: 'Theme',
      themeOptions: {
        light: 'Light',
        dark: 'Dark',
      },
    },
    account: {
      title: 'Account',
      loggedInAs: "You're currently logged in as",
      logout: 'LOG OUT',
      notSignedIn: "You're not signed in yet.",
      loginRequirement: 'Functions that require login will not be available.',
      username: 'Username',
      usernamePlaceholder: 'Enter your username',
      password: 'Password',
      passwordPlaceholder: 'Enter your password',
      signIn: 'Sign In',
      signingIn: 'Signing in...',
      toasts: {
        emptyCreds: 'Please enter username and password',
        loginSuccess: 'Login successful!',
        loginFailed: 'Login failed',
        networkError: 'Network error, please try again',
        logoutSuccess: 'Logged out successfully',
      },
    },
  },
  tools: {
    questionDeck: {
      title: 'Question Deck Creator',
      labels: {
        file: 'File',
        noFile: 'No files',
        question: 'Question',
        answer: 'Answer',
      },
      buttons: {
        deleteTip: 'Delete File Confirmation',
        prev: 'Previous',
        next: 'Next',
        addTip: 'New Deck File',
        download: 'Download current deck JSON',
        save: 'Save',
        saving: 'Saving...',
        confirm: 'Confirm',
        confirming: 'Confirming...',
        close: 'Close',
      },
      placeholders: {
        question: 'Type your question here...',
        answer: 'Type your answer here...',
      },
      progress: {
        loading: 'Loading...'
      },
      dialog: {
        quickJump: 'Quick Jump',
        hintPrefix: 'Total',
        hintSuffix: 'cards, click to jump',
      },
      confirm: {
        deleteDeckPrefix: 'Delete the whole deck',
        deleteDeckSuffix: '?',
        irreversible: 'This action cannot be undone. Continue?',
      },
      prompts: {
        newFilename: 'Enter new deck filename (e.g., my_deck.json)',
      },
      toasts: {
        saveSuccess: 'Saved successfully',
      },
      errors: {
        listFailed: 'Failed to get file list',
        listException: 'Exception while fetching file list',
        getFailed: 'Failed to get deck',
        getException: 'Exception while fetching deck',
        deleteFailed: 'Delete failed',
        deleteException: 'Exception while deleting',
        createFailed: 'Create deck failed',
        createException: 'Exception while creating deck',
        needSelect: 'Please select or create a deck file first',
        saveFailed: 'Save failed',
        saveException: 'Exception while saving',
        needSelectToDownload: 'Please select a deck file first',
        downloadFailed: 'Download failed',
        downloadException: 'Exception while downloading',
      },
    },
    lottie: {
      title: 'Lottie Previewer',
      empty: 'No animation loaded',
      play: 'Play',
      pause: 'Pause',
      stop: 'Stop',
      frameLabel: 'Frame:',
      loadImages: 'Load Images',
      loadJSON: 'Load JSON',
      clearPreview: 'Clear Preview Area',
      toast: {
        imagesLoaded: 'Images loaded successfully!',
      },
      errors: {
        loadJsonFailed: 'Failed to load JSON file. Please check the file format.',
      },
    },
    unix: {
      title: 'Unix Timestamp',
      currentTitle: 'Current Timestamp',
      labels: {
        datetime: 'Date Time:',
        seconds: 'Seconds:',
        milliseconds: 'Milliseconds:',
      },
      dateToTs: {
        title: 'Date Time → Timestamp',
        label: 'Date Time (YYYY/MM/DD HH:mm:ss)',
        placeholder: '1970/01/01 08:00:00',
        hint: 'Press Enter or click Convert button',
        convert: 'Convert',
        resultLabels: {
          seconds: 'Seconds',
          milliseconds: 'Milliseconds',
        },
      },
      secondsToDate: {
        title: 'Seconds Timestamp → Date Time',
        label: 'Timestamp (seconds)',
        placeholder: '0',
        convert: 'Convert',
        copy: 'Copy',
      },
      msToDate: {
        title: 'Milliseconds Timestamp → Date Time',
        label: 'Timestamp (milliseconds)',
        placeholder: '0',
        convert: 'Convert',
        copy: 'Copy',
      },
      toast: {
        copied: 'Copied to clipboard!',
      },
      errors: {
        invalidDate: 'Invalid date format',
        invalidTimestamp: 'Invalid timestamp',
      },
    },
    bmi: {
      title: 'BMI Calculator',
      display: {
        bmiLabel: 'BMI',
      },
      labels: {
        height: 'Height',
        weight: 'Weight',
      },
      units: {
        cm: 'cm',
        kg: 'kg',
      },
      categories: {
        underweight: { name: 'Underweight', range: '< 18.5' },
        normal: { name: 'Normal Weight', range: '18.5 - 24.9' },
        overweight: { name: 'Overweight', range: '25 - 29.9' },
        obese: { name: 'Obese', range: '≥ 30' },
      },
    },
  },
};

export type Translations = typeof en;
