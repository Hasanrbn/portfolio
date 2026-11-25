import projectsData from '@portfolio/shared/data/projects.json';
import { getHttpsUrl, getImageSource } from '../utils/profile.js';
import { isProjectStatus } from '../utils/projectStatus.js';
import { isText, text, textList } from './normalize.js';

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

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

function normalizeComparison(comparison, title) {
  const before = normalizePicture(comparison?.before, title, (name) => `Before: ${name}`);
  const after = normalizePicture(comparison?.after, title, (name) => `After: ${name}`);
  if (!before || !after) {
    return null;
  }
  return {
    before,
    after,
    beforeLabel: text(comparison.beforeLabel) || 'Before',
    afterLabel: text(comparison.afterLabel) || 'After',
    caption: text(comparison.caption),
  };
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
    comparison: normalizeComparison(project.comparison, title),
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
 * summary. Links must be https. The result is sorted by `sortOrder`.
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

/**
 * Async on purpose: the pages already show loading and error states, so where the data comes
 * from can change without touching them. Today it is the bundled file in shared/data.
 */
export async function getProjects() {
  return normalizeProjects(projectsData);
}
