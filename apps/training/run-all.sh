#!/usr/bin/env bash
# Trains and exports each version in turn. Finished steps are skipped, so a rerun resumes.
# train.sh calls this after generating data; eval.sh scores the result.
set -euo pipefail
export MSYS_NO_PATHCONV=1

ROOT="$(cd "$(dirname "$0")/../.." && pwd -W 2>/dev/null || pwd)"
IMAGE=poe-training
VERSIONS=("${@:-count-50}")
STARTED=$(date +%s)

elapsed() { local s=$(( $(date +%s) - $1 )); printf "%dm %02ds" $((s / 60)) $((s % 60)); }

stage() { echo; echo "── $1 ── ($(elapsed "$STARTED") since start)"; }

step() {
  podman run --rm --device nvidia.com/gpu=all --shm-size=2g -e FILL_QLORA="${FILL_QLORA:-0}" -e FILL_LORA_DROPOUT="${FILL_LORA_DROPOUT:-0.05}" \
    -v "$ROOT/.s3/training:/data" -v hf-cache:/cache \
    "$IMAGE" python "$@" 2> >(grep -v -E "Warning|warn\(|FutureWarning|^\s*$" >&2)
}

stage "building the training image (fast when cached)"
podman build -q -t "$IMAGE" -f "$ROOT/apps/training/Containerfile" "$ROOT/apps/training" >/dev/null
podman volume exists hf-cache || podman volume create hf-cache >/dev/null

for version in ${VERSIONS[@]}; do
  out="$ROOT/.s3/training/$version/output"
  if [ -f "$out/decide/adapter_config.json" ]; then stage "$version 1/3: decision model already trained, skipped"
  else stage "$version 1/3: training the decision model (usually 10-15 min)"; step train_decide.py "$version"; fi
  if [ -f "$out/fill/adapter_config.json" ]; then stage "$version 2/3: filler already trained, skipped"
  else stage "$version 2/3: training the filler (usually 10-15 min)"; step train_fill.py "$version"; fi
  if [ -f "$out/runtime/fill-q8_0.gguf" ]; then stage "$version 3/3: models already exported, skipped"
  else stage "$version 3/3: exporting both models for the panel (about 2 min)"; step export.py "$version"; fi
  stage "$version done"
done
