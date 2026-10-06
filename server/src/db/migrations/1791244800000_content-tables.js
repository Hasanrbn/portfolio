// Tables for the content shown on the site: technologies, skills, projects, experience,
// education and certificates. See docs/database.md for the reasoning behind each table.
//
// Rules applied everywhere:
//  - `slug` is the public identifier (URL-safe), `id` never leaves the server.
//  - Allowed values are enforced by CHECK constraints, so a bad value cannot be stored even
//    by a bug or a hand-written query.
//  - Links must be https and images or files must be a path on this site or an https address,
//    the same rules the site applies when it displays them.
//  - `created_at` / `updated_at` are kept by the database (a trigger updates `updated_at`).

// The patterns contain backslashes, so they are written with String.raw.
const SLUG = String.raw`'^[a-z0-9]+(-[a-z0-9]+)*$'`;
const HTTPS = String.raw`'^https://\S+$'`;
// A file on this site ("/cv.pdf", but not "//host" or "/\host") or an https address.
const ADDRESS = String.raw`'^(https://\S+|/([^/\\\s]\S*)?)$'`;

const timestamps = `
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()`;

const touch = (table) => `
  CREATE TRIGGER ${table}_set_updated_at
    BEFORE UPDATE ON ${table}
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();`;

export const up = (pgm) => {
  pgm.sql(`
    CREATE FUNCTION set_updated_at() RETURNS trigger
    LANGUAGE plpgsql AS $$
    BEGIN
      NEW.updated_at = now();
      RETURN NEW;
    END;
    $$;

    CREATE TABLE technologies (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      name text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 100),
      slug text NOT NULL UNIQUE CHECK (slug ~ ${SLUG} AND char_length(slug) <= 100),
      category text NOT NULL DEFAULT 'other'
        CHECK (category IN ('frontend', 'backend', 'database', 'tools', 'other')),
      icon_key text CHECK (icon_key IS NULL OR char_length(icon_key) <= 50),${timestamps}
    );
    ${touch('technologies')}

    CREATE TABLE skills (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      technology_id bigint NOT NULL UNIQUE REFERENCES technologies (id) ON DELETE CASCADE,
      level text CHECK (level IS NULL OR level IN ('familiar', 'intermediate', 'advanced')),
      description text NOT NULL DEFAULT '' CHECK (char_length(description) <= 500),
      sort_order integer NOT NULL DEFAULT 0,
      is_visible boolean NOT NULL DEFAULT true,${timestamps}
    );
    ${touch('skills')}

    CREATE TABLE projects (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      slug text NOT NULL UNIQUE CHECK (slug ~ ${SLUG} AND char_length(slug) <= 100),
      title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
      summary text NOT NULL CHECK (char_length(summary) BETWEEN 1 AND 1000),
      description_md text NOT NULL DEFAULT '',
      problem_md text NOT NULL DEFAULT '',
      solution_md text NOT NULL DEFAULT '',
      features text[] NOT NULL DEFAULT ARRAY[]::text[],
      architecture_description text NOT NULL DEFAULT '',
      architecture_layers jsonb NOT NULL DEFAULT '[]'::jsonb
        CHECK (jsonb_typeof(architecture_layers) = 'array'),
      challenges_md text NOT NULL DEFAULT '',
      lessons_md text NOT NULL DEFAULT '',
      category text NOT NULL DEFAULT '',
      status text CHECK (status IS NULL OR status IN ('planned', 'in_progress', 'completed', 'archived')),
      year smallint CHECK (year IS NULL OR year BETWEEN 1900 AND 2100),
      thumbnail_url text CHECK (thumbnail_url IS NULL OR thumbnail_url ~ ${ADDRESS}),
      thumbnail_alt text NOT NULL DEFAULT '',
      thumbnail_caption text NOT NULL DEFAULT '',
      thumbnail_width integer CHECK (thumbnail_width IS NULL OR thumbnail_width > 0),
      thumbnail_height integer CHECK (thumbnail_height IS NULL OR thumbnail_height > 0),
      repo_url text CHECK (repo_url IS NULL OR repo_url ~ ${HTTPS}),
      demo_url text CHECK (demo_url IS NULL OR demo_url ~ ${HTTPS}),
      is_featured boolean NOT NULL DEFAULT false,
      -- A new project stays hidden until it is published on purpose.
      is_published boolean NOT NULL DEFAULT false,
      sort_order integer NOT NULL DEFAULT 0,${timestamps}
    );
    CREATE INDEX projects_published_order_idx ON projects (is_published, sort_order);
    ${touch('projects')}

    CREATE TABLE project_technologies (
      project_id bigint NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
      technology_id bigint NOT NULL REFERENCES technologies (id) ON DELETE RESTRICT,
      -- Keeps the order the author wrote the technologies in.
      position smallint NOT NULL DEFAULT 0,
      PRIMARY KEY (project_id, technology_id)
    );
    CREATE INDEX project_technologies_technology_idx ON project_technologies (technology_id);

    CREATE TABLE project_images (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      project_id bigint NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
      url text NOT NULL CHECK (url ~ ${ADDRESS}),
      alt text NOT NULL DEFAULT '',
      caption text NOT NULL DEFAULT '',
      width integer CHECK (width IS NULL OR width > 0),
      height integer CHECK (height IS NULL OR height > 0),
      sort_order integer NOT NULL DEFAULT 0
    );
    CREATE INDEX project_images_project_idx ON project_images (project_id, sort_order);

    CREATE TABLE experiences (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      slug text NOT NULL UNIQUE CHECK (slug ~ ${SLUG} AND char_length(slug) <= 100),
      position text NOT NULL CHECK (char_length(position) BETWEEN 1 AND 200),
      organization text NOT NULL CHECK (char_length(organization) BETWEEN 1 AND 200),
      type text CHECK (type IS NULL OR type IN
        ('employment', 'internship', 'freelance', 'academic', 'personal', 'organization', 'volunteer')),
      -- Months are stored as the first day of the month; the API shows them as "YYYY-MM".
      start_date date NOT NULL CHECK (extract(day FROM start_date) = 1),
      -- NULL means "until now".
      end_date date CHECK (end_date IS NULL OR (extract(day FROM end_date) = 1 AND end_date >= start_date)),
      description text NOT NULL DEFAULT '',
      responsibilities text[] NOT NULL DEFAULT ARRAY[]::text[],
      sort_order integer NOT NULL DEFAULT 0,
      is_visible boolean NOT NULL DEFAULT true,${timestamps}
    );
    ${touch('experiences')}

    CREATE TABLE experience_technologies (
      experience_id bigint NOT NULL REFERENCES experiences (id) ON DELETE CASCADE,
      technology_id bigint NOT NULL REFERENCES technologies (id) ON DELETE RESTRICT,
      position smallint NOT NULL DEFAULT 0,
      PRIMARY KEY (experience_id, technology_id)
    );
    CREATE INDEX experience_technologies_technology_idx ON experience_technologies (technology_id);

    CREATE TABLE education (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      slug text NOT NULL UNIQUE CHECK (slug ~ ${SLUG} AND char_length(slug) <= 100),
      institution text NOT NULL CHECK (char_length(institution) BETWEEN 1 AND 200),
      program text NOT NULL CHECK (char_length(program) BETWEEN 1 AND 200),
      start_year smallint NOT NULL CHECK (start_year BETWEEN 1900 AND 2100),
      -- NULL means "until now".
      end_year smallint CHECK (end_year IS NULL OR (end_year BETWEEN 1900 AND 2100 AND end_year >= start_year)),
      subjects text[] NOT NULL DEFAULT ARRAY[]::text[],
      achievements text[] NOT NULL DEFAULT ARRAY[]::text[],
      sort_order integer NOT NULL DEFAULT 0,
      is_visible boolean NOT NULL DEFAULT true,${timestamps}
    );
    ${touch('education')}

    CREATE TABLE certificates (
      id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
      slug text NOT NULL UNIQUE CHECK (slug ~ ${SLUG} AND char_length(slug) <= 100),
      title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
      issuer text NOT NULL CHECK (char_length(issuer) BETWEEN 1 AND 200),
      -- A month, stored as its first day. The year is derived from it, never stored twice.
      issued_date date NOT NULL CHECK (extract(day FROM issued_date) = 1),
      category text NOT NULL DEFAULT '',
      credential_id text CHECK (credential_id IS NULL OR char_length(credential_id) <= 200),
      credential_url text CHECK (credential_url IS NULL OR credential_url ~ ${HTTPS}),
      file_url text CHECK (file_url IS NULL OR file_url ~ ${ADDRESS}),
      file_alt text,
      sort_order integer NOT NULL DEFAULT 0,
      is_visible boolean NOT NULL DEFAULT true,${timestamps}
    );
    ${touch('certificates')}
  `);
};

export const down = (pgm) => {
  pgm.sql(`
    DROP TABLE certificates;
    DROP TABLE education;
    DROP TABLE experience_technologies;
    DROP TABLE experiences;
    DROP TABLE project_images;
    DROP TABLE project_technologies;
    DROP TABLE projects;
    DROP TABLE skills;
    DROP TABLE technologies;
    DROP FUNCTION set_updated_at();
  `);
};
