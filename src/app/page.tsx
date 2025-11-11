import fs from 'fs';
import path from 'path';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import styles from "./page.module.css";

export default function Home() {
  const markdownPath = path.join(process.cwd(), 'public/assets/markdown/home_page.md');
  const markdownContent = fs.readFileSync(markdownPath, 'utf-8');

  return (
    <div className={styles.container}>
      <article className="markdown">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {markdownContent}
        </ReactMarkdown>
      </article>
    </div>
  );
}
