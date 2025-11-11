import fs from 'fs';
import path from 'path';
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

async function getDocuments(): Promise<DocumentItem[]> {
  const manifestPath = path.join(process.cwd(), 'public/assets/markdown/documents/manifest.json');
  const manifestContent = fs.readFileSync(manifestPath, 'utf-8');
  const manifest: Manifest = JSON.parse(manifestContent);

  // 读取每个文档的前几行作为预览
  const documentsWithPreview = manifest.file_list.map((doc) => {
    try {
      const docPath = path.join(process.cwd(), 'public/assets/markdown/documents', doc.file_name);
      const content = fs.readFileSync(docPath, 'utf-8');
      // 获取前5行非空内容作为预览
      const lines = content.split('\n')
        .filter(line => line.trim())
        .slice(0, 5)
        .map(line => line.replace(/^#+\s*/, '').trim());
      const preview = lines.join(' ') || '暂无预览';
      return { ...doc, preview };
    } catch (error) {
      return { ...doc, preview: '无法加载预览' };
    }
  });

  // 按id从小到大排序
  return documentsWithPreview.sort((a, b) => a.id - b.id);
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

export default async function Documents() {
  const documents = await getDocuments();

  return (
    <div className={styles.container}>
      <div className={styles.documentList}>
        {documents.map((doc) => (
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
        ))}
      </div>
    </div>
  );
}
