import { Suspense, lazy, useCallback } from 'react';
import { Link, useLocation, useParams } from 'react-router';
import PageTitle from '../../components/layout/PageTitle.jsx';
import PostMeta from '../../components/sections/PostMeta.jsx';
import RelatedPosts from '../../components/sections/RelatedPosts.jsx';
import ShareButtons from '../../components/sections/ShareButtons.jsx';
import ErrorState from '../../components/ui/ErrorState.jsx';
import Icon from '../../components/ui/Icon.jsx';
import LinkButton from '../../components/ui/LinkButton.jsx';
import Skeleton from '../../components/ui/Skeleton.jsx';
import Tag from '../../components/ui/Tag.jsx';
import useAsync from '../../hooks/useAsync.js';
import { getPostBySlug } from '../../services/postsService.js';
import styles from './BlogPostPage.module.css';

// The markdown library is large, so it is fetched only when an article is opened.
const PostBody = lazy(() => import('../../components/sections/PostBody.jsx'));

function BodyFallback() {
  return (
    <div aria-busy="true" className={styles.bodyLoading}>
      <p role="status" className="visually-hidden">
        Loading article
      </p>
      <Skeleton lines={6} />
    </div>
  );
}

function Article({ post, related }) {
  const { pathname } = useLocation();

  return (
    <>
      <PageTitle title={post.title} />
      <PostMeta post={post} showUpdated />

      {post.cover && (
        <img
          className={styles.cover}
          src={post.cover.url}
          alt={post.cover.alt}
          width="1280"
          height="720"
          decoding="async"
        />
      )}

      <article className={styles.article}>
        <Suspense fallback={<BodyFallback />}>
          <PostBody content={post.content} />
        </Suspense>
      </article>

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

      <div className={styles.after}>
        <ShareButtons title={post.title} url={`${window.location.origin}${pathname}`} />
        <RelatedPosts posts={related} />
      </div>
    </>
  );
}

export default function BlogPostPage() {
  const { slug } = useParams();
  const load = useCallback(() => getPostBySlug(slug), [slug]);
  const { status, data, retry } = useAsync(load);

  const notFound = status === 'success' && data === null;
  const heading =
    status === 'success'
      ? (data?.post.title ?? 'Article not found')
      : status === 'error'
        ? 'Article'
        : 'Loading article';

  return (
    <>
      <Link to="/blog" className={styles.back}>
        <Icon name="arrow-left" size={18} />
        All articles
      </Link>

      {/* One h1 in every state keeps the heading the router focuses after navigation in place. */}
      <h1 className={styles.title}>{heading}</h1>

      {status !== 'success' && <PageTitle title="Article" />}

      {status === 'loading' && (
        <div aria-busy="true" className={styles.bodyLoading}>
          <p role="status" className="visually-hidden">
            Loading article
          </p>
          <Skeleton lines={3} />
        </div>
      )}

      {status === 'error' && (
        <ErrorState
          title="This article could not be loaded."
          description="Please try again in a moment."
          onRetry={retry}
        />
      )}

      {notFound && (
        <>
          <PageTitle title="Article not found" />
          <p>There is no article at this address.</p>
          <p>
            <LinkButton to="/blog">Back to the blog</LinkButton>
          </p>
        </>
      )}

      {status === 'success' && data && <Article post={data.post} related={data.related} />}
    </>
  );
}
