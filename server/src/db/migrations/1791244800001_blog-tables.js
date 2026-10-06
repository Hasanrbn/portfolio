// Blog: posts, tags and the link between them.

const SLUG = String.raw`'^[a-z0-9]+(-[a-z0-9]+)*$'`;
const ADDRESS = String.raw`'^(https://\S+|/([^/\\\s]\S*)?)$'`;

export const up = (pgm) => {
  pgm.sql(`
    CREATE TABLE posts (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      slug text NOT NULL UNIQUE CHECK (slug ~ ${SLUG} AND char_length(slug) <= 100),
      title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
      excerpt text NOT NULL DEFAULT '',
      content_md text NOT NULL CHECK (char_length(content_md) > 0),
      cover_image_url text CHECK (cover_image_url IS NULL OR cover_image_url ~ ${ADDRESS}),
      cover_alt text NOT NULL DEFAULT '',
      category text NOT NULL DEFAULT '',
      status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
      published_at timestamptz,
      -- When the text was last changed on purpose, shown to readers as "Updated".
      -- NULL means never. (Not the same as updated_at, which changes on every save.)
      edited_at timestamptz,
      reading_time_minutes smallint NOT NULL DEFAULT 1 CHECK (reading_time_minutes >= 1),
      -- Weighted full-text index over title, excerpt, category and text. The 'simple'
      -- configuration is used because articles may be written in more than one language.
      search_vector tsvector GENERATED ALWAYS AS (
        setweight(to_tsvector('simple', coalesce(title, '')), 'A') ||
        setweight(to_tsvector('simple', coalesce(excerpt, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(category, '')), 'B') ||
        setweight(to_tsvector('simple', coalesce(content_md, '')), 'C')
      ) STORED,
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now(),
      CHECK (status = 'draft' OR published_at IS NOT NULL),
      CHECK (edited_at IS NULL OR published_at IS NULL OR edited_at >= published_at)
    );
    CREATE INDEX posts_status_published_idx ON posts (status, published_at DESC);
    CREATE INDEX posts_search_idx ON posts USING gin (search_vector);
    CREATE TRIGGER posts_set_updated_at
      BEFORE UPDATE ON posts
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TABLE tags (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL UNIQUE CHECK (char_length(name) BETWEEN 1 AND 50),
      -- Unique, so "React" and "react" are the same tag.
      slug text NOT NULL UNIQUE CHECK (slug ~ ${SLUG} AND char_length(slug) <= 100),
      created_at timestamptz NOT NULL DEFAULT now(),
      updated_at timestamptz NOT NULL DEFAULT now()
    );
    CREATE TRIGGER tags_set_updated_at
      BEFORE UPDATE ON tags
      FOR EACH ROW EXECUTE FUNCTION set_updated_at();

    CREATE TABLE post_tags (
      post_id bigint NOT NULL REFERENCES posts (id) ON DELETE CASCADE,
      tag_id bigint NOT NULL REFERENCES tags (id) ON DELETE RESTRICT,
      -- Keeps the order the author wrote the tags in.
      position smallint NOT NULL DEFAULT 0,
      PRIMARY KEY (post_id, tag_id)
    );
    CREATE INDEX post_tags_tag_idx ON post_tags (tag_id);
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE post_tags;
    DROP TABLE tags;
    DROP TABLE posts;
  `);
};
