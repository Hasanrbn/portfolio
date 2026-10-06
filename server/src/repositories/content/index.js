import { createCertificatesRepository } from './certificates.js';
import { createEducationRepository } from './education.js';
import { createExperiencesRepository } from './experiences.js';
import { createPostsRepository } from './posts.js';
import { createProjectsRepository } from './projects.js';
import { createSkillsRepository } from './skills.js';

/**
 * Read access to everything the public pages show. Every method returns plain objects in
 * the shape of the client's services (client/src/services), so switching the site from the
 * seed files to the API (Phase 15) does not change what the pages receive.
 */
export function createContentRepositories({ pool }) {
  return {
    skills: createSkillsRepository({ pool }),
    projects: createProjectsRepository({ pool }),
    experiences: createExperiencesRepository({ pool }),
    education: createEducationRepository({ pool }),
    certificates: createCertificatesRepository({ pool }),
    posts: createPostsRepository({ pool }),
  };
}
