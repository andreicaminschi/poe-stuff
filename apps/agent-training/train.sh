#!/usr/bin/env bash
# Trains the Router and Judge (ettin) and the Filler (Qwen3-0.6B + Unsloth LoRA) in the
# poe-training Podman image, on row sets under .s3/agent-training/.
# Usage: bash apps/agent-training/train.sh <run> <train set> <val set> [<eval set> ...]
#   e.g. bash apps/agent-training/train.sh run-1 train-1 val-1/seen eval-1/seen eval-1/held-out
# Env passes through: ENCODER_BASE, LR, EPOCHS, BATCH, MAX_LEN, FILLER_BASE, FILLER_EPOCHS,
# FILLER_LR, FILLER_RANK, FILLER_BATCH, ONLY (router|judge|filler to train one model).
set -euo pipefail

[ $# -ge 3 ] || { echo "Usage: bash apps/agent-training/train.sh <run> <train set> <val set> [<eval set> ...]" >&2; exit 2; }
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
# Git Bash rewrites /container/paths into Windows paths; Podman wants F:/… for host folders.
export MSYS_NO_PATHCONV=1
command -v cygpath >/dev/null && ROOT="$(cygpath -m "$ROOT")"
IMAGE="${IMAGE:-localhost/poe-training}"
RUN="$1"
shift

podman volume exists hf-cache || podman volume create hf-cache >/dev/null

step() {
  podman run --rm --device nvidia.com/gpu=all --shm-size=2g \
    -e ENCODER_BASE -e LR -e EPOCHS -e BATCH -e MAX_LEN -e PATIENCE \
    -e FILLER_BASE -e FILLER_EPOCHS -e FILLER_LR -e FILLER_RANK -e FILLER_BATCH -e FILLER_SAMPLES -e PREDICT_ONLY \
    -e PYTHONPATH=/scripts -e PYTHONUNBUFFERED=1 \
    -v "$ROOT/.s3/agent-training:/data" -v "$ROOT/apps/agent-training/train:/scripts" -v hf-cache:/cache \
    "$IMAGE" python "/scripts/$1" "${@:2}" 2> >(grep -v -E "Warning|warn\(|FutureWarning|^\s*$" >&2)
}

case "${ONLY:-all}" in all|router) step train_classifier.py router "$RUN" "$@" ;; esac
case "${ONLY:-all}" in all|judge) step train_classifier.py judge "$RUN" "$@" ;; esac
case "${ONLY:-all}" in all|filler) step train_filler.py "$RUN" "$@" ;; esac
