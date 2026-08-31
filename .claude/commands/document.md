---
description: Write or refresh a package's README.md from its actual source — plan first, then write
argument-hint: <tier/name> [section to focus on]
---

Document `$1`. Extra focus, if given: $2

`$1` is a path from the repo root, tier included — `lib/item-parser`, `services/ggg`,
`apps/item-inspect`. The tier is part of the argument because the same name can only exist
in one of them, and guessing which is how the wrong file gets rewritten.

Target file is `$1/README.md`.

**Refuse to document anything under `packages/`.** That tier is deprecated POC code being
deleted, and each folder already carries a `DEPRECATED.md` saying so. Say that instead of
writing a README for it.

## Step 1 — read the package, stop

Read, in this order:

1. `$1/package.json` — name, `exports` map, deps, scripts.
2. Every `.ts` at the package root and one level down. Skip `.test.ts` unless a test is
   the only place a behavior is spelled out.
3. `$1/.env` (or `.env.example`) — var names only. Only an app has one; under `lib/` and
   `services/` its absence is the point, and a README there should say the package reads
   no environment rather than listing nothing.
4. `$1/docs/`, and any `.mmd` beside the file it draws — every one, and what it depicts.
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

1. **Package name** — the real `name` from package.json as an `#` heading, one line. It is
   not derivable from the directory: `services/ggg` is `@poe/ggg`, `lib/cache` is
   `@util/cache`. A package with no package.json has no name — say that instead of
   inventing one.
2. **Description** — one sentence. What it is. No verbs like "provides" or "handles".
3. **Purpose** — 2–4 sentences. Which problem it solves, and where it stops — what it
   leaves to the caller. State the boundary as a plain fact about the package.
4. **Structure** — a tree of the real files, one trailing comment per file saying what
   lives there. Only files that exist. Directories with one job get one line, not a
   sub-tree.
5. **Public API** — table: entry point (as written in an importing package, e.g.
   `@poe/ggg/call`) → exported symbols → one-line contract. Every row must come from
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
   secret; use a placeholder. Say where it comes from: `$1/.env` if that file
   exists, otherwise whatever the consuming package loaded with `--env-file`, since
   `requireEnv` throws at first use rather than at import.
8. **Gotchas** — the constraints that break things silently when violated: shared
   rate limits, unstable ids, ordering requirements, caches that must be invalidated
   together. Each entry states the trap and the consequence. If there are none you can
   name from the source, omit the section — do not pad it.
9. **How to run** — the literal commands, one fenced `bash` block each, with a line above
   saying what it does. Include the `--env-file` flag when the entry point needs env.
   End with `yarn typecheck`.
10. **Diagrams** — where they live (`$1/docs/`, or beside the file they draw), a table of file → what it shows,
    and the one-line note that they are Mermaid `.mmd`, rendered by any Mermaid viewer.
    If a diagram no longer matches the code, say so in this section — do not edit the
    `.mmd`. Fixing a diagram is a separate request.

## Rules

- **Source is the only authority.** Not the old README, not CLAUDE.md, not commit
  messages. If the code and a doc disagree, the code wins and the doc line dies.
- **No aspirational text.** Present tense, describing what is there today. Nothing about
  what the package will support.
- **Write what it is, never what it is not.** State the decision as a fact about the
  package: "the limiter allows one request at a time". Do not argue with alternatives
  the reader never suggested — no "X, not Y", no "rather than", no defending a choice.
  A reason belongs in a line only when it changes how the reader uses the thing, and it
  is written as another fact, not as a justification.
- **Written for a mid-level developer.** Plain words. If an everyday word says the same
  thing, use it instead of the term of art. A term the code itself uses (limiter, job,
  lock) stays; explain it the first time in half a sentence.
- **Open with what the thing does.** No status line, no disclaimer, no note about how
  finished it is.
- Terse. Fragments fine. No "simply", "just", "powerful", "robust", "seamlessly".
- Every path, symbol, command and env var must be copy-pasteable and correct.
- Do not touch source files, `.env`, or `.mmd` files. This command writes one README.
- Any file outside `$1/README.md` that needs a change: name it in one line at
  the end and stop.
- Run `yarn typecheck` after writing if any snippet was lifted from source and edited —
  a snippet that would not compile is a broken doc.
