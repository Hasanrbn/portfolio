import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
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
 * Reads and validates everything in shared/data: the JSON files.
 * Returns plain, cleaned objects; nothing is written anywhere.
 */
export async function loadContent(dir = DEFAULT_DATA_DIR) {
  const [skills, projects, experiences, education, certificates] = await Promise.all([
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
  };
}
