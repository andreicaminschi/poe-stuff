#!/usr/bin/env bash
# Exports one run's Router, Judge and Filler for Node (ONNX and GGUF) in the poe-training Podman
# image, into .s3/agent-training/runs/<run>/export/, and checks the ONNX files against Podman.
# Usage: bash apps/agent-training/export.sh <run> <val set>
#   e.g. bash apps/agent-training/export.sh run-5 val-5/seen
set -euo pipefail

[ $# -eq 2 ] || { echo "Usage: bash apps/agent-training/export.sh <run> <val set>" >&2; exit 2; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Git Bash rewrites /container/paths into Windows paths; Podman wants F:/… for host folders.
export MSYS_NO_PATHCONV=1
command -v cygpath >/dev/null && ROOT="$(cygpath -m "$ROOT")"
IMAGE="${IMAGE:-localhost/poe-training}"

podman volume exists hf-cache || podman volume create hf-cache >/dev/null

podman run --rm --device nvidia.com/gpu=all --shm-size=2g \
  -e PYTHONPATH=/scripts -e PYTHONUNBUFFERED=1 \
  -v "$ROOT/.s3/agent-training:/data" -v "$ROOT/apps/agent-training/train:/scripts" -v hf-cache:/cache \
  "$IMAGE" python /scripts/export.py "$@" 2> >(grep -v -E "Warning|warn\(|FutureWarning|^\s*$" >&2)
