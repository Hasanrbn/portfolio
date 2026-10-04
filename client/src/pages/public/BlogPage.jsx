import PageTitle from '../../components/layout/PageTitle.jsx';
import Pagination from '../../components/sections/Pagination.jsx';
import PostCard from '../../components/sections/PostCard.jsx';
import PostFilters from '../../components/sections/PostFilters.jsx';
import AsyncView from '../../components/ui/AsyncView.jsx';
import Button from '../../components/ui/Button.jsx';
import EmptyState from '../../components/ui/EmptyState.jsx';
import useAsync from '../../hooks/useAsync.js';
import useUrlFilters from '../../hooks/useUrlFilters.js';
import {
  filterPosts,
  getPostFilterOptions,
  getPosts,
  paginate,
} from '../../services/postsService.js';
import listStyles from './ListPage.module.css';
import styles from './BlogPage.module.css';

// With one article there is nothing to narrow down, so the filters stay hidden.
const MIN_POSTS_FOR_FILTERS = 2;

function resultText(shown, total) {
  const noun = total === 1 ? 'article' : 'articles';
  return shown === total ? `${total} ${noun}` : `Showing ${shown} of ${total} ${noun}`;
}

function PostList({ posts }) {
  const { requested, setFilter, clearFilters } = useUrlFilters(['q', 'category', 'tag', 'page'], {
    resets: ['page'],
  });
  const showFilters = posts.length >= MIN_POSTS_FOR_FILTERS;
  const options = getPostFilterOptions(posts);

  // Values come from the address, so they can be anything. A category or tag that does not
  // exist is ignored instead of hiding every article.
  const values = {
    q: requested.q,
    category: options.categories.includes(requested.category) ? requested.category : '',
    tag: options.tags.includes(requested.tag) ? requested.tag : '',
  };
  const matching = showFilters ? filterPosts(posts, values) : posts;
  const requestedPage = /^\d+$/.test(requested.page) ? Number(requested.page) : 1;
  const { items, page, pageCount } = paginate(matching, requestedPage);

  // Address query for another page, keeping the filters that are in effect.
  function getSearch(targetPage) {
    const params = new URLSearchParams();
    Object.entries(values).forEach(([name, value]) => value && params.set(name, value));
    if (targetPage > 1) params.set('page', String(targetPage));
    const query = params.toString();
    return query ? `?${query}` : '';
  }

  return (
    <div className={styles.content}>
      {showFilters && (
        <PostFilters
          values={values}
          categories={options.categories}
          tags={options.tags}
          onChange={setFilter}
          onClear={clearFilters}
          resultText={resultText(matching.length, posts.length)}
        />
      )}

      {items.length > 0 ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/no-redundant-roles */}
          <ul role="list" className={styles.grid}>
            {items.map((post) => (
              <PostCard key={post.slug} post={post} />
            ))}
          </ul>
          <Pagination page={page} pageCount={pageCount} getSearch={getSearch} />
        </>
      ) : (
        <EmptyState
          title="No articles match"
          description="Try a different search or remove a filter."
          action={<Button onClick={clearFilters}>Clear filters</Button>}
        />
      )}
    </div>
  );
}

export default function BlogPage() {
  const { status, data: posts, retry } = useAsync(getPosts);

  return (
    <>
      <PageTitle title="Blog" />
      <h1>Blog</h1>
      <p className={listStyles.lead}>Notes on what I build and learn, newest first.</p>

      <div className={listStyles.body}>
        <AsyncView
          status={status}
          onRetry={retry}
          loadingLabel="Loading articles"
          errorTitle="Articles could not be loaded."
          isEmpty={status === 'success' && posts.length === 0}
          empty={{
            title: 'No articles yet',
            description: 'Articles will appear here once they are published.',
          }}
        >
          {() => <PostList posts={posts} />}
        </AsyncView>
      </div>
    </>
  );
}
