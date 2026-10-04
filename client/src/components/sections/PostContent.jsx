import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router';
import { remarkHeadingIds } from '../../utils/markdownHeadings.js';
import { getImageSource } from '../../utils/profile.js';
import styles from './PostContent.module.css';

/*
 * Article text is markdown written by the site owner, but it is still treated as untrusted:
 * react-markdown builds React elements (never raw HTML, so a <script> in the text is shown as
 * text), its default address filter removes "javascript:" links, and the components below
 * allow only the kinds of links and pictures this site wants.
 */

// "#" in an article is shown as a second-level heading: the page title is the only h1.
function SectionHeading({ node, children, ...props }) {
  void node;
  return <h2 {...props}>{children}</h2>;
}

function ArticleLink({ node, href, children }) {
  void node;

  if (!href) {
    return <span>{children}</span>;
  }
  if (href.startsWith('#') || href.startsWith('mailto:')) {
    return <a href={href}>{children}</a>;
  }
  if (href.startsWith('/') && !href.startsWith('//')) {
    return <Link to={href}>{children}</Link>;
  }
  if (/^https:\/\//i.test(href)) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer">
        {children} <span className="visually-hidden">(opens in a new tab)</span>
      </a>
    );
  }
  // Anything else (such as plain http) is not linked.
  return <span>{children}</span>;
}

function ArticleImage({ node, src, alt }) {
  void node;
  const safe = getImageSource(src);
  return safe ? <img src={safe} alt={alt ?? ''} loading="lazy" decoding="async" /> : null;
}

// A wide code block scrolls sideways, so keyboard users must be able to focus it to scroll.
function CodeBlock({ node, ...props }) {
  void node;
  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
    <pre tabIndex={0} {...props} />
  );
}

const COMPONENTS = { h1: SectionHeading, a: ArticleLink, img: ArticleImage, pre: CodeBlock };
const REMARK_PLUGINS = [remarkHeadingIds];

/** The body of an article: markdown turned into safe, styled React elements. */
export default function PostContent({ content }) {
  return (
    <div className={styles.content}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={COMPONENTS}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
