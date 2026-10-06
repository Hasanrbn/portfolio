const SELECT_POSTS = `
  SELECT p.slug, p.title, p.excerpt, p.content_md, p.category, p.reading_time_minutes,
         p.cover_image_url, p.cover_alt,
         to_char(p.published_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS published_at,
         to_char(p.edited_at AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS edited_at,
         COALESCE((SELECT json_agg(t.name ORDER BY pt.position)
                     FROM post_tags pt
                     JOIN tags t ON t.id = pt.tag_id
                    WHERE pt.post_id = p.id), '[]'::json) AS tags
    FROM posts p
   -- Drafts and posts dated in the future are not public yet.
   WHERE p.status = 'published' AND p.published_at <= now()`;

function toPost(row) {
  return {
    slug: row.slug,
    title: row.title,
    excerpt: row.excerpt.trim(),
    content: row.content_md.trim(),
    category: row.category.trim(),
    tags: row.tags,
    publishedAt: row.published_at,
    updatedAt: row.edited_at,
    cover: row.cover_image_url
      ? {
          url: row.cover_image_url,
          alt: row.cover_alt.trim() || `Cover image for ${row.title}`,
        }
      : null,
    readingTime: row.reading_time_minutes,
  };
}

/** Read-only access to published posts, newest first, in the client's shape. */
export function createPostsRepository({ pool }) {
  return {
    async list() {
      const { rows } = await pool.query(
        `${SELECT_POSTS} ORDER BY p.published_at DESC, p.title, p.id`,
      );
      return rows.map(toPost);
    },

    /** One published post, or null (a draft is the same as a missing post). */
    async findBySlug(slug) {
      const { rows } = await pool.query(`${SELECT_POSTS} AND p.slug = $1`, [slug]);
      return rows[0] ? toPost(rows[0]) : null;
    },
  };
}
