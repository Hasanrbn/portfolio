import { beforeEach, describe, expect, it, vi } from 'vitest';

const runner = vi.hoisted(() => vi.fn());
vi.mock('node-pg-migrate', () => ({ runner }));

const { runMigrations } = await import('../src/db/migrate.js');

describe('runMigrations lock option', () => {
  beforeEach(() => {
    runner.mockReset().mockResolvedValue([]);
  });

  it('keeps the migration lock on by default, so two deployments cannot migrate at once', async () => {
    await runMigrations({ connection: 'postgres://u:p@h/db' });

    expect(runner).toHaveBeenCalledWith(expect.objectContaining({ noLock: false }));
  });

  it('turns the lock off only when asked', async () => {
    await runMigrations({ connection: 'postgres://u:p@h/db', lock: false });

    expect(runner).toHaveBeenCalledWith(expect.objectContaining({ noLock: true }));
  });
});
