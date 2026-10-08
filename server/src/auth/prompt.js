/**
 * Asks one question in the terminal, character by character, so a password can be typed
 * without being shown (and without ending up in the shell history or process list, which is
 * why the CLI never takes a password as an argument or environment variable).
 *
 * Needs a real terminal (`input.isTTY`): with a pipe or a file there is no way to hide the
 * typing, so it refuses instead of reading a password from somewhere it could leak.
 * `input` and `output` are injectable for tests.
 */
export function ask(
  question,
  { secret = false, input = process.stdin, output = process.stdout } = {},
) {
  if (!input.isTTY) {
    return Promise.reject(
      new Error('This command asks questions, so it must be run in an interactive terminal.'),
    );
  }

  return new Promise((resolve, reject) => {
    let answer = '';
    output.write(question);
    input.setRawMode(true);
    input.setEncoding('utf8');
    input.resume();

    function finish(callback) {
      input.removeListener('data', onData);
      input.setRawMode(false);
      input.pause();
      output.write('\n');
      callback();
    }

    function onData(chunk) {
      // A pasted text arrives as one chunk, so go through it one character at a time.
      for (const char of chunk) {
        if (char === '\u0003') {
          // Ctrl+C
          return finish(() => reject(new Error('Cancelled.')));
        }
        if (char === '\r' || char === '\n') {
          return finish(() => resolve(answer));
        }
        if (char === '\u007f' || char === '\b') {
          if (answer.length > 0) {
            const removed = [...answer].pop();
            answer = answer.slice(0, -removed.length);
            if (!secret) output.write('\b \b');
          }
          continue;
        }
        if (char >= ' ') {
          answer += char;
          if (!secret) output.write(char);
        }
      }
    }

    input.on('data', onData);
  });
}
