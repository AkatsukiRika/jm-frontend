'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import styles from './Navbar.module.css';
import { useTranslation } from './I18nProvider';

const Navbar = () => {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { t } = useTranslation();

  const navItems = [
    { name: t.nav.home, path: '/' },
    { name: t.nav.documents, path: '/documents' },
    { name: t.nav.download, path: '/download' },
    { name: t.nav.tools, path: '/tools' },
    { name: t.nav.settings, path: '/settings' },
  ];

  const toggleDrawer = () => {
    setIsDrawerOpen(!isDrawerOpen);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
  };

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.container}>
          {/* 移动端菜单按钮 */}
          <button
            className={styles.menuButton}
            onClick={toggleDrawer}
            aria-label="Toggle menu"
          >
            <span className={styles.hamburger}></span>
            <span className={styles.hamburger}></span>
            <span className={styles.hamburger}></span>
          </button>

          <div className={styles.logo}>
            <Link href="/">JuanMing Web</Link>
          </div>

          {/* PC端导航菜单 */}
          <ul className={styles.navList}>
            {navItems.map((item) => (
              <li key={item.path}>
                <Link
                  href={item.path}
                  className={pathname === item.path ? styles.active : ''}
                >
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </nav>

      {/* 遮罩层 */}
      {isDrawerOpen && (
        <div className={styles.overlay} onClick={closeDrawer}></div>
      )}

      {/* 移动端抽屉菜单 */}
      <div className={`${styles.drawer} ${isDrawerOpen ? styles.drawerOpen : ''}`}>
        <div className={styles.drawerHeader}>
          <h2>JuanMing Web</h2>
          <button
            className={styles.closeButton}
            onClick={closeDrawer}
            aria-label="Close menu"
          >
            ×
          </button>
        </div>
        <ul className={styles.drawerList}>
          {navItems.map((item) => (
            <li key={item.path}>
              <Link
                href={item.path}
                className={pathname === item.path ? styles.active : ''}
                onClick={closeDrawer}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </>
  );
};

export default Navbar;
