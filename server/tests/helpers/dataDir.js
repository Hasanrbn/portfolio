import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { dataFiles } from '../fixtures/content.js';

/**
 * Writes a data folder (like shared/data) with the fixture content, overridden by `files`
 * (name -> object, or name -> string for a raw file; null leaves the file out). Returns the folder and a function that deletes it.
 */
export async function createDataDir({ files = {} } = {}) {
  const dir = await mkdtemp(path.join(tmpdir(), 'portfolio-content-'));
  const all = { ...dataFiles, ...files };

  for (const [name, content] of Object.entries(all)) {
    if (content === null) continue;
    await writeFile(
      path.join(dir, name),
      typeof content === 'string' ? content : JSON.stringify(content),
    );
  }

  return { dir, remove: () => rm(dir, { recursive: true, force: true }) };
}
