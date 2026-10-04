#!/usr/bin/env bash
# Trains and exports each version in turn. Finished steps are skipped, so a rerun resumes.
# train.sh calls this after generating data; eval.sh scores the result.
set -euo pipefail
export MSYS_NO_PATHCONV=1

ROOT="$(cd "$(dirname "$0")/../.." && pwd -W 2>/dev/null || pwd)"
IMAGE=poe-training
VERSIONS=("${@:-count-50}")
ADAPTERS=(stop choose entry intent)
STARTED=$(date +%s)

elapsed() { local s=$(( $(date +%s) - $1 )); printf "%dm %02ds" $((s / 60)) $((s % 60)); }

stage() { echo; echo "── $1 ── ($(elapsed "$STARTED") since start)"; }

step() {
  podman run --rm --device nvidia.com/gpu=all --shm-size=2g \
    -e FILL_LORA_DROPOUT="${FILL_LORA_DROPOUT:-0}" \
    -e DECIDE_BASE="${DECIDE_BASE:-answerdotai/ModernBERT-base}" -e FILL_BASE="${FILL_BASE:-Qwen/Qwen2.5-0.5B-Instruct}" \
    -e ENCODER_PRECISION="${ENCODER_PRECISION:-fp32}" -e FILL_QUANT="${FILL_QUANT:-q8_0}" \
    -v "$ROOT/.s3/training:/data" -v hf-cache:/cache \
    "$IMAGE" python "$@" 2> >(grep -v -E "Warning|warn\(|FutureWarning|^\s*$" >&2)
}

stage "building the training image (fast when cached)"
podman build -q -t "$IMAGE" -f "$ROOT/apps/training/Containerfile" "$ROOT/apps/training" >/dev/null
podman volume exists hf-cache || podman volume create hf-cache >/dev/null

TOTAL=$(( ${#ADAPTERS[@]} + 2 ))
for version in ${VERSIONS[@]}; do
  out="$ROOT/.s3/training/$version/output"
  at=0
  for adapter in "${ADAPTERS[@]}"; do
    at=$((at + 1))
    if [ -f "$out/$adapter/adapter.safetensors" ]; then stage "$version $at/$TOTAL: $adapter adapter already trained, skipped"
    else stage "$version $at/$TOTAL: training the $adapter adapter"; step train_encoder.py "$version" "$adapter"; fi
  done
  at=$((at + 1))
  if [ -f "$out/fill/adapter_config.json" ]; then stage "$version $at/$TOTAL: filler already trained, skipped"
  else stage "$version $at/$TOTAL: training the filler"; step train_fill.py "$version"; fi
  at=$((at + 1))
  if [ -f "$out/runtime/fill.gguf" ]; then stage "$version $at/$TOTAL: models already exported, skipped"
  else stage "$version $at/$TOTAL: exporting the models for the panel"; step export.py "$version"; fi
  stage "$version done"
done
