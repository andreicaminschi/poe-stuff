#!/usr/bin/env bash
# Generates one named version's data, then trains and exports every model from scratch.
# Usage: bash apps/training/train.sh --name <name> [--count <n>] [options]   (count defaults to 50)
#   --dropout sets the filler's LoRA dropout (default 0, Unsloth's fast kernels)
#   --decide-model / --fill-model pick the Hugging Face base models
#   --encoder-precision fp32|fp16 (default fp32), --fill-quant q8_0|q4_k_m (default q8_0)
set -euo pipefail

COUNT=50
NAME=""
USAGE="Use --name <name> [--count <n>] [--dropout <d>] [--decide-model <hf id>] [--fill-model <hf id>] [--encoder-precision fp32|fp16] [--fill-quant q8_0|q4_k_m]."
while [ $# -gt 0 ]; do
  case "$1" in
    --count=*) COUNT="${1#*=}" ;;
    --count) COUNT="$2"; shift ;;
    --name=*) NAME="${1#*=}" ;;
    --name) NAME="$2"; shift ;;
    --dropout=*) export FILL_LORA_DROPOUT="${1#*=}" ;;
    --dropout) export FILL_LORA_DROPOUT="$2"; shift ;;
    --decide-model=*) export DECIDE_BASE="${1#*=}" ;;
    --decide-model) export DECIDE_BASE="$2"; shift ;;
    --fill-model=*) export FILL_BASE="${1#*=}" ;;
    --fill-model) export FILL_BASE="$2"; shift ;;
    --encoder-precision=*) export ENCODER_PRECISION="${1#*=}" ;;
    --encoder-precision) export ENCODER_PRECISION="$2"; shift ;;
    --fill-quant=*) export FILL_QUANT="${1#*=}" ;;
    --fill-quant) export FILL_QUANT="$2"; shift ;;
    *) echo "Unknown option $1. $USAGE" >&2; exit 2 ;;
  esac
  shift
done
[ -n "$NAME" ] || { echo "Pass --name, e.g. --name count-50." >&2; exit 2; }
case "${ENCODER_PRECISION:-fp32}" in fp32|fp16) ;; *) echo "--encoder-precision must be fp32 or fp16." >&2; exit 2 ;; esac
case "${FILL_QUANT:-q8_0}" in q8_0|q4_k_m) ;; *) echo "--fill-quant must be q8_0 or q4_k_m." >&2; exit 2 ;; esac

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"

STARTED=$(date +%s)
echo "Training $NAME: $COUNT examples per goal and form."
echo
echo "── generating data ──"
node apps/admin-panel/generate-training-cli.ts --version="$NAME" --count="$COUNT"
node apps/admin-panel/generate-training-cli.ts --version="$NAME" --count="$COUNT" --unseen-only

rm -rf ".s3/training/$NAME/output"
bash apps/training/run-all.sh "$NAME"

TOOK=$(( $(date +%s) - STARTED ))
echo
echo "$NAME trained in $((TOOK / 60))m $((TOOK % 60))s. Evaluate with: yarn agent:eval --name $NAME"
