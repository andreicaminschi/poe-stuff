#!/usr/bin/env bash
# Trains, exports and benchmarks each version in turn. Finished steps are skipped, so a rerun resumes.
set -euo pipefail
export MSYS_NO_PATHCONV=1

ROOT="$(cd "$(dirname "$0")/../.." && pwd -W 2>/dev/null || pwd)"
IMAGE=poe-training
VERSIONS=("${@:-count-50 count-100 count-200}")
CPU_LIMIT=200

podman build -t "$IMAGE" -f "$ROOT/apps/training/Containerfile" "$ROOT/apps/training"
podman volume exists hf-cache || podman volume create hf-cache

step() {
  podman run --rm --device nvidia.com/gpu=all --shm-size=2g \
    -v "$ROOT/.s3/training:/data" -v hf-cache:/cache \
    "$IMAGE" python "$@"
}

benchmark() {
  local version=$1 split=$2 device=$3 limit=$4
  [ -f "$ROOT/.s3/training/$version/output/benchmark-$split-$device-decide-fp32.json" ] && return
  (cd "$ROOT" && node apps/admin-panel/benchmark-agent-cli.ts --version="$version" --splits="$split" --device="$device" --limit="$limit")
}

for version in ${VERSIONS[@]}; do
  out="$ROOT/.s3/training/$version/output"
  echo "=== $version $(date -Is)"
  [ -f "$out/decide/adapter_config.json" ] || step train_decide.py "$version"
  [ -f "$out/fill/adapter_config.json" ] || step train_fill.py "$version"
  [ -f "$out/runtime/fill-q8_0.gguf" ] || step export.py "$version"
  for split in eval unseen; do
    benchmark "$version" "$split" gpu 100000
    benchmark "$version" "$split" cpu "$CPU_LIMIT"
  done
  echo "=== $version done $(date -Is)"
done
