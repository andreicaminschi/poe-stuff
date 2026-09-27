import { spawn } from "node:child_process";

export type Outcome = {
  readonly code: number;
  readonly stdout: string;
  readonly stderr: string;
};

export type ActionResult = {
  readonly ok: boolean;
  readonly log: string;
};

const UNSAFE = /["%$`]/;

const quote = (arg: string): string => {
  if (UNSAFE.test(arg)) {
    throw new Error(`Refusing to pass ${arg} to a shell`);
  }

  return `"${arg}"`;
};

export type OnLine = (line: string) => void;

export function runYarn(repo: string, args: readonly string[], onStderrLine?: OnLine): Promise<Outcome> {
  return new Promise((done, fail) => {
    const child = spawn(["yarn", ...args.map(quote)].join(" "), {
      cwd: repo,
      shell: true,
      windowsHide: true,
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    let pending = "";
    child.stderr.on("data", (chunk: Buffer) => {
      const text = chunk.toString();
      stderr += text;
      if (onStderrLine === undefined) return;
      const lines = (pending + text).split(/\r?\n/);
      pending = lines.pop() ?? "";
      for (const line of lines) onStderrLine(line);
    });
    child.on("error", fail);
    child.on("close", (code) => done({ code: code ?? 1, stdout, stderr }));
  });
}

export async function runAction(repo: string, args: readonly string[]): Promise<ActionResult> {
  const { code, stdout, stderr } = await runYarn(repo, args);

  return { ok: code === 0, log: `${stdout}${stderr}` };
}

export async function runQuery<T>(repo: string, args: readonly string[], onStderrLine?: OnLine): Promise<T> {
  const { code, stdout, stderr } = await runYarn(repo, args, onStderrLine);

  if (code !== 0) {
    throw new Error(stderr.trim() || `yarn ${args.join(" ")} exited ${code}`);
  }

  return JSON.parse(stdout) as T;
}
