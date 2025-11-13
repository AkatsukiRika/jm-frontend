'use client';

import { Suspense, useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import styles from './page.module.css';

interface MenuItem {
  id: string;
  label: string;
  file: string;
}

const menuItems: MenuItem[] = [
  { id: 'tp-tools', label: 'TangPing Tools', file: 'download_page.md' },
  { id: 'monologue', label: 'Monologue', file: 'download_page_1.md' },
  { id: 'z-tools', label: 'Zhou Tools', file: 'download_page_2.md' },
  { id: 'openps', label: 'OpenPS', file: 'download_page_3.md' },
];

function DownloadInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [content, setContent] = useState('');
  const [showList, setShowList] = useState(true);

  const currentPage = searchParams.get('page') || menuItems[0].id;

  useEffect(() => {
    // 如果没有page参数，重定向到第一个菜单项
    if (!searchParams.get('page')) {
      router.replace(`/download?page=${menuItems[0].id}`);
      return;
    }

    const loadContent = async () => {
      const menuItem = menuItems.find(item => item.id === currentPage);
      if (menuItem) {
        try {
          const response = await fetch(`/assets/markdown/${menuItem.file}`);
          const text = await response.text();
          setContent(text);
        } catch (error) {
          setContent('# 加载失败\n\n无法加载内容，请稍后重试。');
        }
      }
    };
    loadContent();
  }, [currentPage, searchParams, router]);

  const handleMenuClick = (id: string) => {
    router.push(`/download?page=${id}`);
    // 移动端点击后隐藏列表，显示详情
    setShowList(false);
  };

  const handleBack = () => {
    setShowList(true);
  };

  return (
    <div className={styles.container}>
      {/* PC端侧边栏 */}
      <aside className={styles.sidebar}>
        <nav className={styles.menu}>
          {menuItems.map(item => (
            <button
              key={item.id}
              className={`${styles.menuItem} ${currentPage === item.id ? styles.active : ''}`}
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
          {menuItems.map(item => (
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

        <div className={styles.markdownWrapper}>
          <article className="markdown">
            <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
              {content}
            </ReactMarkdown>
          </article>
        </div>
      </main>
    </div>
  );
}

export default function Download() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DownloadInner />
    </Suspense>
  );
}
