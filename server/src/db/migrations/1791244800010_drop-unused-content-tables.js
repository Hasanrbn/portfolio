// Removes the tables for site content (technologies, skills, projects, experience, education,
// certificates, posts, tags). They were created for an admin-managed site whose pages would be
// served from the database. That is not how this site works: the pages read the files in
// shared/data and shared/posts, nothing ever read these tables, and the only data the server
// owns is `messages`. Keeping them would mean carrying (and migrating, and backing up) empty
// tables and a seed nobody needs.
//
// Nothing of value is lost: the tables only held copies of the content files.
// Earlier migrations stay as they are (a migration that has run anywhere is never edited), so
// a new database still creates these tables first and drops them here. `down` recreates them
// by running the original `up` functions, so reverting stays possible and exact.

import { up as createBlogTables } from './1791244800001_blog-tables.js';
import { up as createContentTables } from './1791244800000_content-tables.js';

export const up = (pgm) => {
  pgm.sql(`
    DROP TABLE post_tags;
    DROP TABLE tags;
    DROP TABLE posts;
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

export const down = (pgm) => {
  createContentTables(pgm);
  createBlogTables(pgm);
};
