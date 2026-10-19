# Panel rewrite: self-review

A from-scratch rewrite of `apps/admin-panel` as `apps/panel`, driven by the trained Router, Filler and Judge. The old panel is untouched, for comparison.

## What was measured

- **Time:** branch cut at 18:18, renderer committed at 18:34 (commit timestamps). That is wall clock for one session plus two parallel view agents, not a person-day estimate.
- **Models (run-5, real weights):** the first plan takes ≈6 s including model load. After that, each plan of one step takes 200–280 ms.
- **Device choice:** taken from your `predict-models` runs. Router and Judge run as fp32 on the CPU (≈33 ms p50). The Filler runs as q8_0 on Vulkan (≈155 ms p50 against 565 ms on the CPU, same accuracy), falling back to the CPU if Vulkan fails.

## Not verified

- **The window has never been opened.** Type-check and `electron-vite build` pass, but no click path has run. Your rule says I hand you the command.
- **The view components were written by two agents.** I checked that they type-check and use no inline styles, but I have not reviewed them line by line.
- **No tests**, per your rule. The pure core is where they would pay off first: `session.ts`, `session/patch.ts` and `agent/run-steps.ts`, with fake models.

## Architecture

| File | Owns |
| --- | --- |
| `contract.ts` | Every IPC channel: its zod input schema and its output type. One table, so a missing handler fails type-check. |
| `contract/command-schema.ts` | The nine commands as zod. Type assertions fail the build if it drifts from `@poe/panel-state`. |
| `session.ts`, `session/patch.ts` | The pure core. A command runs through the lib's `executeCommand`, and the entry logs the command plus a patch of before/after per touched category and item. Undo appends the inverse patch. |
| `version-store.ts` | Versions under `.s3/panel/`. The first run imports the promoted admin-panel version. A published version is never overwritten: saving one forks a draft. |
| `dispatcher.ts` | The one owner of the session. It runs everything serially, keeps proposed plans, and writes feedback. |
| `agent.ts`, `agent/run-steps.ts` | Model lifecycle, and the loop: Router → Filler → executor → diff summary → Judge, on a copy of the state. |
| `security.ts` | CSP, the `app://` scheme, navigation and permission lockdown, and the IPC sender check. |
| `logger.ts` | One JSON line per event in `.s3/panel/logs/<day>.jsonl`. |

## Your six questions

**Better than your code?** It's different in places that matter.
- **Typed seams:** the old panel validated nothing over IPC, and its handlers could throw raw errors.
- **One state model:** the old panel kept a second, older model of its own. This one uses `@poe/panel-state` directly.
- **Same model input as training:** the input formatting was copied in the old panel and now lives in `lib/agent-input`. The training rows were regenerated and come out byte-identical.

Where yours is better: you know the domain edge cases this code has never met.

**Maintainable?**
- Each feature is one file with its helpers beside it, and the core is pure.
- Adding a command means editing the lib, plus one zod entry, and type-check tells you if you forget.
- Debt: the three model loaders in `agent/` are copies of `apps/admin-panel/run-models/`. They can't sit in `lib/`, because they read files. This goes away when the old panel is deleted.

**Debuggable?**
- Every IPC call logs its channel, duration and outcome. Every command logs its payload.
- Every plan logs the full trace: each model's exact input text, its output, and its time.
- Feedback records carry the same trace, so a bad plan can be replayed against the same models outside the app.

**Industry practice?** It follows Electron's security checklist:
- `contextIsolation`, `sandbox`, no `nodeIntegration`, and `app.enableSandbox()`.
- A custom privileged scheme, with a path-traversal guard.
- A strict CSP in production: `script-src 'self'`, no inline styles, `connect-src 'none'`.
- Every permission denied, `window.open` denied, navigation off-origin blocked, and webviews blocked.
- Plus schema validation at the trust boundary.

**Feature speed?** The measured numbers are above. The rate came from parallelizing:
- I wrote the contract and the store first.
- Two agents then built the views on disjoint files against that fixed API.

**Security model:**
- The renderer is untrusted. It can only call the 11 channels, and each argument is validated with unknown keys refused.
- IPC from any frame other than the panel's own is refused.
- Approval sends a plan id, not a plan. Main keeps the plan the agent really proposed, so a compromised renderer cannot forge training feedback about what the agent said.
- The models run in main, on files under `.s3/agent-training/runs/<run>/export/`. The run name is regex-checked and must be an existing export.
- Not covered: the `.s3` folder itself is trusted. Anyone who can write there can change models or state.

## Decisions taken without asking

- **Storage moved to `.s3/panel/`.** The keyed state is stored as-is (`state.json`), and the log is commands plus patches. The old list format loses value types on a round trip, which is why it isn't reused. The admin panel's files are never written.
- **Feedback goes to `.s3/panel/agent-feedback/`.** Its shape differs from the old records, so `admin-panel:feedback-to-rows` would misread it.
- **The Items view lists `state.items`** (known items with tags), instead of the old cartesian product of seeder conditions.
- **A rejected step stays in the plan**, unchecked, so the reviewer sees what the Judge refused.
