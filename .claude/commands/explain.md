---
description: Explain what a file or function does, with worked input/output examples
argument-hint: <path/to/file.ts> [function name]
---

Explain `$1`. Focus on this function only, if given: $2

Read `$1` in full. Read a helper it calls only when its behavior changes the answer.
Change nothing.

## Output

Use these sections, in this order. Skip a section that would be empty.

### Job

One or two sentences: what the file is for, and who calls it. Say it in the caller's words,
not the implementation's.

### Flow

One numbered list per path through the code. A path is one early return or one branch of
the main decision. One step per line, in execution order. Name the function or field each
step reads.

### Examples

One example per path, and one for each edge case that returns something surprising (`[]`,
`undefined`, a skipped item). Each example is:

- a one-line title naming the situation,
- a `ts` block with a realistic input and the call,
- the output as a `// →` comment,
- one line saying why the output is what it is.

Use real names from this repo's domain (`Ruby Ring`, `gems/skill`, a foulborn unique),
not `foo` and `bar`. Trim inputs to the fields the code reads.

### Types

One line per type the file declares: what it holds, and who fills it.

### Rule status

List every function that breaks a code rule set in this session, one line each: the rule
and the function. Skip this section when no session rules exist.

## Rules

- Headers so the reader can skim. No preamble, no closing summary.
- Explain what the code does now, not what it was meant to do.
- If the code does something that looks wrong, say so in one line under the section where
  it shows. Do not fix it.
