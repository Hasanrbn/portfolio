import PostCard from './PostCard.jsx';
import styles from './RelatedPosts.module.css';

/** Other articles on similar topics. Renders nothing when there are none. */
export default function RelatedPosts({ posts }) {
  if (posts.length === 0) {
    return null;
  }

  return (
    <section aria-labelledby="related-heading">
      <h2 id="related-heading" className={styles.heading}>
        Related articles
      </h2>
      {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
      <ul role="list" className={styles.grid}>
        {posts.map((post) => (
          <PostCard key={post.slug} post={post} headingAs="h3" />
        ))}
      </ul>
    </section>
  );
}
