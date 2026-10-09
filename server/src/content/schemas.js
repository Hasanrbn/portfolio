import { z } from 'zod';
import { isHttpsUrl, isMonth, isSlug, isUsableAddress } from '@portfolio/shared/validation.js';

/**
 * Strict rules for the content files in shared/data (and the articles in shared/posts). The
 * site itself quietly skips a bad entry so a page never breaks; these rules do the opposite
 * and stop on the first bad file, naming the file and the field ("projects[0].repoUrl: ..."),
 * so the author fixes the data instead of losing an entry silently. `npm run content:check`
 * and the tests run them.
 */

const text = (max) => z.string().trim().min(1).max(max);
// "" and null both mean "not given"; both become null.
const optionalText = (max) =>
  z
    .union([z.string().trim().max(max), z.null()])
    .optional()
    .transform((value) => value || null);
const textOrEmpty = (max) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((value) => value ?? '');
const textList = z.array(z.string().trim().min(1)).default([]);
const slug = z.string().refine(isSlug, 'must be lowercase letters, numbers and single hyphens');
const sortOrder = z.number().int().default(0);
const year = z.number().int().min(1900).max(2100);
const httpsUrl = optionalText(2000).refine(
  (value) => value === null || isHttpsUrl(value),
  'must be an https address',
);
const address = z.string().trim().max(2000).refine(isUsableAddress, {
  message: 'must be a path on this site (/file.png) or an https address',
});
const picture = z
  .object({
    url: address,
    alt: textOrEmpty(300),
    caption: textOrEmpty(300),
    width: z.number().int().positive().nullable().optional().default(null),
    height: z.number().int().positive().nullable().optional().default(null),
  })
  .strict();

export const SKILL_LEVELS = ['familiar', 'intermediate', 'advanced'];
export const SKILL_CATEGORIES = ['frontend', 'backend', 'database', 'tools', 'other'];

export const skillsFileSchema = z.object({
  categories: z.array(
    z.object({
      id: z.enum(SKILL_CATEGORIES),
      label: z.string().optional(),
      skills: z.array(
        z
          .object({
            id: slug,
            name: text(100),
            level: z.enum(SKILL_LEVELS).nullable().default(null),
            description: textOrEmpty(500),
          })
          .strict(),
      ),
    }),
  ),
});

export const projectsFileSchema = z.object({
  projects: z.array(
    z
      .object({
        slug,
        title: text(200),
        summary: text(1000),
        description: textOrEmpty(20000),
        problem: textOrEmpty(20000),
        solution: textOrEmpty(20000),
        features: textList,
        architecture: z
          .object({
            description: textOrEmpty(5000),
            layers: z
              .array(z.object({ name: text(200), detail: textOrEmpty(2000) }).strict())
              .default([]),
          })
          .strict()
          .nullable()
          .default(null),
        challenges: textOrEmpty(20000),
        lessons: textOrEmpty(20000),
        category: textOrEmpty(100),
        status: z
          .enum(['planned', 'in_progress', 'completed', 'archived'])
          .nullable()
          .default(null),
        year: year.nullable().default(null),
        thumbnail: picture.nullable().default(null),
        screenshots: z.array(picture).default([]),
        repoUrl: httpsUrl,
        demoUrl: httpsUrl,
        technologies: z.array(text(100)).default([]),
        featured: z.boolean().default(false),
        published: z.boolean().default(false),
        sortOrder,
      })
      .strict(),
  ),
});

const month = z.string().refine(isMonth, 'must be a month written as YYYY-MM');

export const experiencesFileSchema = z.object({
  experiences: z.array(
    z
      .object({
        id: slug,
        position: text(200),
        organization: text(200),
        type: z
          .enum([
            'employment',
            'internship',
            'freelance',
            'academic',
            'personal',
            'organization',
            'volunteer',
          ])
          .nullable()
          .default(null),
        startDate: month,
        endDate: month.nullable().default(null),
        description: textOrEmpty(5000),
        responsibilities: textList,
        technologies: z.array(text(100)).default([]),
        sortOrder,
        visible: z.boolean().default(true),
      })
      .strict()
      .refine((entry) => entry.endDate === null || entry.endDate >= entry.startDate, {
        message: 'endDate must not be before startDate',
        path: ['endDate'],
      }),
  ),
});

export const educationFileSchema = z.object({
  education: z.array(
    z
      .object({
        id: slug,
        institution: text(200),
        program: text(200),
        startYear: year,
        endYear: year.nullable().default(null),
        subjects: textList,
        achievements: textList,
        sortOrder,
        visible: z.boolean().default(true),
      })
      .strict()
      .refine((entry) => entry.endYear === null || entry.endYear >= entry.startYear, {
        message: 'endYear must not be before startYear',
        path: ['endYear'],
      }),
  ),
});

export const certificatesFileSchema = z.object({
  certificates: z.array(
    z
      .object({
        id: slug,
        title: text(200),
        issuer: text(200),
        issuedDate: month,
        category: textOrEmpty(100),
        credentialId: optionalText(200),
        credentialUrl: httpsUrl,
        file: z
          .object({ url: address, alt: textOrEmpty(300) })
          .strict()
          .nullable()
          .default(null),
        sortOrder,
        visible: z.boolean().default(true),
      })
      .strict(),
  ),
});

/** Throws one readable error listing every problem found in a content file. */
export function parseContentFile(name, schema, data) {
  const result = schema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  const problems = result.error.issues.map((issue) => {
    const where = issue.path
      .map((part) => (typeof part === 'number' ? `[${part}]` : `.${part}`))
      .join('')
      .replace(/^\./, '');
    return `- ${name}${where ? `: ${where}` : ''}: ${issue.message}`;
  });
  throw new Error(`Invalid content:\n${problems.join('\n')}`);
}
