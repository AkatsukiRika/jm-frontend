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
};

export type Translations = typeof en;
