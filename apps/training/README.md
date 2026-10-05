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

`--decide-model` and `--fill-model` pick the Hugging Face bases. `--encoder-precision fp32|fp16`
and `--fill-quant q8_0|q4_k_m` set the exported size; both default to full size.

```bash
yarn agent:train --name ettin-lfm2 --count 100 --decide-model jhu-clsp/ettin-encoder-150m --fill-model LiquidAI/LFM2-350M
```

`--dropout` sets the filler's LoRA dropout (default `0`, Unsloth's fused kernels). The filler
trains plain LoRA on the bf16 base.

Score it. The quick eval runs on the GPU, as the panel does; `--device cpu` runs it on the CPU. Add `--e2e` for the full
end-to-end benchmark:

```bash
yarn agent:eval --name count-50
```

```bash
yarn agent:eval --name count-50 --device cpu
```

```bash
yarn agent:eval --name count-50 --e2e
```

`agent:train` regenerates the data and deletes the version's `output/` first. After a crash,
`bash apps/training/run-all.sh <name>` resumes: it skips every finished step.

## Pipeline per version

| Step | Runs | Reads | Writes |
|---|---|---|---|
| `train_encoder.py <v> stop\|choose\|entry\|intent` | container | `training-data/train/<adapter>` | `output/<adapter>/adapter.safetensors`: LoRA A/B and the heads |
| `train_fill.py` | container | `training-data/train/fill`, `tools.json` | `output/fill/`, the LoRA adapter |
| `export.py` | container | every adapter | `output/runtime/`: `encoder-base.onnx`, one `<adapter>.safetensors` each, `fill.gguf`, `fill-prompt.json` |
| `yarn admin-panel:eval-adapters` | host, Node | `output/runtime/`, `training-data/<split>/*` | `output/eval-<split>-<device>.json`, every miss included |
| `yarn admin-panel:benchmark-agent` | host, Node, only with `agent:eval --e2e` | `output/runtime/`, `training-data/<split>/request` | `output/benchmark-<split>-<device>.json` |

The rows come from `yarn admin-panel:generate-training`. See the admin panel's generator.

## Models

One encoder, loaded once, runs four LoRA adapters. Each adapter has its own data, LoRA and
direct-label heads, over the mean-pooled encoder output.

| Adapter | Heads |
|---|---|
| stop | nothing needed / work needed. Code reads "nothing needed" as already applied before any command, applied after one |
| choose | action: create / delete / update / move / rephrase. target: category / seeder / seeders / items |
| entry | single / multi / bulk |
| intent | single / multi |

The context describes each name the request holds. The encoder adapters read it as `key: value`
lines, one block per name. The filler reads the same entries as a JSON array
(`format-context.ts`).

Choose returns rephrase when it is the top action, else the real command whose action ×
target probability is highest (`command-parts.ts`).

The filler fills one tool. Each command exports a `params` list typed against its command;
`list-tools.ts` turns it into the prompt's field list and a JSON schema grammar that also allows
`{"refuse": …}`. A refusal ends the run as `refused`.

## Methodology

**Training never checks itself.** The train scripts read only the `train` split and run no
validation. Every accuracy and speed number comes from the exported models in Node, on eval
splits only.

**Two tests: a quick one every run, a full one on demand.**

| Test | Checks | Size | Runs |
|---|---|---|---|
| Quick eval | each model against its own labels: "done?", the next command, the args | 3 rows per goal and form (`--per-pair`) | `yarn agent:eval` |
| End-to-end benchmark | the whole loop, request by request | every request | `yarn agent:eval --name <name> --e2e` |

The quick eval feeds every row the right context, so a miss belongs to one model.
The end-to-end benchmark does not.

**The end-to-end benchmark runs the panel's own loop.** `apps/admin-panel/run-agent.ts` asks "done?",
picks the next command, fills its params, and runs it through the real `executeCommand`,
until it stops. The benchmark gives it each request's start state and query, and nothing
else: no correct context. A wrong turn feeds the next one, as it would
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
| `refused` | the filler refused a clear request |
| `turn limit` | never said done |

**Eval splits, hardest last.**

| Split | Wording | Names |
|---|---|---|
| `eval` | the training patterns | new Faker names, another seed |
| `unseen` | patterns training never saw | new Faker names, another seed |

A hand-written split of real queries is planned. It is the only real-world measure.

**Speed and memory are measured in the deployment runtime.** The encoder runs in
`onnxruntime-node`: DirectML on GPU, CPU otherwise, one pass per adapter call. The filler runs in
`node-llama-cpp` with its output locked to the tool's schema. Each report gives p50, p95 and max
latency per stop pass, per choose pass, per fill and per whole request, plus model load time,
peak process RAM and GPU memory used. The CPU run scores an even sample of `CPU_LIMIT` requests
per split.

## Gotchas

- `onnxruntime-node` has no LoRA adapter API, so the encoder takes every adapter's A and B as
  plain inputs, named `A:<layer>` and `B:<layer>`.
- The prompts live twice: `rows.py` for training and `apps/admin-panel/run-agent/prompts.ts`
  for the panel. A difference between them costs accuracy without any error.
- The label order lives in each adapter's `adapter.json`; Node reads it from there.
- ModernBERT is loaded with `reference_compile=False`, from when the image had no C compiler.
