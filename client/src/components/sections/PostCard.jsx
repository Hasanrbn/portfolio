import { Link } from 'react-router';
import Card from '../ui/Card.jsx';
import Tag from '../ui/Tag.jsx';
import PostMeta from './PostMeta.jsx';
import styles from './PostCard.module.css';

/** One article in the list. The title is the card's link and its clickable area covers the whole card. */
export default function PostCard({ post, headingAs: Heading = 'h2' }) {
  return (
    <Card as="li" interactive className={styles.card}>
      {post.cover && (
        <img
          className={styles.cover}
          src={post.cover.url}
          alt={post.cover.alt}
          width="640"
          height="360"
          loading="lazy"
          decoding="async"
        />
      )}
      <PostMeta post={post} />
      <Heading className={styles.title}>
        <Link to={`/blog/${post.slug}`} className={styles.titleLink}>
          {post.title}
        </Link>
      </Heading>
      {post.excerpt && <p className={styles.excerpt}>{post.excerpt}</p>}
      {post.tags.length > 0 && (
        // eslint-disable-next-line jsx-a11y/no-redundant-roles
        <ul role="list" className={styles.tags} aria-label="Tags">
          {post.tags.map((tag) => (
            <li key={tag}>
              <Tag>{tag}</Tag>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
