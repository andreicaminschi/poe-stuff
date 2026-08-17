---
description: Write or refresh a package's README.md from its actual source — plan first, then write
argument-hint: <package-name> [section to focus on]
---

Document `packages/$1`. Extra focus, if given: $2

Target file is `packages/$1/README.md`.

## Step 1 — read the package, stop

Read, in this order:

1. `packages/$1/package.json` — name, `exports` map, deps, scripts.
2. Every `.ts` at the package root and one level down. Skip `.test.ts` unless a test is
   the only place a behavior is spelled out.
3. `packages/$1/.env` (or `.env.example`) — var names only.
4. `packages/$1/docs/` — every `.mmd` and what it depicts.
5. The existing `README.md`, last. Read it to find what is now false, not to reuse it.

Then output ONLY:

- The section list below, each with a one-line note on what it will say.
- A **Stale** list: every line in the current README contradicted by the source, with the
  file that contradicts it.
- A **Can't tell** list: anything the source does not answer (why a constant has that
  value, which endpoint a var points at). One question each.

Stop and ask for approval. Do not write the README yet.

## Step 2 — write the approved README

Only after approval. Write exactly the approved sections — no bonus sections, no
"Future work", no "Contributing".

Answer the **Can't tell** questions from the user's replies. If a question went
unanswered, write the section without that claim rather than guessing.

## Sections, in order

1. **Package name** — `# @poe-stuff/$1` (the real `name` from package.json), one line.
2. **Description** — one sentence. What it is. No verbs like "provides" or "handles".
3. **Purpose** — 2–4 sentences. Which problem it solves, and what it deliberately does
   NOT do. The boundary is the useful half.
4. **Structure** — a tree of the real files, one trailing comment per file saying what
   lives there. Only files that exist. Directories with one job get one line, not a
   sub-tree.
5. **Public API** — table: entry point (as written in an importing package, e.g.
   `@poe-stuff/$1/call`) → exported symbols → one-line contract. Every row must come from
   the `exports` map in package.json. An export that is missing from that map is a bug —
   list it under a **Not exported** note instead of inventing a path.
6. **Examples** — 3–5 snippets, each solving a different real result. Rules:
   - Runnable as written: real import paths, real symbol names, `.ts` extensions on
     relative imports, `import type` for types.
   - One goal per snippet, with a `###` heading naming the goal ("Fetch one page",
     "Retry after a rate-limit penalty"), not the function.
   - Show the call and what comes back. Elide setup with `// …` only when it is obvious.
   - No pseudo-code, no `foo`/`bar`. Use values this package would really see.
7. **Environment** — table: var → what it holds → example value. Never print a real
   secret; use a placeholder. Say which file it lives in: `packages/$1/.env`.
8. **Gotchas** — the constraints that break things silently when violated: shared
   rate limits, unstable ids, ordering requirements, caches that must be invalidated
   together. Each entry states the trap and the consequence. If there are none you can
   name from the source, omit the section — do not pad it.
9. **How to run** — the literal commands, one fenced `bash` block each, with a line above
   saying what it does. Include the `--env-file` flag when the entry point needs env.
   End with `yarn typecheck`.
10. **Diagrams** — where they live (`packages/$1/docs/`), a table of file → what it shows,
    and the one-line note that they are Mermaid `.mmd`, rendered by any Mermaid viewer.
    If a diagram no longer matches the code, say so in this section — do not edit the
    `.mmd`. Fixing a diagram is a separate request.

## Rules

- **Source is the only authority.** Not the old README, not CLAUDE.md, not commit
  messages. If the code and a doc disagree, the code wins and the doc line dies.
- **No aspirational text.** Present tense, describing what is there today. Nothing about
  what the package will support.
- Terse. Fragments fine. No "simply", "just", "powerful", "robust", "seamlessly".
- Every path, symbol, command and env var must be copy-pasteable and correct.
- Do not touch source files, `.env`, or `.mmd` files. This command writes one README.
- Any file outside `packages/$1/README.md` that needs a change: name it in one line at
  the end and stop.
- Run `yarn typecheck` after writing if any snippet was lifted from source and edited —
  a snippet that would not compile is a broken doc.
