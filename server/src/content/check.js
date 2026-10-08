import { loadContent } from './loadContent.js';

// Checks the real content in shared/data against the strict rules, before it is committed.
// Exit code 1 and a list of problems when something is wrong.
try {
  const content = await loadContent();
  console.log(
    `Content is valid: ${content.skills.length} skills, ${content.projects.length} projects, ` +
      `${content.experiences.length} experience entries, ${content.education.length} education ` +
      `entries, ${content.certificates.length} certificates, ${content.posts.length} posts.`,
  );
} catch (error) {
  console.error(error.message);
  process.exitCode = 1;
}
