# Output template

**The reader is a person who sat in the meeting and is not technical.** They followed the
discussion, they care what was decided, and they will not read a wall of text. Write meeting
notes, not a design document.

## How it reads

- **Short blocks.** No paragraph over three sentences. Most are one.
- **Lists over prose.** If it can be a bullet, it is a bullet.
- **One idea per line.** A line the reader has to re-read is a line to split.
- **No jargon without a plain-English gloss the first time.** `.filter` is fine once you say
  what it is.
- **A file path is a detail, not a sentence.** Put it in brackets at the end of the line, or
  leave it out. This document is not the implementation guide.
- **Every decision says what it was instead of what it is not.** "One store, in the shared
  folder." Not a paragraph weighing three options nobody chose.
- **No numbers counted from a snapshot.** Not "thirteen features, nine risks."
- Blank line between blocks. White space is what makes it readable.

## Structure

````markdown
# <Feature name>

## The goal

<Two or three sentences. What the person wants and why. No implementation.>

## What you end up with

<What is different once this exists, from the point of view of someone using it.>

- <bullet>
- <bullet>

**What it does not do:** <one line, the things people would assume are included>

## What we decided

One block per decision made in the conversation. Newest thinking, not the path to it.

### <The thing decided>

**Decided:** <one line>

**Why:** <one line>

### <The next thing>

...

## Still open

One block per question nobody answered.

### <The question>

<One line on what hangs on it. Say whether it blocks the work or can wait.>

## Watch out for

One block per real risk. Plain English, no severity ratings.

### <What could go wrong>

<When it happens, and what it costs. Two lines at most.>

## The pieces of work

A table. One row per thing that could be built and checked on its own.

| # | What | Done when |
| --- | --- | --- |
| 1 | <short name> | <how you can tell it works> |

## Notes for whoever builds it

The technical detail, out of the reader's way. Bullets, file paths allowed here.

- <bullet>

## What this was based on

<One line: what was read. One line: what was assumed rather than checked.>
````
