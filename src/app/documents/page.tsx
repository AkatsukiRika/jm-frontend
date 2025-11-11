'use client';

import { useState, useEffect, useMemo } from 'react';
import styles from './page.module.css';

interface DocumentItem {
  id: number;
  file_name: string;
  create_time: number;
  tags: string[];
  preview?: string;
}

interface Manifest {
  file_list: DocumentItem[];
}

function formatDate(timestamp: number): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

export default function Documents() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [selectedTags, setSelectedTags] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDocuments() {
      try {
        // 加载manifest
        const manifestRes = await fetch('/assets/markdown/documents/manifest.json');
        const manifest: Manifest = await manifestRes.json();

        // 加载每个文档的预览
        const documentsWithPreview = await Promise.all(
          manifest.file_list.map(async (doc) => {
            try {
              const docRes = await fetch(`/assets/markdown/documents/${doc.file_name}`);
              const content = await docRes.text();
              // 获取前5行非空内容作为预览
              const lines = content.split('\n')
                .filter(line => line.trim())
                .slice(0, 5)
                .map(line => line.replace(/^#+\s*/, '').trim());
              const preview = lines.join(' ') || 'No preview';
              return { ...doc, preview };
            } catch (error) {
              return { ...doc, preview: 'Failed to load preview' };
            }
          })
        );

        // 保持JSON中的原始顺序
        setDocuments(documentsWithPreview);
      } catch (error) {
        console.error('Failed to load documents:', error);
      } finally {
        setLoading(false);
      }
    }

    loadDocuments();
  }, []);

  // 提取所有唯一标签
  const allTags = useMemo(() => {
    const tagSet = new Set<string>();
    documents.forEach(doc => {
      doc.tags.forEach(tag => tagSet.add(tag));
    });
    return Array.from(tagSet).sort();
  }, [documents]);

  // 过滤文档
  const filteredDocuments = useMemo(() => {
    if (selectedTags.size === 0) {
      return documents;
    }
    return documents.filter(doc =>
      doc.tags.some(tag => selectedTags.has(tag))
    );
  }, [documents, selectedTags]);

  // 切换标签选中状态
  const toggleTag = (tag: string) => {
    const newSelectedTags = new Set(selectedTags);
    if (newSelectedTags.has(tag)) {
      newSelectedTags.delete(tag);
    } else {
      newSelectedTags.add(tag);
    }
    setSelectedTags(newSelectedTags);
  };

  // 清空所有选中标签
  const clearTags = () => {
    setSelectedTags(new Set());
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <div className={styles.loading}>Loading...</div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* 标签筛选器 */}
      <div className={styles.filterSection}>
        <div className={styles.filterHeader}>
          <h3 className={styles.filterTitle}>Tags</h3>
          <button
            onClick={clearTags}
            className={styles.clearButton}
            disabled={selectedTags.size === 0}
            style={{ opacity: selectedTags.size === 0 ? 0 : 1 }}
          >
            Clear ({selectedTags.size})
          </button>
        </div>
        <div className={styles.tagFilter}>
          {allTags.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`${styles.filterTag} ${selectedTags.has(tag) ? styles.filterTagActive : ''}`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      {/* 文档列表 */}
      <div className={styles.documentList}>
        {filteredDocuments.length === 0 ? (
          <div className={styles.emptyState}>
            <p>No documents found</p>
          </div>
        ) : (
          filteredDocuments.map((doc) => (
            <article key={doc.id} className={styles.documentCard}>
              <div className={styles.cardHeader}>
                <h2 className={styles.documentTitle}>{doc.file_name}</h2>
                <time className={styles.documentDate}>{formatDate(doc.create_time)}</time>
              </div>

              <p className={styles.documentPreview}>{doc.preview}</p>

              <div className={styles.tags}>
                {doc.tags.map((tag, index) => (
                  <span key={index} className={styles.tag}>
                    {tag}
                  </span>
                ))}
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
