#!/usr/bin/env bash
# Trains and exports each version in turn. Finished steps are skipped, so a rerun resumes.
# train.sh calls this after generating data; eval.sh scores the result.
set -euo pipefail
export MSYS_NO_PATHCONV=1

ROOT="$(cd "$(dirname "$0")/../.." && pwd -W 2>/dev/null || pwd)"
IMAGE=poe-training
VERSIONS=("${@:-count-50}")

podman build -t "$IMAGE" -f "$ROOT/apps/training/Containerfile" "$ROOT/apps/training"
podman volume exists hf-cache || podman volume create hf-cache

step() {
  podman run --rm --device nvidia.com/gpu=all --shm-size=2g \
    -v "$ROOT/.s3/training:/data" -v hf-cache:/cache \
    "$IMAGE" python "$@"
}

for version in ${VERSIONS[@]}; do
  out="$ROOT/.s3/training/$version/output"
  echo "=== $version $(date -Is)"
  [ -f "$out/decide/adapter_config.json" ] || step train_decide.py "$version"
  [ -f "$out/fill/adapter_config.json" ] || step train_fill.py "$version"
  [ -f "$out/runtime/fill-q8_0.gguf" ] || step export.py "$version"
  echo "=== $version done $(date -Is)"
done
