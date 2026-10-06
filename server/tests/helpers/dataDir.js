import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { dataFiles, postFiles } from '../fixtures/content.js';

/**
 * Writes a data folder (like shared/data) with the fixture content, overridden by `files`
 * (name -> object, or name -> string for a raw file; null leaves the file out) and `posts`
 * (file name -> raw text). Returns the folder and a function that deletes it.
 */
export async function createDataDir({ files = {}, posts } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'portfolio-seed-'));
  const all = { ...dataFiles, ...files };

  for (const [name, content] of Object.entries(all)) {
    if (content === null) continue;
    await writeFile(
      path.join(dir, name),
      typeof content === 'string' ? content : JSON.stringify(content),
    );
  }

  await mkdir(path.join(dir, 'posts'));
  const postEntries =
    posts ?? Object.fromEntries(postFiles.map((file) => [path.basename(file.path), file.raw]));
  for (const [name, raw] of Object.entries(postEntries)) {
    await writeFile(path.join(dir, 'posts', name), raw);
  }

  return { dir, remove: () => rm(dir, { recursive: true, force: true }) };
}
