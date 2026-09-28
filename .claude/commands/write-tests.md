---
description: Write jest tests for a file — edge cases and real behavior, not type-provable trivia
argument-hint: <path/to/file.ts> [specific function or concern]
---

Write tests for `$1`. Extra focus, if given: $2

## Step 1 — plan first, stop

Read `$1` in full. First list the unit's **contract**: each promise its doc comment, name
and callers rely on, one numbered line each. Mark every branch or decision in the code that
no contract line covers.

Then output a `describe`/`it` skeleton: nested describes, one `it("...")` line per
behavior, no bodies. Group by exported symbol, then by method.

Next to each `it`, note in a trailing comment which contract line it proves and what makes
it non-obvious — the boundary, the interleaving, the state that has to survive. An `it` that
proves no contract line is cut. A branch left without an `it` is named on its own line. If
a behavior can't be tested without a production change, say so on its own line and propose
the smallest change.

Then stop and ask for approval. Do not write the test file yet.

## Step 2 — implement the approved skeleton

Only after approval. Implement exactly the `it`s that were approved — no bonus tests.

## What is worth a test

A test earns its place if it can fail for a reason TypeScript cannot see.

Test:

- **Boundaries.** `max - 1`, `max`, `max + 1`. Exactly-at-the-edge vs one past it.
  Off-by-one lives here and nowhere else.
- **Degenerate input.** Empty array, empty string, `0`, negative, single element.
  These are behavior, not shape — TS types them fine and they still break.
- **Ordering and concurrency.** Parallel calls, interleaved calls, re-entrancy,
  calls that resolve out of order. Assert the observable sequence, not just the last value.
- **State across calls.** Call a setter mid-flight. Does in-progress work see old or new
  state? Pick the answer the code claims and pin it.
- **Error paths.** A rejection propagates to the right caller, and internal state is
  still usable afterward.
- **Time.** Clock at a window edge, long idle gap, repeated calls inside one tick.

Do NOT test:

- **Shape the compiler already proves.** No `typeof x === "function"`, no "returns an
  object with keys a, b, c". If TS would reject the wrong version, skip it.
- **The mock.** If the assertion only proves your stub was called, delete it.
- **Implementation detail.** Assert what a caller can observe. Private counters,
  internal arrays, and call order of helpers are not the contract.
- **Restatements of the code.** A test that mirrors the implementation line for line
  fails only when the code changes, never when it breaks.
- **The fixture's size.** No `toHaveLength(3)` when 3 is only how many values the fixture
  happens to hold. A count is a contract only when a rule sets it.
- **A dependency's behavior.** If the result is right because an imported function works,
  that function's own package tests it.

## Rules

- One behavior per `it`. One scenario too: no second call with its own assertions.
- Assert against the expected value, built in the test. Compare the item or entry itself,
  not a count or `result[0]`.
- Build the input so only the behavior under test separates right from wrong. Hold every
  other field equal, so the test can't pass through some other difference.
- **Names must read like documentation, not labels.** Someone who has never opened the
  source should learn what the unit does by reading the `describe`/`it` list top to
  bottom. This is a requirement, not a style preference — a correct test with a cryptic
  name is not done.
  - Full sentence, plain English, present tense, subject first. No method names, no
    parameter names, no `max+1`, no jargon lifted from the implementation.
  - Say the _situation_ and the _consequence_, in the caller's words:
    `it("makes the fourth request wait until the first one is an hour old")`
    not `it("delays call max+1 until oldest hit exits window")`.
  - Name real quantities instead of variables: "the fourth request", "one hour",
    "after a 30-second penalty" — the numbers are what make it concrete.
  - The trailing `//` comment carries the mechanism and the reason it's non-obvious.
    Keep that split: sentence teaches the behavior, comment explains the trap.
- Deterministic. No real waiting, no `Date.now()` drift, no network, no filesystem.
- Never mock the unit under test. Mock only what it reaches out to.
- Prefer real inputs over fixtures-with-magic-values. If a number matters, name it.
- Arrange/act/assert with blank lines between. No comments restating the code.

## Project conventions

- Test file sits next to the source: `$1` → same dir, `.test.ts`.
- Jest. `import { describe, it, expect, jest } from "@jest/globals";`
- Relative imports keep the `.ts` extension (type stripping — see CLAUDE.md).
- No `enum`, no `namespace`, no constructor parameter properties in test helpers either.
- Fake time with `jest.useFakeTimers()` — it fakes `setTimeout` **and** `Date.now`
  together. Advance with `await jest.advanceTimersByTimeAsync(ms)`, never the sync
  `advanceTimersByTime`, because the sync version does not flush the microtasks
  between an awaited `sleep` and the code that resumes after it. Restore in `afterEach`.
- Run `yarn typecheck` when done. Type errors in tests are real failures.
