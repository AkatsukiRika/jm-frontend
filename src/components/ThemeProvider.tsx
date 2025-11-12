'use client';

import { useEffect } from 'react';
import { initTheme } from '@/lib/theme';

/**
 * ThemeProvider - 初始化主题
 * 这个组件在应用启动时初始化主题，避免闪烁
 */
export default function ThemeProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  useEffect(() => {
    initTheme();
  }, []);

  return <>{children}</>;
}
