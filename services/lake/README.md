# @poe/lake

JSON files under one root folder, addressed by `/`-joined keys. The local stand-in for
object storage.

## Purpose

Every app reads and writes `.s3` through this service rather than through a copy of its own.
It owns how bytes are stored. It does **not** own where things live: each app keeps its own
key layout, because that layout is the app's contract with its readers.

## Public API

| Import | Exports | Contract |
| --- | --- | --- |
| `@poe/lake/service` | `createLakeService` | Takes an optional `root` (default `.s3`). Returns a `Lake`. |
| `@poe/lake/types` | `Lake`, `LakeServiceOptions` | Types only. |

`Lake` has `readJson`, `writeJson`, `writeJsonAtomic`, `exists`, `list` and `clear`.

## Gotchas

- **Keys are `/`-joined everywhere.** `join` turns them into paths, which is what makes the
  same key work on Windows and on a bucket.
- **`writeJsonAtomic` writes a sibling temp file and renames it**, so a reader sees the whole
  old file or the whole new one. S3 has no rename, and will need its own answer here.
- **`readJson` rejects on a missing key.** Check `exists` first when absent is an answer.
- **Files are indented**, so they can be read in an editor while a run is going.

## How to run

```bash
yarn test services/lake
```
