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
  });

  it.each(["a\"b", "100%", "$HOME", "a`b"])("refuses to pass %s to a shell and never spawns", async (arg) => {
    exits(0);

    await expect(runYarn("/repo", [arg])).rejects.toThrow(`Refusing to pass ${arg} to a shell`);
    expect(spawn).not.toHaveBeenCalled();
  });

  it("joins output that arrives in several chunks, in order", async () => {
    fakeChild((child) => {
      child.stdout.emit("data", Buffer.from("one "));
      child.stderr.emit("data", Buffer.from("warn"));
      child.stdout.emit("data", Buffer.from("two"));
      child.emit("close", 0);
    });

    await expect(runYarn("/repo", [])).resolves.toEqual({ code: 0, stdout: "one two", stderr: "warn" });
  });

  it("reports exit code 1 when the process closes without a code", async () => {
    exits(null);

    await expect(runYarn("/repo", [])).resolves.toMatchObject({ code: 1 });
  });

  it("rejects when the process cannot be started", async () => {
    fakeChild((child) => child.emit("error", new Error("ENOENT")));

    await expect(runYarn("/repo", [])).rejects.toThrow("ENOENT");
  });
});

describe("runAction", () => {
  it("succeeds only on exit code 0 and logs stdout followed by stderr", async () => {
    exits(0, "out\n", "err\n");

    await expect(runAction("/repo", [])).resolves.toEqual({ ok: true, log: "out\nerr\n" });
  });

  it("fails without throwing on a non-zero exit", async () => {
    exits(2, "", "boom");

    await expect(runAction("/repo", [])).resolves.toEqual({ ok: false, log: "boom" });
  });
});

describe("runQuery", () => {
  it("parses stdout as JSON on success", async () => {
    exits(0, "{\"blocks\":3}");

    await expect(runQuery("/repo", [])).resolves.toEqual({ blocks: 3 });
  });

  it("throws the trimmed stderr on a non-zero exit", async () => {
    exits(1, "", "  bad version \n");

    await expect(runQuery("/repo", ["x"])).rejects.toThrow(/^bad version$/);
  });

  it("names the command and code when a failing run printed nothing to stderr", async () => {
    exits(3, "ignored");

    await expect(runQuery("/repo", ["taxonomy", "validate"])).rejects.toThrow("yarn taxonomy validate exited 3");
  });

  it("throws a parse error when a successful run prints something that is not JSON", async () => {
    exits(0, "Done in 1s");

    await expect(runQuery("/repo", [])).rejects.toThrow(SyntaxError);
  });
});
