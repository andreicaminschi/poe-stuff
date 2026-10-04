# training

Trains the admin panel's agent models from generated rows, then measures them the way the
panel runs them. Python runs in a Podman container on the GPU. The benchmark runs in Node on
the host, with the same libraries Electron loads.

Generate a named version's data, then train and export both models from scratch. `--count` is
examples per goal and form (default 50). `--name` is the folder under `.s3/training/`, so one
methodology can be trained at several sample sizes side by side:

```bash
yarn agent:train --name count-50 --count 50
```

`--qlora` trains the filler on 4-bit base weights through Unsloth: much less GPU memory, a small
accuracy risk. Compare its `agent:eval` args score with a bf16 run at the same count.

```bash
yarn agent:train --name qlora-50 --count 50 --qlora
```

`--dropout` sets the filler's LoRA dropout (default `0.05`). At `0`, Unsloth uses its fused
kernels, which are faster.

Score it. `--device gpu` runs the quick eval on the GPU (default `cpu`). Add `--e2e` for the full
end-to-end benchmark:

```bash
yarn agent:eval --name count-50
```

```bash
yarn agent:eval --name count-50 --device gpu
```

```bash
yarn agent:eval --name count-50 --e2e
```

`agent:train` regenerates the data and deletes the version's `output/` first. After a crash,
`bash apps/training/run-all.sh <name>` resumes: it skips every finished step.

## Pipeline per version

| Step | Runs | Reads | Writes |
|---|---|---|---|
| `train_decide.py` | container | `training-data/train/stop`, `choose` | `output/decide/`, the LoRA adapter |
| `train_fill.py` | container | `training-data/train/fill` | `output/fill/`, the LoRA adapter |
| `export.py` | container | both adapters | `output/runtime/`: `decide-fp32.onnx`, `decide-int8.onnx`, `fill-q8_0.gguf` |
| `yarn admin-panel:eval-adapters` | host, Node | `output/runtime/`, `training-data/<split>/stop`, `choose`, `fill` | `output/eval-<split>-<device>-decide-<precision>.json` |
| `yarn admin-panel:benchmark-agent` | host, Node, only with `agent:eval --e2e` | `output/runtime/`, `training-data/<split>/request` | `output/benchmark-<split>-<device>-decide-<precision>.json` |

The rows come from `yarn admin-panel:generate-training`. See the admin panel's generator.

## Methodology

**Training never checks itself.** The train scripts read only the `train` split and run no
validation. Every accuracy and speed number comes from the exported models in Node, on eval
splits only.

**Two tests: a quick one every run, a full one on demand.**

| Test | Checks | Size | Runs |
|---|---|---|---|
| Quick eval | each model against its own labels: "done?", the next command, the args | 3 rows per goal and form (`--per-pair`), about 2 minutes | `yarn agent:eval` |
| End-to-end benchmark | the whole loop, request by request | every request | `yarn agent:eval --name <name> --e2e` |

The quick eval feeds every row the right context and history, so a miss belongs to one model.
The end-to-end benchmark does not.

**The end-to-end benchmark runs the panel's own loop.** `apps/admin-panel/run-agent.ts` asks "done?",
picks the next command, fills its params, and runs it through the real `executeCommand`,
until it stops. The benchmark gives it each request's start state and query, and nothing
else: no correct context, no correct history. A wrong turn feeds the next one, as it would
in the panel.

**A request passes when the final state equals the expected one.** Order inside lists is
ignored, so equivalent params pass. Each failure gets one verdict:

| Verdict | Meaning |
|---|---|
| `stopped before acting` | said done on turn 0 when work was needed |
| `wrong turn count` | stopped after too many or too few commands |
| `wrong final state` | stopped on time, but the panel differs |
| `invalid json` | the filler's answer did not parse |
| `command failed` | the executor refused the command, e.g. a name that does not exist |
| `turn limit` | never said done |

**Eval splits, hardest last.**

| Split | Wording | Names |
|---|---|---|
| `eval` | the training patterns | new Faker names, another seed |
| `unseen` | patterns training never saw | new Faker names, another seed |

A hand-written split of real queries is planned. It is the only real-world measure.

**Speed and memory are measured in the deployment runtime.** The decision model runs in
`onnxruntime-node`: DirectML on GPU, CPU otherwise. The filler runs in `node-llama-cpp` with
its output locked to JSON. Each report gives p50, p95 and max latency per stop decision, per
choose decision (every command scored in one batch), per fill and per whole request, plus model
load time, peak process RAM and GPU memory used. The CPU run scores an even sample of
`CPU_LIMIT` requests per split.

## Gotchas

- `decide-int8.onnx` loses accuracy and is slower on DirectML. The benchmark defaults to fp32.
- The prompts live twice: `rows.py` for training and `apps/admin-panel/run-agent/prompts.ts`
  for the panel. A difference between them costs accuracy without any error.
- ModernBERT calls `torch.compile`, and the image has no C compiler. Load it with
  `reference_compile=False`.
