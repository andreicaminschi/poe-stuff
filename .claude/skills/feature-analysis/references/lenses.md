# Lenses

Question banks. Pick the lenses the feature actually touches — running all of them
produces a survey, not an analysis.

Every question here is a question to the user. Anything the repository answers, answer
yourself and do not ask.

## 1. Boundary — what is and is not in it

- What is the smallest version of this that is still worth having?
- Name one thing people will assume it does that it will not.
- Does this replace something, or sit beside it? If beside, what decides which one is used?
- Who uses it — you alone, a team, an end user, another program?
- Is it a one-off or does it run repeatedly?

## 2. Placement — where the code lives

- Which existing tier, layer or package does it belong to under the project's own rule?
- Does it need the environment, the filesystem, or the network? That usually decides the tier.
- Does it have a `main()`, or is it imported?
- If it fits no existing tier, is it a new tier or is the feature two features?

## 3. Data and state

- What does it read? What does it write? Name each store.
- Who else reads what it writes, and can they cope with the new shape?
- Is any of it a schema? A schema change means a migration and a version.
- What happens to data written by the version before this one?
- Is there a single writer, or can two writes race?

## 4. Coupling — what it links to

- Which existing packages must change for this to work? List them.
- Does anything currently pure gain a dependency on something impure?
- Does it invert an existing direction of dependency?
- What outside service does it call, and what is the behaviour when that service is down?
- Does it need a rate limiter, a cache, or credentials that do not exist yet?

## 5. Inconsistency — where it fights the existing design

- Which stated rule in `CLAUDE.md` does this feature strain?
- Does it duplicate something the repo already does differently elsewhere?
- Does it introduce a second source of truth for anything?
- Does it need a concept the codebase has no word for yet? Name the concept.
- Does an existing abstraction have to grow a special case for it?

## 6. Failure

- What is the worst thing a wrong input produces?
- Is any operation destructive or irreversible? What guards it?
- What is the recovery path when it fails halfway?
- Does a failure here corrupt something downstream, or just stop?
- How does the user find out it failed?

## 7. Verification

- How does the user know it worked, in one command?
- What is testable without the network?
- What can only be checked by looking at the output by hand?
- Is there an existing test suite this fits into?

## 8. Sequencing

- What must exist before step one is possible?
- What is the first slice that is independently useful?
- What can be deferred without redesigning the first slice?
- What decision, if deferred, has to be unpicked later?

## 9. Cost and drag

- What does this add that has to be maintained forever?
- Does it add a dependency, a build step, or a service to run?
- What does it make harder to change later?
- If it were never built, what would the user do instead?
