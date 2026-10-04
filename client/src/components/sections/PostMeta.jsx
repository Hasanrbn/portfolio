import Badge from '../ui/Badge.jsx';
import { formatDate } from '../../utils/dates.js';
import styles from './PostMeta.module.css';

/** Publish date, optional update date, reading time and category, shared by the list and the article. */
export default function PostMeta({ post, showUpdated = false }) {
  return (
    <p className={styles.meta}>
      <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
      {showUpdated && post.updatedAt && (
        <span>
          Updated <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
        </span>
      )}
      <span>{post.readingTime} min read</span>
      {post.category && <Badge>{post.category}</Badge>}
    </p>
  );
}
