import { useState, useEffect } from 'react';
import { getTheme } from '@/lib/theme';

export interface ThemeColors {
  background: string;
  foreground: string;
  cardBg: string;
  cardBorder: string;
  cardShadow: string;
  primary: string;
  primaryHover: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  border: string;
  inputBg: string;
  inputBorder: string;
  inputBorderHover: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

/**
 * Hook to get theme-aware colors for inline styles
 *
 * Usage:
 * const colors = useThemeColors();
 * <div style={{ backgroundColor: colors.cardBg, color: colors.textPrimary }}>
 */
export function useThemeColors(): ThemeColors {
  const [colors, setColors] = useState<ThemeColors>(getLightColors());

  useEffect(() => {
    const updateColors = () => {
      const theme = getTheme();
      setColors(theme === 'dark' ? getDarkColors() : getLightColors());
    };

    // 初始化颜色
    updateColors();

    // 监听主题变化（通过 MutationObserver 监听 data-theme 属性变化）
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type === 'attributes' &&
          mutation.attributeName === 'data-theme'
        ) {
          updateColors();
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });

    return () => {
      observer.disconnect();
    };
  }, []);

  return colors;
}

function getLightColors(): ThemeColors {
  return {
    background: '#f9fafb',
    foreground: '#1f2937',
    cardBg: '#ffffff',
    cardBorder: '#e5e7eb',
    cardShadow: 'rgba(0, 0, 0, 0.1)',
    primary: '#3b82f6',
    primaryHover: '#2563eb',
    secondary: '#6b7280',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    border: '#d1d5db',
    inputBg: '#ffffff',
    inputBorder: '#d1d5db',
    inputBorderHover: '#3b82f6',
    textPrimary: '#1f2937',
    textSecondary: '#374151',
    textMuted: '#9ca3af',
  };
}

function getDarkColors(): ThemeColors {
  return {
    background: '#111827',
    foreground: '#f9fafb',
    cardBg: '#1f2937',
    cardBorder: '#374151',
    cardShadow: 'rgba(0, 0, 0, 0.3)',
    primary: '#3b82f6',
    primaryHover: '#60a5fa',
    secondary: '#9ca3af',
    success: '#10b981',
    error: '#ef4444',
    warning: '#f59e0b',
    border: '#4b5563',
    inputBg: '#374151',
    inputBorder: '#4b5563',
    inputBorderHover: '#60a5fa',
    textPrimary: '#f9fafb',
    textSecondary: '#e5e7eb',
    textMuted: '#9ca3af',
  };
}
