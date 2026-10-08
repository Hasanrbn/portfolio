import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parsePostFile } from '@portfolio/shared/posts.js';
import {
  certificatesFileSchema,
  educationFileSchema,
  experiencesFileSchema,
  parseContentFile,
  projectsFileSchema,
  skillsFileSchema,
} from './schemas.js';

export const DEFAULT_DATA_DIR = fileURLToPath(new URL('../../../shared/data', import.meta.url));

async function readJson(dir, name) {
  const file = path.join(dir, name);
  let raw;
  try {
    raw = await readFile(file, 'utf8');
  } catch (error) {
    throw new Error(`Cannot read content file ${name}: ${error.message}`, { cause: error });
  }
  try {
    return JSON.parse(raw);
  } catch (error) {
    throw new Error(`Content file ${name} is not valid JSON: ${error.message}`, { cause: error });
  }
}

async function readPosts(dir) {
  let names;
  try {
    names = (await readdir(path.join(dir, 'posts'))).filter((name) => name.endsWith('.md')).sort();
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }

  const posts = [];
  const seen = new Map();
  for (const name of names) {
    const raw = await readFile(path.join(dir, 'posts', name), 'utf8');
    const post = parsePostFile({ path: `posts/${name}`, raw });
    if (!post) {
      throw new Error(
        `Invalid content:\n- posts/${name}: needs a title, some text, a real publishedAt (YYYY-MM-DD) and a URL-safe slug`,
      );
    }
    if (seen.has(post.slug)) {
      throw new Error(
        `Invalid content:\n- posts/${name}: slug "${post.slug}" is already used by ${seen.get(post.slug)}`,
      );
    }
    seen.set(post.slug, name);
    posts.push(post);
  }
  return posts;
}

/** Fails when a list uses the same public id twice (the database would refuse it anyway). */
function assertUnique(name, entries, key) {
  const seen = new Set();
  const repeated = entries
    .map((entry) => entry[key])
    .filter((value) => seen.has(value) || !seen.add(value));
  if (repeated.length > 0) {
    throw new Error(
      `Invalid content:\n${[...new Set(repeated)].map((value) => `- ${name}: "${value}" is used more than once`).join('\n')}`,
    );
  }
}

/**
 * Reads and validates everything in shared/data: the JSON files and the markdown articles.
 * Returns plain, cleaned objects; nothing is written anywhere.
 */
export async function loadContent(dir = DEFAULT_DATA_DIR) {
  const [skills, projects, experiences, education, certificates, posts] = await Promise.all([
    readJson(dir, 'skills.json').then((data) =>
      parseContentFile('skills.json', skillsFileSchema, data),
    ),
    readJson(dir, 'projects.json').then((data) =>
      parseContentFile('projects.json', projectsFileSchema, data),
    ),
    readJson(dir, 'experiences.json').then((data) =>
      parseContentFile('experiences.json', experiencesFileSchema, data),
    ),
    readJson(dir, 'education.json').then((data) =>
      parseContentFile('education.json', educationFileSchema, data),
    ),
    readJson(dir, 'certificates.json').then((data) =>
      parseContentFile('certificates.json', certificatesFileSchema, data),
    ),
    readPosts(dir),
  ]);

  const skillList = skills.categories.flatMap((category) =>
    category.skills.map((skill) => ({ ...skill, category: category.id })),
  );
  assertUnique('skills.json', skillList, 'id');
  assertUnique('projects.json', projects.projects, 'slug');
  assertUnique('experiences.json', experiences.experiences, 'id');
  assertUnique('education.json', education.education, 'id');
  assertUnique('certificates.json', certificates.certificates, 'id');

  return {
    skills: skillList,
    projects: projects.projects,
    experiences: experiences.experiences,
    education: education.education,
    certificates: certificates.certificates,
    posts,
  };
}
