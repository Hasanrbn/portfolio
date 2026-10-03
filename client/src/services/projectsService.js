import projectsData from '@portfolio/shared/data/projects.json';
import { getHttpsUrl, getImageSource } from '../utils/profile.js';
import { isProjectStatus } from '../utils/projectStatus.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const isText = (value) => typeof value === 'string' && value.trim() !== '';
const text = (value) => (isText(value) ? value.trim() : '');
const textList = (value) => (Array.isArray(value) ? value.filter(isText).map((v) => v.trim()) : []);

function normalizePicture(picture, title, fallbackAlt) {
  const url = getImageSource(picture?.url);
  if (!url) {
    return null;
  }
  const size = (value) => (Number.isInteger(value) && value > 0 ? value : null);
  return {
    url,
    alt: text(picture.alt) || fallbackAlt(title),
    caption: text(picture.caption),
    width: size(picture.width),
    height: size(picture.height),
  };
}

function normalizeArchitecture(architecture) {
  const layers = (Array.isArray(architecture?.layers) ? architecture.layers : [])
    .filter((layer) => isText(layer?.name))
    .map((layer) => ({ name: layer.name.trim(), detail: text(layer.detail) }));
  const description = text(architecture?.description);

  return description || layers.length > 0 ? { description, layers } : null;
}

function normalizeProject(project) {
  const title = text(project.title);

  return {
    slug: project.slug,
    title,
    summary: text(project.summary),
    description: text(project.description),
    problem: text(project.problem),
    solution: text(project.solution),
    features: textList(project.features),
    architecture: normalizeArchitecture(project.architecture),
    challenges: text(project.challenges),
    lessons: text(project.lessons),
    category: text(project.category),
    status: isProjectStatus(project.status) ? project.status : null,
    year: Number.isInteger(project.year) ? project.year : null,
    thumbnail: normalizePicture(project.thumbnail, title, (name) => `Preview of ${name}`),
    screenshots: (Array.isArray(project.screenshots) ? project.screenshots : [])
      .map((shot) => normalizePicture(shot, title, (name) => `Screenshot of ${name}`))
      .filter(Boolean),
    repoUrl: getHttpsUrl(project.repoUrl),
    demoUrl: getHttpsUrl(project.demoUrl),
    technologies: textList(project.technologies),
    featured: project.featured === true,
    sortOrder: Number.isFinite(project.sortOrder) ? project.sortOrder : 0,
  };
}

/**
 * Cleans project data so pages never have to guard against bad values. Entries are dropped
 * when they are unpublished, have a slug that is not URL-safe or repeated, or lack a title or
 * summary. Links must be https. The result is sorted by `sortOrder`. The shape matches what
 * GET /api/projects will return in Phase 15.
 */
export function normalizeProjects(data) {
  const entries = Array.isArray(data?.projects) ? data.projects : [];
  const seen = new Set();

  return entries
    .filter((project) => project && project.published !== false)
    .filter((project) => typeof project.slug === 'string' && SLUG_PATTERN.test(project.slug))
    .filter((project) => isText(project.title) && isText(project.summary))
    .filter((project) => !seen.has(project.slug) && seen.add(project.slug))
    .map(normalizeProject)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

/** Projects matching a search text, a category and a technology (all optional, all must match). */
export function filterProjects(projects, { q = '', category = '', tech = '' } = {}) {
  const query = q.trim().toLowerCase();

  return projects.filter((project) => {
    if (category && project.category !== category) return false;
    if (tech && !project.technologies.includes(tech)) return false;
    if (!query) return true;
    return [project.title, project.summary, ...project.technologies].some((value) =>
      value.toLowerCase().includes(query),
    );
  });
}

/** The categories and technologies that appear in the projects, sorted, for the filter menus. */
export function getFilterOptions(projects) {
  const unique = (values) =>
    [...new Set(values.filter(Boolean))].sort((a, b) => a.localeCompare(b, 'en'));

  return {
    categories: unique(projects.map((project) => project.category)),
    technologies: unique(projects.flatMap((project) => project.technologies)),
  };
}

/**
 * Async on purpose: today these read the bundled seed file, and in Phase 15 only these two
 * functions change to call the API, with no change to the pages.
 */
export async function getProjects() {
  return normalizeProjects(projectsData);
}

/** One project by slug, or null when there is no such project. */
export async function getProjectBySlug(slug) {
  const projects = await getProjects();
  return projects.find((project) => project.slug === slug) ?? null;
}
