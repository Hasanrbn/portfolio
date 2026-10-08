import { PassThrough } from 'node:stream';
import { describe, expect, it, vi } from 'vitest';
import { ask } from '../../src/auth/prompt.js';

function fakeTerminal({ isTTY = true } = {}) {
  const input = new PassThrough();
  input.isTTY = isTTY;
  input.setRawMode = vi.fn();
  let shown = '';
  const output = { write: (text) => (shown += text) };
  return { input, output, shown: () => shown };
}

describe('terminal prompt', () => {
  it('refuses to run when there is no terminal (a pipe or a file)', async () => {
    const { input, output } = fakeTerminal({ isTTY: false });

    await expect(ask('Password: ', { secret: true, input, output })).rejects.toThrow(
      /interactive terminal/,
    );
  });

  it('never echoes a secret, supports backspace, and restores the terminal', async () => {
    const { input, output, shown } = fakeTerminal();

    const answer = ask('Password: ', { secret: true, input, output });
    input.write('hunt');
    input.write('\u007fer2\r');

    expect(await answer).toBe('hunter2'.replace('hunter2', 'hunt'.slice(0, 3) + 'er2'));
    expect(shown()).toBe('Password: \n');
    expect(input.setRawMode).toHaveBeenNthCalledWith(1, true);
    expect(input.setRawMode).toHaveBeenLastCalledWith(false);
  });

  it('echoes a normal answer', async () => {
    const { input, output, shown } = fakeTerminal();

    const answer = ask('Email: ', { input, output });
    input.write('me@example.org\n');

    expect(await answer).toBe('me@example.org');
    expect(shown()).toContain('me@example.org');
  });

  it('takes a pasted text in one piece and ignores control characters', async () => {
    const { input, output } = fakeTerminal();

    const answer = ask('Password: ', { secret: true, input, output });
    input.write('pasted pass\u001b[Aword\r');

    expect(await answer).toBe('pasted pass[Aword');
  });

  it('rejects on Ctrl+C', async () => {
    const { input, output } = fakeTerminal();

    const answer = ask('Password: ', { secret: true, input, output });
    input.write('abc\u0003');

    await expect(answer).rejects.toThrow('Cancelled.');
    expect(input.setRawMode).toHaveBeenLastCalledWith(false);
  });
});
