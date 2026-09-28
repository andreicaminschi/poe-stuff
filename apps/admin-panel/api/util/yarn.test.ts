import { EventEmitter } from "node:events";
import { beforeEach, describe, expect, it, jest } from "@jest/globals";

type FakeChild = EventEmitter & { stdout: EventEmitter; stderr: EventEmitter };

const spawn = jest.fn<(command: string, options: unknown) => FakeChild>();
jest.unstable_mockModule("node:child_process", () => ({ spawn }));

const { runYarn, runAction, runQuery } = await import("./yarn.ts");

function fakeChild(finish: (child: FakeChild) => void): void {
  spawn.mockImplementation(() => {
    const child = Object.assign(new EventEmitter(), { stdout: new EventEmitter(), stderr: new EventEmitter() });
    queueMicrotask(() => finish(child));
    return child;
  });
}

const exits = (code: number | null, stdout = "", stderr = "") =>
  fakeChild((child) => {
    if (stdout !== "") child.stdout.emit("data", Buffer.from(stdout));
    if (stderr !== "") child.stderr.emit("data", Buffer.from(stderr));
    child.emit("close", code);
  });

const stderrChunks = (...chunks: string[]) =>
  fakeChild((child) => {
    for (const chunk of chunks) child.stderr.emit("data", Buffer.from(chunk));
    child.emit("close", 0);
  });

beforeEach(() => {
  spawn.mockReset();
});

describe("runYarn", () => {
  it("runs yarn through the shell in the repo with every argument double-quoted", async () => {
    exits(0);

    await runYarn("/repo", ["taxonomy", "--root=C:\\tmp dir"]);

    expect(spawn).toHaveBeenCalledWith("yarn \"taxonomy\" \"--root=C:\\tmp dir\"", {
      cwd: "/repo",
      shell: true,
      windowsHide: true,
    });
  }); // quoting keeps a path with a space as one argument

  it.each(["a\"b", "100%", "$HOME", "a`b"])("refuses to hand %s to a shell and never starts a process", async (arg) => {
    exits(0);

    const running = runYarn("/repo", [arg]);

    await expect(running).rejects.toThrow(`Refusing to pass ${arg} to a shell`);
    expect(spawn).not.toHaveBeenCalled();
  }); // these escape double quotes on cmd or sh

  it("joins output that arrives in several chunks, keeping stdout and stderr apart and in order", async () => {
    fakeChild((child) => {
      child.stdout.emit("data", Buffer.from("one "));
      child.stderr.emit("data", Buffer.from("warn"));
      child.stdout.emit("data", Buffer.from("two"));
      child.emit("close", 0);
    });

    const outcome = await runYarn("/repo", []);

    expect(outcome).toEqual({ code: 0, stdout: "one two", stderr: "warn" });
  });

  it("reports exit code 1 when the process closes without a code", async () => {
    exits(null);

    const outcome = await runYarn("/repo", []);

    expect(outcome.code).toBe(1);
  }); // a signal-killed child closes with null

  it("rejects when the process cannot be started", async () => {
    fakeChild((child) => child.emit("error", new Error("ENOENT")));

    const running = runYarn("/repo", []);

    await expect(running).rejects.toThrow("ENOENT");
  });

  it("hands each complete stderr line to the listener, joining a line split across two chunks", async () => {
    stderrChunks("progress 1/3 it", "ems\nprogress 2/3 maps\n");
    const lines: string[] = [];

    await runYarn("/repo", [], (line) => lines.push(line));

    expect(lines).toEqual(["progress 1/3 items", "progress 2/3 maps"]);
  }); // the partial tail waits for the next chunk

  it("splits Windows line endings without leaving a carriage return on the line", async () => {
    stderrChunks("first\r\nsecond\r\n");
    const lines: string[] = [];

    await runYarn("/repo", [], (line) => lines.push(line));

    expect(lines).toEqual(["first", "second"]);
  });

  it("never hands over a last stderr line that has no newline after it", async () => {
    stderrChunks("done\nunfinished");
    const lines: string[] = [];

    const outcome = await runYarn("/repo", [], (line) => lines.push(line));

    expect(lines).toEqual(["done"]);
    expect(outcome.stderr).toBe("done\nunfinished");
  }); // the tail is dropped for the listener, kept in stderr
});

describe("runAction", () => {
  it("succeeds on exit code 0 and logs stdout followed by stderr", async () => {
    exits(0, "out\n", "err\n");

    const result = await runAction("/repo", []);

    expect(result).toEqual({ ok: true, log: "out\nerr\n" });
  });

  it("answers a failure instead of throwing when yarn exits with code 2", async () => {
    exits(2, "", "boom");

    const result = await runAction("/repo", []);

    expect(result).toEqual({ ok: false, log: "boom" });
  }); // the panel shows the log; a throw would lose it
});

describe("runQuery", () => {
  it("parses what yarn printed as JSON on success", async () => {
    exits(0, "{\"blocks\":3}");

    const answer = await runQuery("/repo", []);

    expect(answer).toEqual({ blocks: 3 });
  });

  it("throws the trimmed stderr when yarn fails", async () => {
    exits(1, "", "  bad version \n");

    const running = runQuery("/repo", ["x"]);

    await expect(running).rejects.toThrow(/^bad version$/);
  });

  it("names the command and exit code when a failing run printed nothing to stderr", async () => {
    exits(3, "ignored");

    const running = runQuery("/repo", ["taxonomy", "validate"]);

    await expect(running).rejects.toThrow("yarn taxonomy validate exited 3");
  }); // whitespace-only stderr counts as nothing

  it("throws a parse error when a successful run prints something that is not JSON", async () => {
    exits(0, "Done in 1s");

    const running = runQuery("/repo", []);

    await expect(running).rejects.toThrow(SyntaxError);
  });

  it("passes stderr lines to the listener while the query runs", async () => {
    fakeChild((child) => {
      child.stderr.emit("data", Buffer.from("progress 1/1 all\n"));
      child.stdout.emit("data", Buffer.from("{}"));
      child.emit("close", 0);
    });
    const lines: string[] = [];

    await runQuery("/repo", [], (line) => lines.push(line));

    expect(lines).toEqual(["progress 1/1 all"]);
  }); // runAction takes no listener; runQuery forwards it
});
