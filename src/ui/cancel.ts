// Fires `onCancel` once on ESC/q/Ctrl+C during a run. Returns a stop() for the finally.
export function watchCancelKey(onCancel: () => void): () => void {
  const stdin = process.stdin;
  if (!stdin.isTTY) return () => {};

  const wasRaw = stdin.isRaw;
  stdin.setRawMode(true);
  stdin.resume();

  let fired = false;
  const onData = (buf: Buffer) => {
    const key = buf.toString();
    if (key === "\x1b" || key === "q" || key === "\x03") {
      if (fired) return;
      fired = true;
      onCancel();
    }
  };

  stdin.on("data", onData);

  return () => {
    stdin.removeListener("data", onData);
    stdin.setRawMode(wasRaw);
    stdin.pause();
  };
}
