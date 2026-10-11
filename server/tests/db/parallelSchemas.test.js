import { describe, expect, it } from 'vitest';
import { createTestDatabase, TEST_DATABASE_URL } from '../helpers/database.js';

describe.skipIf(!TEST_DATABASE_URL)('private test schemas', () => {
  // Test files run in parallel and each migrates its own schema in the same database. A
  // database-wide migration lock made that fail now and then ("Another migration is already running").
  it('can all be migrated at the same moment', async () => {
    const databases = await Promise.all(Array.from({ length: 8 }, () => createTestDatabase()));

    expect(new Set(databases.map((db) => db.schema)).size).toBe(8);
    await Promise.all(databases.map((db) => db.drop()));
  });
});
