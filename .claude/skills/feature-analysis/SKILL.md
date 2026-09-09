---
name: feature-analysis
description: Work out what a feature would mean before it is built — its real scope, where it touches the existing system, what breaks, what it depends on, and what it silently assumes. Ends with an LLM-friendly feature set the user can hand to an implementation session. Use when the user describes a feature they are considering and wants to understand it rather than build it. Trigger phrases - "what would it mean to", "help me think through", "feature analysis", "risks and dependencies", "before I build".
---

# Feature analysis

Turn a one-line feature idea into readable notes: the goal, what you end up with, what
was decided, what is still open, and what to watch out for.

**Write it as meeting notes for someone who is not technical.** They sat through the
discussion. They want to know what was settled, not how it will be built.

**This skill never writes production code and never edits the project.** It reads the
repository and it writes one analysis document. Nothing else.

## Mode

Interactive by default. Ask in rounds, one round per message, and stop for the answer.

Go one-shot — read, analyze and write the document with no questions — only when the
user says so ("one-shot", "no questions", "just write it"). In one-shot mode every
open question becomes a line in the **Open questions** section instead of a message.

## Process

### 1. Ground yourself in the repo

Read before asking anything. The user should not have to explain their own codebase.

- `CLAUDE.md` at the root, and any nested ones.
- The directory layout — which tiers or layers exist, and what the rule for placement is.
- `README.md` of the packages the feature name points at.
- `techdebt.md`, `docs/`, or an equivalent, if present.

Do not read the whole tree. Read what the feature plausibly touches, then stop.

### 2. Restate the feature in one paragraph

Say back what you understood the feature to be, in the project's own vocabulary. Name
the packages it lands in. Get this wrong and everything after it is wrong, so put it
first and keep it short.

### 3. Interrogate, in rounds

Pull questions from [references/lenses.md](references/lenses.md). Each round:

- At most 5 questions. Number them.
- One idea per question. No compound questions.
- Skip any question the repo already answers — answer it yourself in one line and move on.
- State an assumption instead of asking, when a wrong guess is cheap to undo.

Three rounds is normal. Stop when a further round would only produce detail the user
would decide during implementation anyway.

### 4. Write the feature set

Use [references/output-template.md](references/output-template.md) exactly.

Ask where to write it before writing. Default to a path outside the repository unless
the user names one inside — an analysis document is not a deliverable of the project.

## Voice

The document is notes, not prose. It must be skimmable in a minute.

- Short blocks. Nothing over three sentences. Most are one.
- Lists over paragraphs.
- Plain words. Explain a term the first time or drop it.
- No preamble, no summary, no closing offer.
- No hedging that carries no uncertainty. Keep hedges that do.
- No numbers counted from a snapshot — not "thirteen features, four risks".
- Blank lines between blocks. White space is the readability.

Detail that only an implementer needs goes in one section at the end, not scattered
through the notes.

## Rules

- **Findings, not advice.** "The admin panel writes versions; `apps/catalog` reads only
  `latest`. Publishing from a UI has no promotion step." Not "you should add a promotion
  step."
- **Name the file.** Every claim about the existing system cites a path. A claim with no
  path is a guess and must be marked as one.
- **Separate what you read from what you inferred.** The user must be able to tell them
  apart at a glance.
- **Do not design the implementation.** Interfaces, schemas and function names are the
  next session's job. This one produces the constraints that session has to satisfy.
- **Track every clarification.** A question the conversation answered becomes a decision
  in the notes, with the reason. A question it did not answer becomes an open one. Nothing
  the user settled may go missing.
- **A risk needs a trigger and a cost.** "Concurrent publishes overwrite each other —
  two editors, last write wins, the earlier version is unrecoverable." A risk with
  neither is a mood.
- **Report what is missing.** If the repo does not answer a question, say the repo does
  not answer it. Do not fill the gap with a plausible-sounding answer.
