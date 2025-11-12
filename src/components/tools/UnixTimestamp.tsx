'use client';

import { useState, useEffect } from 'react';

export default function UnixTimestamp() {
  // 格式化日期时间为 "YYYY/MM/DD HH:mm:ss"
  const formatDateTime = (date: Date): string => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    const seconds = String(date.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
  };

  // 当前时间戳 - 初始值为空，避免 SSR hydration 不匹配
  const [currentTimestamp, setCurrentTimestamp] = useState({
    seconds: 0,
    milliseconds: 0,
    dateTime: '----/--/-- --:--:--',
  });

  // 日期时间输入
  const [dateTimeInput, setDateTimeInput] = useState('');
  const [dateToSeconds, setDateToSeconds] = useState('');
  const [dateToMilliseconds, setDateToMilliseconds] = useState('');

  // 秒时间戳输入
  const [secondsInput, setSecondsInput] = useState('');
  const [secondsToDate, setSecondsToDate] = useState('');

  // 毫秒时间戳输入
  const [millisecondsInput, setMillisecondsInput] = useState('');
  const [millisecondsToDate, setMillisecondsToDate] = useState('');

  // Toast 状态
  const [showToast, setShowToast] = useState(false);

  // 更新当前时间戳（每秒）
  useEffect(() => {
    // 立即更新一次时间戳（客户端挂载后）
    const updateTimestamp = () => {
      const now = new Date();
      setCurrentTimestamp({
        seconds: Math.floor(now.getTime() / 1000),
        milliseconds: now.getTime(),
        dateTime: formatDateTime(now),
      });
    };

    // 首次更新
    updateTimestamp();

    // 启动定时器
    const timer = setInterval(updateTimestamp, 1000);

    return () => clearInterval(timer);
  }, []);

  // 解析日期时间字符串 "YYYY/MM/DD HH:mm:ss"
  const parseDateTimeString = (dateStr: string): Date | null => {
    try {
      // 支持多种分隔符
      const normalized = dateStr
        .replace(/[年月]/g, '/')
        .replace(/[日]/g, '')
        .replace(/[\s]+/g, ' ')
        .trim();

      const parts = normalized.split(' ');
      if (parts.length !== 2) return null;

      const datePart = parts[0].split('/');
      const timePart = parts[1].split(':');

      if (datePart.length !== 3 || timePart.length !== 3) return null;

      const year = parseInt(datePart[0]);
      const month = parseInt(datePart[1]) - 1;
      const day = parseInt(datePart[2]);
      const hours = parseInt(timePart[0]);
      const minutes = parseInt(timePart[1]);
      const seconds = parseInt(timePart[2]);

      const date = new Date(year, month, day, hours, minutes, seconds);
      return isNaN(date.getTime()) ? null : date;
    } catch {
      return null;
    }
  };

  // 日期时间 -> 时间戳
  const handleDateTimeToTimestamp = () => {
    const date = parseDateTimeString(dateTimeInput);
    if (date) {
      setDateToSeconds(Math.floor(date.getTime() / 1000).toString());
      setDateToMilliseconds(date.getTime().toString());
    } else {
      setDateToSeconds('Invalid date format');
      setDateToMilliseconds('Invalid date format');
    }
  };

  // 秒时间戳 -> 日期时间
  const handleSecondsToDateTime = () => {
    const seconds = parseInt(secondsInput);
    if (!isNaN(seconds)) {
      const date = new Date(seconds * 1000);
      setSecondsToDate(formatDateTime(date));
    } else {
      setSecondsToDate('Invalid timestamp');
    }
  };

  // 毫秒时间戳 -> 日期时间
  const handleMillisecondsToDateTime = () => {
    const milliseconds = parseInt(millisecondsInput);
    if (!isNaN(milliseconds)) {
      const date = new Date(milliseconds);
      setMillisecondsToDate(formatDateTime(date));
    } else {
      setMillisecondsToDate('Invalid timestamp');
    }
  };

  // 复制到剪贴板
  const copyToClipboard = (text: string) => {
    // 检查 clipboard API 是否可用
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 2000);
      }).catch((err) => {
        console.error('Failed to copy:', err);
      });
    } else {
      // 降级方案：使用传统的复制方法
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);

        setShowToast(true);
        setTimeout(() => {
          setShowToast(false);
        }, 2000);
      } catch (err) {
        console.error('Failed to copy:', err);
      }
    }
  };

  const styles = {
    container: {
      maxWidth: '800px',
      margin: '0 auto',
    },
    title: {
      fontSize: '1.75rem',
      fontWeight: 'bold',
      color: '#1f2937',
      marginBottom: '1.5rem',
    },
    currentSection: {
      backgroundColor: '#eff6ff',
      border: '2px solid #3b82f6',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      marginBottom: '2rem',
    },
    currentTitle: {
      fontSize: '1rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '1rem',
    },
    timestampRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '0.75rem',
    },
    timestampLabel: {
      fontSize: '0.95rem',
      color: '#6b7280',
      fontWeight: '500',
    },
    timestampValue: {
      fontSize: '1.125rem',
      color: '#1f2937',
      fontWeight: '600',
      fontFamily: 'monospace',
    },
    section: {
      backgroundColor: '#ffffff',
      border: '1px solid #e5e7eb',
      borderRadius: '0.5rem',
      padding: '1.5rem',
      marginBottom: '1.5rem',
    },
    sectionTitle: {
      fontSize: '1.125rem',
      fontWeight: '600',
      color: '#1f2937',
      marginBottom: '1rem',
    },
    inputGroup: {
      marginBottom: '1rem',
    },
    label: {
      display: 'block',
      fontSize: '0.875rem',
      fontWeight: '500',
      color: '#6b7280',
      marginBottom: '0.5rem',
    },
    input: {
      width: '100%',
      padding: '0.75rem',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      fontFamily: 'monospace',
      transition: 'border-color 0.2s',
    },
    button: {
      padding: '0.75rem 1.5rem',
      backgroundColor: '#3b82f6',
      color: '#ffffff',
      border: 'none',
      borderRadius: '0.375rem',
      fontSize: '1rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'background-color 0.2s',
      width: '100%',
    },
    resultGroup: {
      marginTop: '1rem',
      display: 'flex',
      gap: '0.5rem',
    },
    resultBox: {
      flex: 1,
      padding: '0.75rem',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '0.375rem',
      fontFamily: 'monospace',
      fontSize: '0.95rem',
      color: '#1f2937',
    },
    resultBoxFull: {
      width: '100%',
      padding: '0.75rem',
      backgroundColor: '#f9fafb',
      border: '1px solid #e5e7eb',
      borderRadius: '0.375rem',
      fontFamily: 'monospace',
      fontSize: '0.95rem',
      color: '#1f2937',
    },
    copyButton: {
      padding: '0.5rem 1rem',
      backgroundColor: '#f3f4f6',
      color: '#6b7280',
      border: '1px solid #d1d5db',
      borderRadius: '0.375rem',
      fontSize: '0.875rem',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s',
      flexShrink: 0,
    },
    hint: {
      fontSize: '0.8125rem',
      color: '#9ca3af',
      marginTop: '0.5rem',
    },
    toast: {
      position: 'fixed' as const,
      bottom: '2rem',
      right: '2rem',
      backgroundColor: '#10b981',
      color: '#ffffff',
      padding: '1rem 1.5rem',
      borderRadius: '0.5rem',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      fontSize: '1rem',
      fontWeight: '500',
      zIndex: 10000,
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
      opacity: 1,
      transition: 'opacity 0.3s ease-out',
    },
  };

  return (
    <>
      <div style={styles.container}>
      {/* 当前时间戳 */}
      <div style={styles.currentSection}>
        <div style={styles.currentTitle}>Current Timestamp</div>
        <div style={styles.timestampRow}>
          <span style={styles.timestampLabel}>Date Time:</span>
          <span style={styles.timestampValue}>{currentTimestamp.dateTime}</span>
        </div>
        <div style={styles.timestampRow}>
          <span style={styles.timestampLabel}>Seconds:</span>
          <span style={styles.timestampValue}>{currentTimestamp.seconds}</span>
        </div>
        <div style={styles.timestampRow}>
          <span style={styles.timestampLabel}>Milliseconds:</span>
          <span style={styles.timestampValue}>{currentTimestamp.milliseconds}</span>
        </div>
      </div>

      {/* 日期时间 -> 时间戳 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>📅 Date Time → Timestamp</div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Date Time (YYYY/MM/DD HH:mm:ss)</label>
          <input
            type="text"
            style={styles.input}
            placeholder="1970/01/01 08:00:00"
            value={dateTimeInput}
            onChange={(e) => setDateTimeInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleDateTimeToTimestamp()}
          />
          <div style={styles.hint}>Press Enter or click Convert button</div>
        </div>
        <button
          style={styles.button}
          onClick={handleDateTimeToTimestamp}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
        >
          Convert
        </button>
        {(dateToSeconds || dateToMilliseconds) && (
          <div style={styles.resultGroup}>
            <div style={styles.resultBox}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Seconds
              </div>
              {dateToSeconds}
            </div>
            <div style={styles.resultBox}>
              <div style={{ fontSize: '0.75rem', color: '#6b7280', marginBottom: '0.25rem' }}>
                Milliseconds
              </div>
              {dateToMilliseconds}
            </div>
          </div>
        )}
      </div>

      {/* 秒时间戳 -> 日期时间 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>⏱️ Seconds Timestamp → Date Time</div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Timestamp (seconds)</label>
          <input
            type="text"
            style={styles.input}
            placeholder="0"
            value={secondsInput}
            onChange={(e) => setSecondsInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSecondsToDateTime()}
          />
        </div>
        <button
          style={styles.button}
          onClick={handleSecondsToDateTime}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
        >
          Convert
        </button>
        {secondsToDate && (
          <div style={{ ...styles.resultGroup, marginTop: '1rem' }}>
            <div style={styles.resultBoxFull}>{secondsToDate}</div>
            <button
              style={styles.copyButton}
              onClick={() => copyToClipboard(secondsToDate)}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
                e.currentTarget.style.color = '#1f2937';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              Copy
            </button>
          </div>
        )}
      </div>

      {/* 毫秒时间戳 -> 日期时间 */}
      <div style={styles.section}>
        <div style={styles.sectionTitle}>⚡ Milliseconds Timestamp → Date Time</div>
        <div style={styles.inputGroup}>
          <label style={styles.label}>Timestamp (milliseconds)</label>
          <input
            type="text"
            style={styles.input}
            placeholder="0"
            value={millisecondsInput}
            onChange={(e) => setMillisecondsInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleMillisecondsToDateTime()}
          />
        </div>
        <button
          style={styles.button}
          onClick={handleMillisecondsToDateTime}
          onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#2563eb')}
          onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#3b82f6')}
        >
          Convert
        </button>
        {millisecondsToDate && (
          <div style={{ ...styles.resultGroup, marginTop: '1rem' }}>
            <div style={styles.resultBoxFull}>{millisecondsToDate}</div>
            <button
              style={styles.copyButton}
              onClick={() => copyToClipboard(millisecondsToDate)}
              onMouseOver={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
                e.currentTarget.style.color = '#1f2937';
              }}
              onMouseOut={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.color = '#6b7280';
              }}
            >
              Copy
            </button>
          </div>
        )}
      </div>
      </div>

      {/* Toast 提示 */}
      {showToast && (
        <div style={styles.toast}>
          <span>✓</span>
          <span>Copied to clipboard!</span>
        </div>
      )}
    </>
  );
}
