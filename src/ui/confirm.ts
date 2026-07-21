// One-key Y/n. Enter/y → true, n/ESC → false. Non-TTY resolves to `fallback`.
export function promptConfirm(question: string, fallback = true): Promise<boolean> {
  const stdin = process.stdin;
  if (!stdin.isTTY) {
    process.stdout.write(`${question} ${fallback ? "yes" : "no"}\n`);
    return Promise.resolve(fallback);
  }

  return new Promise((resolve) => {
    process.stdout.write(question);
    const wasRaw = stdin.isRaw;
    stdin.setRawMode(true);
    stdin.resume();

    const cleanup = () => {
      stdin.removeListener("data", onData);
      stdin.setRawMode(wasRaw);
      stdin.pause();
    };

    const onData = (buf: Buffer) => {
      const key = buf.toString();
      let result: boolean | null = null;
      if (key === "y" || key === "Y" || key === "\r" || key === "\n") result = true;
      else if (key === "n" || key === "N" || key === "\x1b" || key === "\x03") result = false;
      if (result === null) return;
      cleanup();
      process.stdout.write(result ? "y\n" : "n\n");
      resolve(result);
    };

    stdin.on("data", onData);
  });
}
