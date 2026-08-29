import { spawn } from "node:child_process";

/**
 * One `claude -p` call, prompt on stdin.
 *
 * Stdin rather than an argument: a whole forum post is well past the command line length
 * Windows accepts.
 */
export function askClaude(prompt: string, model: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("claude", ["-p", "--model", model], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
    });

    let out = "";
    let err = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (piece: string) => (out += piece));
    child.stderr.on("data", (piece: string) => (err += piece));

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(out);
      else reject(new Error(`claude exited ${code}: ${err.trim()}`));
    });

    child.stdin.end(prompt, "utf8");
  });
}
