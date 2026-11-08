# How the agent is trained

The panel's agent is three small models trained on synthetic data. Nothing a person typed is in
the training set: every example is generated from the real panel state and checked against the
real executor. This file covers how that data is built, how each model is trained, and how a
trained run reaches the panel. [README.md](../README.md#agent) says what the agent does.

Code: `apps/agent-training`. The model input format is shared with the panel through
`lib/agent-input`, so training and runtime read the same text.

## Terms

| Term                   | Meaning here                                                                                                 |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ |
| Classifier             | A model that picks one label out of a fixed list. The Router and the Judge are classifiers.                  |
| Encoder                | A model that reads text and outputs one vector per token, without generating. Good and cheap at classifying. |
| Fine-tune              | Continue training a published model on your own examples so it learns your task.                             |
| LoRA                   | Fine-tuning that trains small added weight matrices and leaves the base model frozen. Cheap and quick.        |
| Epoch                  | One pass over every training row.                                                                            |
| Macro-F1               | F1 per label, averaged with every label weighted the same, so a rare label counts as much as a common one.   |
| Early stopping         | Stop training once the score on held-back data stops improving, and keep the best epoch.                      |
| Class weighting        | Make mistakes on rare labels cost more in the loss, so the model does not just learn the common label.        |
| ONNX, GGUF             | File formats for running a model outside Python. ONNX for the classifiers, GGUF for the Filler (llama.cpp).   |
| Quantization (`q8_0`)  | Storing weights in fewer bits. Smaller and faster, at a small cost in accuracy.                              |

## The three models

| Model  | Base                         | Training                                 | Reads                                           | Answers                                               |
| ------ | ---------------------------- | ---------------------------------------- | ----------------------------------------------- | ----------------------------------------------------- |
| Router | `jhu-clsp/ettin-encoder-150m` | Full fine-tune, class-weighted           | The request, the context and what is done       | A command type, `already-done` or `rephrase`          |
| Filler | `unsloth/Qwen3-0.6B`          | LoRA through Unsloth, loss on answer only | The Router's input plus the chosen command type | That command's params as JSON                         |
| Judge  | `jhu-clsp/ettin-encoder-150m` | Full fine-tune, class-weighted           | The request, what is done, and this step's diff | `accept`, `complete` or `reject`                      |

Splitting the work this way is the **router–worker** pattern: a cheap classifier picks which tool
to call, and a separate generator fills in that one tool's arguments. The Judge adds
**generate-and-verify**: one model proposes a step, the executor runs it, and a separate model
checks the result before the next step.

## Step 1: scenarios

`yarn agent:scenarios` builds scenarios off the promoted panel state at
`.s3/admin-panel/versions/latest/categories.json`. A scenario is one thing a user might want:

- a **request** in plain English, such as `Tag Rings and Belts as chase`;
- a **setup**: commands that put the state where the user had it;
- the **steps**: the commands that fulfil the request, in order.

Each scenario kind is one builder in `build-scenarios/`. They cover tagging, conditions, known
items, creating, renaming, moving, merging and deleting, multi-step requests, requests already
satisfied (`already-done`, `partly-done`), and requests the agent must turn back (`too-many`,
`unknown-name`, `off-topic`).

Every scenario is **played** through the real `executeCommand` before it is kept. A command the
executor refuses, or a step that changes nothing, throws the scenario away and the builder tries
the next seed. So no example ever teaches a plan that cannot run.

One request in four gets typos, only in template words. Names and values stay spelt right, and
`clean` keeps the request without typos. Everything is seeded: one `--seed` always gives the same
scenarios.

## Step 2: rows

`yarn agent:rows` cuts scenarios into one JSONL file per model under
`.s3/agent-training/<name>/`, plus `rows-review.md` with the first scenario of each kind and every
row cut from it.

| Model  | One row per                                      | Label                                                                  |
| ------ | ------------------------------------------------ | ---------------------------------------------------------------------- |
| Router | step, or one per scenario with no steps          | The step's command type, or `already-done` / `rephrase`                |
| Filler | step                                             | The step's params as JSON                                              |
| Judge  | step, plus one wrong step drawn for it           | `accept`, `complete` on the last step, `reject` on the wrong one       |

The Judge's rejects are built by mutating the correct command: an unrelated step from another
scenario, or the wrong target, value, coverage or action. Each mutation is run for real, and one
that reads the same as the correct step is redrawn. Each reject row records its `mutation`, so the
scorer can report which kinds of mistake the Judge catches.

The Judge never sees raw state. It reads `@util/diff-summary`'s plain lines, such as
`24/25 seeders in Bases: tag chase added (not: Amulets)`.

### Splits

`--split=train` drops held-out scenarios. `--split=eval` writes `seen/` and `held-out/` sets.

- One request **template** in five is held out: the request with every name and value masked.
- One **seeder name** in ten is held out.

Both are fixed by a hash, so the same templates and names are held out in every run. `held-out/`
measures whether a model handles wording and names it never trained on. Build eval sets with a
different `--seed` from the train set.

## Step 3: training

`apps/agent-training/train.sh` trains all three in the `localhost/poe-training` Podman image:

```bash
podman build -t poe-training apps/agent-training
```

```bash
CONFIG=baseline bash apps/agent-training/train.sh run-7 train-5 val-5/seen eval-5/seen eval-5/held-out
```

The arguments are the run name, the train set, the validation set, then any eval sets.
`ONLY=router|judge|filler` trains one. `CONFIG=baseline` fills every setting you did not type
from `train/baseline.env`, the settings new runs are compared against.

- **Router and Judge** (`train/train_classifier.py`): full fine-tune with class-weighted
  cross-entropy. After each epoch it scores validation macro-F1, keeps the best epoch, and stops
  after `PATIENCE` epochs with no gain.
- **Filler** (`train/train_filler.py`): LoRA on every attention and MLP projection. The loss
  covers only the JSON answer, not the prompt. It stops at the first epoch whose validation loss
  does not improve, capped at `FILLER_EPOCHS`.

After training, each model predicts every set into
`.s3/agent-training/runs/<run>/<model>/predictions/<set>.jsonl`.

The Filler's predictions use generate-and-verify. It decodes greedily first. An answer that
fails the check gets sampled candidates, and the first one that passes replaces it. The check
requires valid JSON, conditions and value sets that exist, and every name, tag and value it
writes appearing in the input.

## Step 4: scoring

```bash
yarn agent:score --run=run-7
```

`score-run-cli.ts` writes `.s3/agent-training/runs/<run>/report.md`:

- Router and Judge: accuracy, macro-F1 and recall per label.
- Judge: caught rejects per mutation kind.
- Filler: **execution match**. It rebuilds each set's scenarios from the set's manifest, runs the
  predicted command through the real executor on that step's state, and compares the result with
  the correct command's result. Two different JSON answers that do the same thing both count.

## Step 5: export

```bash
bash apps/agent-training/export.sh run-7 val-5/seen
```

Writes `.s3/agent-training/runs/<run>/export/`:

- the Router and Judge as ONNX, fp32 and fp16, with logits as the only output;
- the Filler's LoRA merged into its base and written as GGUF, f16 and q8_0;
- the encoder's tokenizer files and `export.json`, which names each file, its labels and the
  Filler's prompt.

Each ONNX file then labels the validation set on the CPU, and the export prints how often it
agrees with Podman's predictions.

## How the panel runs it

`apps/panel` lists every exported run under `.s3/agent-training/runs/`. The picked run loads on
its first plan, and one run is loaded at a time.

| Model           | Runs as                | On                                      |
| --------------- | ---------------------- | --------------------------------------- |
| Router, Judge   | fp32 ONNX, `onnxruntime-node` | CPU, measured faster than DirectML here |
| Filler          | q8_0 GGUF, `node-llama-cpp`   | Vulkan, falling back to the CPU         |

At runtime the Filler decodes greedily inside a JSON grammar built from its command's params, so
it cannot write JSON the command would refuse.

## Not built

- **Feedback into training.** The panel keeps every reviewed plan in `.s3/panel/agent-feedback/`.
  Nothing turns those records into training rows yet.
- **A way to predict eval sets in Node.** The old panel's `predict-models` did this and was
  deleted. Scoring reads Podman's predictions only.
