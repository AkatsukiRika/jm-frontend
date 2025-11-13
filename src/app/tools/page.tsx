'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import styles from './page.module.css';
import { Toaster } from 'react-hot-toast';

// 导入工具组件
import QuestionDeckCreator from '@/components/tools/QuestionDeckCreator';
import BMICalculator from '@/components/tools/BMICalculator';
import LottiePreviewer from '@/components/tools/LottiePreviewer';
import UnixTimestamp from '@/components/tools/UnixTimestamp';
import { useTranslation } from '@/components/I18nProvider';

interface ToolItem {
  id: string;
  label: string;
  component: React.ComponentType;
}

export default function Tools() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [showList, setShowList] = useState(true);
  const { t } = useTranslation();

  const toolItems: ToolItem[] = useMemo(() => [
    { id: 'question-deck', label: t.tools.questionDeck.title, component: QuestionDeckCreator },
    { id: 'bmi-calculator', label: t.tools.bmi.title, component: BMICalculator },
    { id: 'lottie-previewer', label: t.tools.lottie.title, component: LottiePreviewer },
    { id: 'unix-timestamp', label: t.tools.unix.title, component: UnixTimestamp },
  ], [t]);
  const currentTool = searchParams.get('tool') || toolItems[0].id;

  useEffect(() => {
    // 如果没有tool参数，重定向到第一个工具
    if (!searchParams.get('tool')) {
      router.replace(`/tools?tool=${toolItems[0].id}`);
    }
  }, [searchParams, router, toolItems]);

  const handleMenuClick = (id: string) => {
    router.push(`/tools?tool=${id}`);
    // 移动端点击后隐藏列表，显示详情
    setShowList(false);
  };

  const handleBack = () => {
    setShowList(true);
  };

  // 获取当前工具组件
  const currentToolItem = toolItems.find(item => item.id === currentTool);
  const CurrentToolComponent = currentToolItem?.component || toolItems[0].component;

  return (
    <div className={styles.container}>
      <Toaster
        position="top-center"
        reverseOrder={false}
        toastOptions={{
          duration: 3000,
          style: { background: '#363636', color: '#fff' },
          success: { duration: 2000, iconTheme: { primary: '#10b981', secondary: '#fff' } },
          error: { duration: 3000, iconTheme: { primary: '#ef4444', secondary: '#fff' } },
        }}
      />
      {/* PC端侧边栏 */}
      <aside className={styles.sidebar}>
        <nav className={styles.menu}>
          {toolItems.map(item => (
            <button
              key={item.id}
              className={`${styles.menuItem} ${currentTool === item.id ? styles.active : ''}`}
              onClick={() => handleMenuClick(item.id)}
            >
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      {/* 移动端列表页 */}
      <div className={`${styles.mobileList} ${showList ? styles.showMobileList : ''}`}>
        <nav className={styles.mobileMenu}>
          {toolItems.map(item => (
            <button
              key={item.id}
              className={styles.mobileMenuItem}
              onClick={() => handleMenuClick(item.id)}
            >
              <span>{item.label}</span>
              <span className={styles.arrow}>›</span>
            </button>
          ))}
        </nav>
      </div>

      {/* 内容区域 */}
      <main className={`${styles.content} ${!showList ? styles.showContent : ''}`}>
        {/* 移动端返回按钮 */}
        <button className={styles.backButton} onClick={handleBack}>
          ← Back
        </button>

        <div className={styles.toolWrapper}>
          <CurrentToolComponent />
        </div>
      </main>
    </div>
  );
}
